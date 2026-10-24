from pydantic import BaseModel
from typing import Literal, Optional, List

class LogEntry(BaseModel):
    line_number: int
    timestamp: str
    service: Literal["gateway", "orders", "payments-db"]
    level: Literal["INFO", "WARN", "ERROR"]
    message: str
    release: str = "v1.4.1"
    latency_ms: int

class AnswerKey(BaseModel):
    scenario_id: str
    fault_type: Literal["error_burst", "slow_responses", "bad_release"]
    root_service: Literal["gateway", "orders", "payments-db"]
    fault_start_time: str
    fault_start_line: int
    triggered_by_release: Optional[str] = None
    expected_root_cause: str
    evidence_lines: List[int]