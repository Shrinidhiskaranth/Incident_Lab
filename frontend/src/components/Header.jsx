import { Activity, FlaskConical, Server } from 'lucide-react';

const STATUS_STYLES = {
  connected: {
    label: 'Live',
    dot: 'bg-emerald-400',
    ping: 'bg-emerald-400',
    text: 'text-emerald-300',
    ring: 'border-emerald-500/30 bg-emerald-500/10',
  },
  connecting: {
    label: 'Connecting…',
    dot: 'bg-amber-400',
    ping: 'bg-amber-400',
    text: 'text-amber-300',
    ring: 'border-amber-500/30 bg-amber-500/10',
  },
  mock: {
    label: 'Live (mock)',
    dot: 'bg-sky-400',
    ping: 'bg-sky-400',
    text: 'text-sky-300',
    ring: 'border-sky-500/30 bg-sky-500/10',
  },
  error: {
    label: 'Connection error',
    dot: 'bg-rose-500',
    ping: null,
    text: 'text-rose-300',
    ring: 'border-rose-500/30 bg-rose-500/10',
  },
  disconnected: {
    label: 'Disconnected',
    dot: 'bg-slate-500',
    ping: null,
    text: 'text-slate-400',
    ring: 'border-ink-600 bg-ink-800',
  },
};

/**
 * Top bar: product name, WebSocket status and the Week 1 badge.
 *
 * @param {{ connectionStatus: 'connected'|'connecting'|'mock'|'error'|'disconnected',
 *           backendOnline: boolean|null }} props
 */
export default function Header({ connectionStatus = 'disconnected', backendOnline = null }) {
  const s = STATUS_STYLES[connectionStatus] ?? STATUS_STYLES.disconnected;

  return (
    <header className="sticky top-0 z-30 border-b border-ink-700 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10">
            <Activity className="h-5 w-5 text-rose-400" strokeWidth={2.4} />
          </div>
          <div className="leading-tight">
            <h1 className="text-lg font-semibold tracking-tight text-white">Incident Lab</h1>
            <p className="hidden text-xs text-slate-500 sm:block">
              Break a system on purpose, then measure how well AI finds what went wrong
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
            <FlaskConical className="h-3.5 w-3.5" />
            Week 1: Live Simulator &amp; Ground Truth
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              backendOnline === null
                ? 'border-ink-600 bg-ink-800 text-slate-400'
                : backendOnline
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-sky-500/30 bg-sky-500/10 text-sky-300'
            }`}
            title="Result of GET /api/health"
          >
            <Server className="h-3.5 w-3.5" />
            {backendOnline === null ? 'Checking API…' : backendOnline ? 'API online' : 'Mock mode'}
          </span>

          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${s.ring} ${s.text}`}
            role="status"
            aria-live="polite"
          >
            <span className="relative flex h-2.5 w-2.5">
              {s.ping && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${s.ping}`} />
              )}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${s.dot}`} />
            </span>
            WebSocket: {s.label}
          </span>
        </div>
      </div>
    </header>
  );
}
