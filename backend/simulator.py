import asyncio
import json
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator

from schemas import LogEntry, AnswerKey
from scenarios import SCENARIO_DEFINITIONS, NORMAL_MESSAGES

SERVICES = ["gateway", "orders", "payments-db"]

class IncidentSimulator:
    def __init__(self, scenario: str = "bad_release", total_lines: int = 90):
        self.scenario = scenario if scenario in SCENARIO_DEFINITIONS else "bad_release"
        self.config = SCENARIO_DEFINITIONS[self.scenario]
        self.total_lines = total_lines
        self.line_number = 2000
        self.fault_injected = False
        self.replays_dir = Path(__file__).parent / "replays"
        self.replays_dir.mkdir(exist_ok=True)

    async def stream_logs(self, delay_seconds: float = 0.22) -> AsyncGenerator[LogEntry, None]:
        evidence_lines = []
        raw_log_history = []
        fault_start_time = None
        fault_start_line = None

        for step in range(1, self.total_lines + 1):
            self.line_number += 1
            now = datetime.now(timezone.utc).strftime("%H:%M:%S")
            active_release = (
                "v1.4.2"
                if (self.scenario == "bad_release" and step >= 18)
                else "v1.4.1"
            )

            # Inject fault starting at step 22
            if step >= 22:
                if not self.fault_injected:
                    self.fault_injected = True
                    fault_start_time = now
                    fault_start_line = self.line_number

                roll = random.random()
                # Primary fault on root service
                if roll < 0.55:
                    evidence_lines.append(self.line_number)
                    low_lat, high_lat = self.config["fault_latency_range"]
                    entry = LogEntry(
                        line_number=self.line_number,
                        timestamp=now,
                        service=self.config["root_service"],
                        level="ERROR",
                        message=self.config["error_message"],
                        release=active_release,
                        latency_ms=random.randint(low_lat, high_lat),
                    )
                    raw_log_history.append(entry.model_dump())
                    self._save_answer_key(fault_start_time, fault_start_line, evidence_lines, raw_log_history)
                    yield entry
                    if delay_seconds > 0:
                        await asyncio.sleep(delay_seconds)
                    continue

                # Cascading symptom on downstream/upstream service
                elif roll < 0.75:
                    entry = LogEntry(
                        line_number=self.line_number,
                        timestamp=now,
                        service=self.config["cascade_service"],
                        level="ERROR" if self.scenario == "bad_release" else "WARN",
                        message=self.config["cascade_message"],
                        release=active_release,
                        latency_ms=random.randint(1500, 3100),
                    )
                    raw_log_history.append(entry.model_dump())
                    yield entry
                    if delay_seconds > 0:
                        await asyncio.sleep(delay_seconds)
                    continue

            # Normal traffic + 6% random harmless background noise
            service = random.choice(SERVICES)
            is_noise = random.random() < 0.06
            entry = LogEntry(
                line_number=self.line_number,
                timestamp=now,
                service=service,
                level="WARN" if is_noise else "INFO",
                message=(
                    "Transient socket retry succeeded on attempt 2"
                    if is_noise
                    else random.choice(NORMAL_MESSAGES[service])
                ),
                release=active_release,
                latency_ms=random.randint(140, 320) if is_noise else random.randint(12, 85),
            )
            raw_log_history.append(entry.model_dump())
            yield entry
            if delay_seconds > 0:
                await asyncio.sleep(delay_seconds)

    def _save_answer_key(
        self,
        start_time: str,
        start_line: int,
        evidence: list[int],
        raw_logs: list[dict],
    ) -> AnswerKey:
        key = AnswerKey(
            scenario_id=f"run_{self.scenario}",
            fault_type=self.scenario,
            root_service=self.config["root_service"],
            fault_start_time=start_time,
            fault_start_line=start_line,
            triggered_by_release=self.config["triggered_by_release"],
            expected_root_cause=self.config["expected_root_cause"],
            evidence_lines=evidence[:6],
        )
        with open(self.replays_dir / "answer_key.json", "w") as f:
            json.dump(key.model_dump(), f, indent=2)

        with open(self.replays_dir / f"replay_{self.scenario}.json", "w") as f:
            json.dump({"answer_key": key.model_dump(), "logs": raw_logs}, f, indent=2)

        return key