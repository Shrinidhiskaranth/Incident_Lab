import asyncio
from fastapi.testclient import TestClient
from main import app
from simulator import IncidentSimulator

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "week": 1}

def test_simulator_generates_fault_and_answer_key():
    sim = IncidentSimulator(scenario="bad_release", total_lines=35)

    async def collect():
        lines = []
        async for entry in sim.stream_logs(delay_seconds=0):
            lines.append(entry)
        return lines

    logs = asyncio.run(collect())
    assert len(logs) == 35
    error_logs = [l for l in logs if l.level == "ERROR" and l.service == "payments-db"]
    assert len(error_logs) > 0

    answer_key_resp = client.get("/api/answer-key")
    assert answer_key_resp.status_code == 200
    data = answer_key_resp.json()
    assert data["fault_type"] == "bad_release"
    assert data["root_service"] == "payments-db"
    assert data["triggered_by_release"] == "v1.4.2"
    assert len(data["evidence_lines"]) > 0