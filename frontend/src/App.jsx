import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import ScenarioControls from './components/ScenarioControls.jsx';
import LogTerminal from './components/LogTerminal.jsx';
import AnswerKeyModal from './components/AnswerKeyModal.jsx';
import { fetchHealth, getLogStreamUrl, startMockStream } from './services/api.js';

// Keep the browser fast on long runs; counters still count every line.
const MAX_LINES_IN_VIEW = 3000;

export default function App() {
  const [scenario, setScenario] = useState('bad_release');
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, errors: 0, warns: 0, release: null });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [backendOnline, setBackendOnline] = useState(null);
  const [answerKeyOpen, setAnswerKeyOpen] = useState(false);
  const [highlightedLine, setHighlightedLine] = useState(null);

  const wsRef = useRef(null);
  const stopMockRef = useRef(null);
  const userStoppedRef = useRef(false);

  const isStreaming = connectionStatus === 'connected' || connectionStatus === 'connecting' || connectionStatus === 'mock';

  // Health check on load
  useEffect(() => {
    fetchHealth().then(({ online }) => setBackendOnline(online));
  }, []);

  const handleLogEntry = useCallback((entry) => {
    if (!entry || typeof entry.line_number !== 'number') return;
    setLogs((prev) => {
      const next = prev.length >= MAX_LINES_IN_VIEW ? prev.slice(prev.length - MAX_LINES_IN_VIEW + 1) : prev.slice();
      next.push(entry);
      return next;
    });
    setStats((s) => ({
      total: s.total + 1,
      errors: s.errors + (entry.level === 'ERROR' ? 1 : 0),
      warns: s.warns + (entry.level === 'WARN' ? 1 : 0),
      release: entry.release ?? s.release,
    }));
  }, []);

  const closeStreams = useCallback(() => {
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000, 'client stop');
    }
    if (stopMockRef.current) {
      stopMockRef.current();
      stopMockRef.current = null;
    }
  }, []);

  const startMock = useCallback(() => {
    closeStreams();
    stopMockRef.current = startMockStream(scenario, handleLogEntry);
    setConnectionStatus('mock');
  }, [scenario, handleLogEntry, closeStreams]);

  const handleStart = useCallback(async () => {
    closeStreams();
    userStoppedRef.current = false;
    setConnectionStatus('connecting');

    const { online } = await fetchHealth();
    setBackendOnline(online);
    if (!online) {
      startMock();
      return;
    }

    let opened = false;
    const ws = new WebSocket(getLogStreamUrl(scenario));
    wsRef.current = ws;

    ws.onopen = () => {
      opened = true;
      setConnectionStatus('connected');
    };
    ws.onmessage = (event) => {
      try {
        handleLogEntry(JSON.parse(event.data));
      } catch (err) {
        console.warn('Skipping malformed log message', err, event.data);
      }
    };
    ws.onerror = () => {
      if (!opened) {
        // Backend answered /health but the socket failed — fall back so the demo keeps running
        console.warn('WebSocket failed to open; switching to mock stream');
        startMock();
      } else {
        setConnectionStatus('error');
      }
    };
    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      wsRef.current = null;
      setConnectionStatus(userStoppedRef.current ? 'disconnected' : opened ? 'disconnected' : 'error');
    };
  }, [scenario, handleLogEntry, closeStreams, startMock]);

  const handleStop = useCallback(() => {
    userStoppedRef.current = true;
    closeStreams();
    setConnectionStatus('disconnected');
  }, [closeStreams]);

  const handleClear = useCallback(() => {
    setLogs([]);
    setStats({ total: 0, errors: 0, warns: 0, release: null });
    setHighlightedLine(null);
  }, []);

  const handleScenarioChange = useCallback(
    (next) => {
      setScenario(next);
      handleClear();
    },
    [handleClear],
  );

  const handleJumpToLine = useCallback((line) => {
    // Reset first so clicking the same pill twice re-triggers the jump
    setHighlightedLine(null);
    requestAnimationFrame(() => setHighlightedLine(line));
  }, []);

  // Clean up sockets/timers on unmount
  useEffect(() => closeStreams, [closeStreams]);

  const availableLines = useMemo(() => new Set(logs.map((l) => l.line_number)), [logs]);
  const errorRate = stats.total ? (stats.errors / stats.total) * 100 : 0;

  return (
    <div className="flex min-h-full flex-col">
      <Header connectionStatus={connectionStatus} backendOnline={backendOnline} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6">
        <ScenarioControls
          scenario={scenario}
          onScenarioChange={handleScenarioChange}
          isStreaming={isStreaming}
          onStart={handleStart}
          onStop={handleStop}
          onClear={handleClear}
          onRevealAnswerKey={() => setAnswerKeyOpen(true)}
          totalLines={stats.total}
          errorCount={stats.errors}
          warnCount={stats.warns}
          errorRate={errorRate}
          activeRelease={stats.release}
        />

        <div className="flex h-[calc(100vh-290px)] min-h-[420px] flex-col">
          <LogTerminal logs={logs} highlightedLine={highlightedLine} isStreaming={isStreaming} />
        </div>

        <footer className="pb-2 text-center text-[11px] text-slate-600">
          Incident Lab · Week 1 · streaming from <span className="font-mono">/ws/logs?scenario={scenario}</span>
        </footer>
      </main>

      <AnswerKeyModal
        open={answerKeyOpen}
        onClose={() => setAnswerKeyOpen(false)}
        scenario={scenario}
        onJumpToLine={handleJumpToLine}
        availableLines={availableLines}
      />
    </div>
  );
}
