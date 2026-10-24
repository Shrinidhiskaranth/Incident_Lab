/**
 * Incident Lab — frontend API layer (Week 1).
 *
 * Locked contract with Member 1's backend:
 *   WS   ws://localhost:8000/ws/logs?scenario={scenario}   -> LogEntry per message
 *   GET  http://localhost:8000/api/answer-key              -> AnswerKey
 *   GET  http://localhost:8000/api/health                  -> { status: "ok", week: 1 }
 *
 * If the backend is not reachable, every helper falls back to MOCK data so the
 * UI can be built and demoed on its own. The real backend always wins when up.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
export const WS_BASE_URL = (import.meta.env.VITE_WS_URL || API_BASE_URL.replace(/^http/, 'ws')).replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 3000;

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} on ${path}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Build the WebSocket URL for a scenario. */
export function getLogStreamUrl(scenario) {
  return `${WS_BASE_URL}/ws/logs?scenario=${encodeURIComponent(scenario)}`;
}

/**
 * GET /api/health
 * @returns {Promise<{ online: boolean, data: {status: string, week: number} | null }>}
 */
export async function fetchHealth() {
  try {
    const data = await getJson('/api/health');
    return { online: data?.status === 'ok', data };
  } catch {
    return { online: false, data: null };
  }
}

/**
 * GET /api/answer-key
 * Falls back to the mock answer key for `scenario` only when the backend is unreachable.
 * A real HTTP error (e.g. 404 = no run yet) is surfaced, not hidden behind mock data.
 *
 * @param {string} scenario  used only for the mock fallback
 * @returns {Promise<{ data: object, mock: boolean }>}
 */
export async function fetchAnswerKey(scenario) {
  try {
    const data = await getJson('/api/answer-key');
    return { data, mock: false };
  } catch (err) {
    if (err.status) throw err; // backend is up but returned an error
    return { data: MOCK_ANSWER_KEYS[scenario] ?? MOCK_ANSWER_KEYS.bad_release, mock: true };
  }
}

/* ------------------------------------------------------------------ */
/* Mock mode                                                           */
/* ------------------------------------------------------------------ */

export const MOCK_ANSWER_KEYS = {
  bad_release: {
    scenario_id: 'run_bad_release',
    fault_type: 'bad_release',
    root_service: 'payments-db',
    fault_start_time: '14:02:00',
    fault_start_line: 2020,
    triggered_by_release: 'v1.4.2',
    expected_root_cause: 'Connection pool exhausted in payments-db after release v1.4.2',
    evidence_lines: [2041, 2047],
  },
  error_burst: {
    scenario_id: 'run_error_burst',
    fault_type: 'error_burst',
    root_service: 'orders',
    fault_start_time: '14:02:00',
    fault_start_line: 2020,
    triggered_by_release: 'v1.4.1',
    expected_root_cause: 'Burst of unhandled exceptions in orders (NullPointer in order validation)',
    evidence_lines: [2024, 2031],
  },
  slow_responses: {
    scenario_id: 'run_slow_responses',
    fault_type: 'slow_responses',
    root_service: 'gateway',
    fault_start_time: '14:02:00',
    fault_start_line: 2020,
    triggered_by_release: 'v1.4.1',
    expected_root_cause: 'Upstream latency spike causing gateway request timeouts',
    evidence_lines: [2038, 2052],
  },
};

const SERVICES = ['gateway', 'orders', 'payments-db'];

const HEALTHY_MESSAGES = {
  gateway: ['GET /api/checkout 200', 'GET /api/cart 200', 'POST /api/orders 201', 'GET /health 200'],
  orders: ['Order created id=ord_{n}', 'Inventory reserved for ord_{n}', 'Order validated id=ord_{n}'],
  'payments-db': ['Query OK: SELECT payment_intent', 'Connection acquired (active={a}/100)', 'Transaction committed'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fmtTime(baseSeconds) {
  const h = Math.floor(baseSeconds / 3600) % 24;
  const m = Math.floor(baseSeconds / 60) % 60;
  const s = baseSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Produce one mock LogEntry for the given scenario. Mirrors the backend contract. */
function makeMockLine(scenario, lineNumber) {
  const key = MOCK_ANSWER_KEYS[scenario] ?? MOCK_ANSWER_KEYS.bad_release;
  // Lines start at 2000 at 14:01:40; ~1 line per second of "sim time"
  const timestamp = fmtTime(14 * 3600 + 60 + 40 + (lineNumber - 2000));
  const faulty = lineNumber >= key.fault_start_line;
  const release = scenario === 'bad_release' ? (faulty ? 'v1.4.2' : 'v1.4.1') : 'v1.4.1';

  let service = pick(SERVICES);
  let level = 'INFO';
  let latency = 20 + Math.floor(Math.random() * 120);
  let message = pick(HEALTHY_MESSAGES[service])
    .replace('{n}', String(10000 + lineNumber))
    .replace('{a}', String(20 + Math.floor(Math.random() * 30)));

  const isEvidence = key.evidence_lines.includes(lineNumber);

  if (faulty) {
    const roll = Math.random();
    if (scenario === 'bad_release') {
      const active = Math.min(100, 60 + (lineNumber - key.fault_start_line) * 2);
      if (isEvidence || (roll < 0.35 && active >= 100)) {
        service = 'payments-db';
        level = 'ERROR';
        latency = 5000 + Math.floor(Math.random() * 40);
        message = `FATAL: Connection pool exhausted (active=100/100, wait_timeout=5000ms)`;
      } else if (roll < 0.55) {
        service = 'payments-db';
        level = 'WARN';
        latency = 800 + Math.floor(Math.random() * 1500);
        message = `Connection pool near capacity (active=${active}/100)`;
      } else if (roll < 0.7) {
        service = 'gateway';
        level = active >= 100 ? 'ERROR' : 'WARN';
        latency = 3000 + Math.floor(Math.random() * 2000);
        message = 'POST /api/checkout 503 upstream=payments-db';
      }
    } else if (scenario === 'error_burst') {
      if (isEvidence || roll < 0.4) {
        service = 'orders';
        level = 'ERROR';
        message = 'Unhandled exception: NullPointerException at OrderValidator.validate()';
      } else if (roll < 0.55) {
        service = 'gateway';
        level = 'WARN';
        message = 'POST /api/orders 500 upstream=orders';
      }
    } else if (scenario === 'slow_responses') {
      const ramp = (lineNumber - key.fault_start_line) * 90;
      latency = 400 + ramp + Math.floor(Math.random() * 300);
      if (isEvidence || (roll < 0.3 && latency > 3000)) {
        service = 'gateway';
        level = 'ERROR';
        message = `Request timeout after ${latency}ms on GET /api/checkout`;
      } else if (roll < 0.6) {
        service = pick(['gateway', 'orders']);
        level = 'WARN';
        message = `Slow response: ${latency}ms (p95 threshold 500ms)`;
      }
    }
  }

  return {
    line_number: lineNumber,
    timestamp,
    service,
    level,
    message,
    release,
    latency_ms: latency,
  };
}

/**
 * Start a fake log stream that behaves like the WebSocket.
 * @returns {() => void} stop function
 */
export function startMockStream(scenario, onMessage, { intervalMs = 180, startLine = 2000 } = {}) {
  let line = startLine;
  const timer = setInterval(() => {
    onMessage(makeMockLine(scenario, line));
    line += 1;
  }, intervalMs);
  return () => clearInterval(timer);
}
