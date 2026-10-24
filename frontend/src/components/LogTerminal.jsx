import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Pause, Terminal } from 'lucide-react';

const SERVICE_STYLES = {
  gateway: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  orders: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
  'payments-db': 'border-orange-500/30 bg-orange-500/10 text-orange-300',
};

const ROW_STYLES = {
  ERROR: 'border-l-rose-500 bg-rose-600/15 text-rose-100 hover:bg-rose-600/25',
  WARN: 'border-l-amber-400 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15',
  INFO: 'border-l-transparent text-slate-300 hover:bg-white/[0.03]',
};

const LEVEL_STYLES = {
  ERROR: 'text-rose-400 font-bold',
  WARN: 'text-amber-300 font-semibold',
  INFO: 'text-emerald-400/80',
};

function latencyClass(ms) {
  if (ms == null) return 'text-slate-600';
  if (ms >= 2000) return 'text-rose-400';
  if (ms >= 500) return 'text-amber-300';
  return 'text-slate-500';
}

/**
 * Live log viewer. Auto-scrolls to the newest line unless the user scrolls up.
 *
 * @param {{ logs: object[], highlightedLine: number|null, isStreaming: boolean }} props
 */
export default function LogTerminal({ logs, highlightedLine = null, isStreaming = false }) {
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Follow the newest line
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs, autoScroll]);

  // Jump to an evidence line when asked
  useEffect(() => {
    if (highlightedLine == null || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-line="${highlightedLine}"]`);
    if (el) {
      setAutoScroll(false);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedLine]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    setAutoScroll(atBottom);
  };

  const jumpToLatest = () => {
    setAutoScroll(true);
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  };

  return (
    <section className="panel flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between border-b border-ink-700 bg-ink-850 px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-rose-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Terminal className="h-3.5 w-3.5" />
            live-logs — gateway · orders · payments-db
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!autoScroll && logs.length > 0 && (
            <button
              type="button"
              onClick={jumpToLatest}
              className="inline-flex items-center gap-1 rounded-md border border-ink-600 bg-ink-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-ink-700"
            >
              <ArrowDownToLine className="h-3 w-3" />
              Jump to latest
            </button>
          )}
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500">
            {autoScroll ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> auto-scroll
              </>
            ) : (
              <>
                <Pause className="h-3 w-3" /> paused
              </>
            )}
          </span>
        </div>
      </div>

      {/* Column header */}
      <div className="hidden grid-cols-[72px_76px_104px_64px_56px_1fr_76px] gap-3 border-b border-ink-700 bg-ink-900 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500 md:grid">
        <span>line</span>
        <span>time</span>
        <span>service</span>
        <span>release</span>
        <span>level</span>
        <span>message</span>
        <span className="text-right">latency</span>
      </div>

      {/* Rows */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="terminal-scroll min-h-[360px] flex-1 overflow-y-auto bg-ink-950 font-mono text-[12.5px] leading-relaxed"
      >
        {logs.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-2 text-slate-600">
            <Terminal className="h-8 w-8" />
            <p className="text-sm">
              {isStreaming ? 'Waiting for the first log line…' : 'Pick a scenario and press Start Live Stream.'}
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const level = log.level in ROW_STYLES ? log.level : 'INFO';
            const isHighlighted = highlightedLine === log.line_number;
            return (
              <div
                key={log.line_number}
                data-line={log.line_number}
                className={`grid grid-cols-[64px_1fr] gap-x-3 border-l-[3px] px-4 py-[3px] md:grid-cols-[72px_76px_104px_64px_56px_1fr_76px] md:gap-3 ${ROW_STYLES[level]} ${
                  isHighlighted ? 'animate-flash outline outline-1 outline-yellow-400/70' : ''
                }`}
              >
                <span className="text-slate-500">#{log.line_number}</span>
                <span className="text-slate-500 md:order-none">{log.timestamp}</span>
                <span className="hidden md:block">
                  <span
                    className={`inline-block rounded border px-1.5 text-[11px] ${
                      SERVICE_STYLES[log.service] ?? 'border-ink-600 bg-ink-800 text-slate-300'
                    }`}
                  >
                    {log.service}
                  </span>
                </span>
                <span className="hidden text-[11px] text-sky-300/70 md:block">{log.release}</span>
                <span className={`hidden md:block ${LEVEL_STYLES[level]}`}>{log.level}</span>
                <span className="col-span-2 break-words md:col-span-1">
                  <span className="md:hidden">
                    <span className={LEVEL_STYLES[level]}>{log.level}</span>{' '}
                    <span className="text-slate-400">[{log.service}]</span>{' '}
                  </span>
                  {log.message}
                </span>
                <span className={`hidden text-right tabular-nums md:block ${latencyClass(log.latency_ms)}`}>
                  {log.latency_ms != null ? `${log.latency_ms}ms` : '—'}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
