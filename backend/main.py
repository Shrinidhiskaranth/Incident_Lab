import json
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

from simulator import IncidentSimulator
from scenarios import SCENARIO_DEFINITIONS

app = FastAPI(
    title="Incident Lab API",
    description="Week 1: Multi-service log simulator with ground-truth answer key and live WebSocket streaming",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "week": 1}

@app.get("/api/scenarios")
def list_scenarios():
    return {
        "scenarios": list(SCENARIO_DEFINITIONS.keys()),
        "default": "bad_release",
    }

@app.get("/api/answer-key")
def get_answer_key():
    key_path = Path(__file__).parent / "replays" / "answer_key.json"
    if not key_path.exists():
        # Fallback if queried before stream hits fault step
        return {
            "scenario_id": "run_bad_release",
            "fault_type": "bad_release",
            "root_service": "payments-db",
            "fault_start_time": "14:02:00",
            "fault_start_line": 2022,
            "triggered_by_release": "v1.4.2",
            "expected_root_cause": "Connection pool exhausted in payments-db after release v1.4.2 leaked DB connections",
            "evidence_lines": [2041, 2047],
        }
    return json.loads(key_path.read_text())

@app.websocket("/ws/logs")
async def websocket_log_stream(
    websocket: WebSocket,
    scenario: str = Query(default="bad_release"),
):
    await websocket.accept()
    simulator = IncidentSimulator(scenario=scenario)
    try:
        async for log_entry in simulator.stream_logs():
            await websocket.send_json(log_entry.model_dump())
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected from scenario '{scenario}'")