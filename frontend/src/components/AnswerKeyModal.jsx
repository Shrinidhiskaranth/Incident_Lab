import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock, FileSearch, Hash, KeyRound, Loader2, RefreshCw, Server, Tag, X } from 'lucide-react';
import { fetchAnswerKey } from '../services/api.js';

function Field({ icon: Icon, label, children, accent = 'text-white' }) {
  return (
    <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-slate-500" />
        <span className="stat-label">{label}</span>
      </div>
      <div className={`mt-1 font-mono text-base font-semibold ${accent}`}>{children}</div>
    </div>
  );
}

/**
 * Slide-over drawer that fetches and shows the hidden ground-truth AnswerKey.
 *
 * @param {{ open: boolean, onClose: () => void, scenario: string,
 *           onJumpToLine: (line: number) => void, availableLines: Set<number> }} props
 */
export default function AnswerKeyModal({ open, onClose, scenario, onJumpToLine, availableLines }) {
  const [state, setState] = useState({ loading: false, error: null, data: null, mock: false });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data, mock } = await fetchAnswerKey(scenario);
      setState({ loading: false, error: null, data, mock });
    } catch (err) {
      const msg =
        err.status === 404
          ? 'No answer key yet — start a scenario stream first.'
          : `Could not load the answer key (${err.message}).`;
      setState({ loading: false, error: msg, data: null, mock: false });
    }
  }, [scenario]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const { loading, error, data, mock } = state;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="answer-key-title">
      <button
        type="button"
        aria-label="Close answer key"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-ink-700 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10">
              <KeyRound className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <h2 id="answer-key-title" className="text-base font-semibold text-white">
                Ground-truth answer key
              </h2>
              <p className="text-xs text-slate-500">What the simulator actually broke</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-md p-2 text-slate-400 hover:bg-ink-800 hover:text-white disabled:opacity-40"
              title="Refetch"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-slate-400 hover:bg-ink-800 hover:text-white"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 p-5">
          {loading && !data && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching /api/answer-key…
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-ink-600 bg-ink-800 px-2 py-0.5 font-mono text-xs text-slate-300">
                  {data.scenario_id}
                </span>
                <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 font-mono text-xs text-rose-300">
                  {data.fault_type}
                </span>
                {mock && (
                  <span className="rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-xs text-sky-300">
                    mock data — backend offline
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-600/20 to-rose-900/10 p-4">
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-rose-300" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-rose-300/80">
                    Culprit service
                  </span>
                </div>
                <div className="mt-1 font-mono text-2xl font-bold text-rose-200">{data.root_service}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field icon={Clock} label="Fault start time">
                  {data.fault_start_time}
                </Field>
                <Field icon={Hash} label="Fault start line">
                  #{data.fault_start_line}
                </Field>
                <div className="col-span-2">
                  <Field icon={Tag} label="Triggered by release" accent="text-sky-300">
                    {data.triggered_by_release ?? '—'}
                  </Field>
                </div>
              </div>

              <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                <span className="stat-label">Expected root cause</span>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-100">{data.expected_root_cause}</p>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-1.5">
                  <FileSearch className="h-3.5 w-3.5 text-slate-500" />
                  <span className="stat-label">Evidence lines</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(data.evidence_lines ?? []).map((line) => {
                    const streamed = availableLines?.has(line);
                    return (
                      <button
                        key={line}
                        type="button"
                        onClick={() => {
                          onJumpToLine(line);
                          onClose();
                        }}
                        disabled={!streamed}
                        title={streamed ? `Jump to line ${line}` : 'This line has not streamed in yet'}
                        className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-3 py-1 font-mono text-xs font-semibold text-yellow-200 transition hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:border-ink-600 disabled:bg-ink-800 disabled:text-slate-500"
                      >
                        line {line}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-slate-500">Click a line to jump to it in the live terminal.</p>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
