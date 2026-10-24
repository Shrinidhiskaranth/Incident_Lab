import { AlertOctagon, Eraser, KeyRound, Play, Rows3, Square, Tag, TrendingUp } from 'lucide-react';

export const SCENARIOS = [
  {
    id: 'bad_release',
    label: 'Bad release',
    hint: 'A release leaks DB connections until payments-db is exhausted',
  },
  {
    id: 'error_burst',
    label: 'Error burst',
    hint: 'A sudden spike of errors across a service',
  },
  {
    id: 'slow_responses',
    label: 'Slow responses',
    hint: 'Latency climbs until requests start timing out',
  },
];

function Stat({ icon: Icon, label, value, accent = 'text-white', sub }) {
  return (
    <div className="min-w-[120px] flex-1 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="stat-label">{label}</span>
      </div>
      <div className={`mt-1 font-mono text-xl font-semibold tabular-nums ${accent}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

/**
 * Scenario picker, stream controls and live counters.
 */
export default function ScenarioControls({
  scenario,
  onScenarioChange,
  isStreaming,
  onStart,
  onStop,
  onClear,
  onRevealAnswerKey,
  totalLines,
  errorCount,
  warnCount,
  errorRate,
  activeRelease,
}) {
  const current = SCENARIOS.find((s) => s.id === scenario);
  const rateAccent = errorRate >= 5 ? 'text-rose-400' : errorRate >= 1 ? 'text-amber-300' : 'text-emerald-300';

  return (
    <section className="panel p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scenario" className="stat-label">
            Fault scenario
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              id="scenario"
              value={scenario}
              onChange={(e) => onScenarioChange(e.target.value)}
              disabled={isStreaming}
              className="min-w-[220px] rounded-lg border border-ink-600 bg-ink-800 px-3 py-2 font-mono text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-50"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} — {s.label}
                </option>
              ))}
            </select>

            {isStreaming ? (
              <button type="button" className="btn-danger" onClick={onStop}>
                <Square className="h-4 w-4" fill="currentColor" />
                Stop Stream
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onStart}>
                <Play className="h-4 w-4" fill="currentColor" />
                Start Live Stream
              </button>
            )}

            <button type="button" className="btn-ghost" onClick={onClear} disabled={totalLines === 0}>
              <Eraser className="h-4 w-4" />
              Clear
            </button>

            <button
              type="button"
              className="btn border border-violet-500/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
              onClick={onRevealAnswerKey}
            >
              <KeyRound className="h-4 w-4" />
              Reveal Answer Key
            </button>
          </div>
          {current && <p className="text-xs text-slate-500">{current.hint}</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Stat icon={Rows3} label="Total lines" value={totalLines.toLocaleString()} />
        <Stat
          icon={AlertOctagon}
          label="Errors"
          value={errorCount.toLocaleString()}
          accent={errorCount > 0 ? 'text-rose-400' : 'text-white'}
          sub={`${warnCount.toLocaleString()} warnings`}
        />
        <Stat icon={TrendingUp} label="Error rate" value={`${errorRate.toFixed(1)}%`} accent={rateAccent} />
        <div className="min-w-[120px] flex-1 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-slate-500" />
            <span className="stat-label">Active release</span>
          </div>
          <div className="mt-1.5">
            {activeRelease ? (
              <span className="inline-flex rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-sm font-semibold text-sky-300">
                {activeRelease}
              </span>
            ) : (
              <span className="font-mono text-xl text-slate-600">—</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
