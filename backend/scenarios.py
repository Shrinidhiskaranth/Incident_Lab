SCENARIO_DEFINITIONS = {
    "bad_release": {
        "root_service": "payments-db",
        "triggered_by_release": "v1.4.2",
        "expected_root_cause": "Connection pool exhausted in payments-db after release v1.4.2 leaked DB connections",
        "error_message": "FATAL: Connection pool exhausted (active=100/100, wait_timeout=5000ms)",
        "cascade_service": "orders",
        "cascade_message": "ERROR: Upstream timeout waiting for payments-db transaction lock",
        "fault_latency_range": (4800, 5200),
    },
    "error_burst": {
        "root_service": "gateway",
        "triggered_by_release": None,
        "expected_root_cause": "Sudden 502 Bad Gateway error spike on gateway auth token verifier",
        "error_message": "ERROR: 502 Bad Gateway - Upstream auth provider connection reset by peer",
        "cascade_service": "orders",
        "cascade_message": "WARN: Request aborted due to unverified gateway session token",
        "fault_latency_range": (850, 1400),
    },
    "slow_responses": {
        "root_service": "orders",
        "triggered_by_release": None,
        "expected_root_cause": "Severe latency degradation on orders service due to unindexed cart query lock",
        "error_message": "ERROR: Query execution exceeded SLA threshold (latency > 3200ms on orders_cart_idx)",
        "cascade_service": "gateway",
        "cascade_message": "WARN: High upstream response time detected on /api/orders/checkout",
        "fault_latency_range": (3200, 4600),
    },
}

NORMAL_MESSAGES = {
    "gateway": [
        "GET /api/checkout 200 OK",
        "POST /api/auth token validated",
        "GET /api/catalog 200 OK - cache hit",
        "Healthcheck probe succeeded",
    ],
    "orders": [
        "Order payload validated successfully",
        "Inventory reservation confirmed for SKU-884",
        "Cart state synced with session store",
        "Order #9921 dispatched to fulfillment queue",
    ],
    "payments-db": [
        "Connection acquired from pool (active=14/100)",
        "Transaction committed cleanly",
        "Ledger write verified for invoice",
        "Read replica sync lag within normal bounds (4ms)",
    ],
}