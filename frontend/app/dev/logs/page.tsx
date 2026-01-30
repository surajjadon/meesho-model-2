"use client";

import { useEffect, useState, useMemo } from "react";

type LogEntry = {
  level?: string;
  message?: any;
  timestamp?: string;
  [key: string]: any;
};

export default function DevLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const loadLogs = async () => {
    try {
      const res = await fetch("http://localhost:24555/dev/logs");
      const data = await res.json();
      const rawText: string = data.logs || "";

      const parsed: LogEntry[] = rawText
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { level: "raw", message: line, timestamp: new Date().toISOString() };
          }
        });

      setLogs(parsed.reverse());
    } catch (err) {
      setError("❌ Backend unreachable.");
    }
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Helper to format the message
  const renderMessage = (msg: any, index: number) => {
    if (typeof msg === "object" && msg !== null) {
      const isExpanded = expandedIndex === index;
      const jsonStr = JSON.stringify(msg, null, 2);
      
      return (
        <div>
          <button 
            onClick={() => setExpandedIndex(isExpanded ? null : index)}
            style={styles.expandBtn}
          >
            {isExpanded ? "▼ Hide Data Object" : "▶ Show Data Object ({...})"}
          </button>
          {isExpanded && <pre style={styles.jsonBox}>{jsonStr}</pre>}
        </div>
      );
    }
    
    // Handle the weird Winston "Insufficient stock" character array
    if (typeof msg === "string" && msg.startsWith('{"0":"I"')) {
        try {
            const parsed = JSON.parse(msg);
            return Object.values(parsed).join("");
        } catch { return msg; }
    }

    return msg;
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🖥️ System Console <span style={styles.badge}>{logs.length}</span></h1>
        <button onClick={loadLogs} style={styles.button}>Refresh</button>
      </div>

      <div style={styles.container}>
        {logs.map((log, i) => (
          <div key={i} style={{ 
            ...styles.logRow, 
            backgroundColor: log.level === 'error' ? '#2d0a0a' : 'transparent' 
          }}>
            <div style={styles.meta}>
              <span style={styles.time}>{log.timestamp?.split('T')[1]?.split('.')[0] || log.timestamp}</span>
              <span style={{ ...styles.level, color: getLevelColor(log.level) }}>
                {log.level}
              </span>
            </div>
            <div style={styles.content}>
              {renderMessage(log.message, i)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const getLevelColor = (l?: string) => {
  if (l === 'error') return '#ff4d4d';
  if (l === 'warn') return '#ffcc00';
  return '#4ade80';
};

const styles: Record<string, React.CSSProperties> = {
  page: { background: "#020617", color: "#f1f5f9", minHeight: "100vh", padding: "20px", fontFamily: "monospace" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  title: { fontSize: "1.2rem", margin: 0 },
  badge: { fontSize: "0.8rem", background: "#1e293b", padding: "2px 8px", borderRadius: "10px", color: "#94a3b8" },
  button: { background: "#2563eb", color: "white", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" },
  container: { border: "1px solid #1e293b", borderRadius: "8px", overflow: "hidden" },
  logRow: { display: "flex", padding: "8px 12px", borderBottom: "1px solid #0f172a", gap: "20px" },
  meta: { display: "flex", flexDirection: "column", minWidth: "120px" },
  time: { fontSize: "0.75rem", color: "#64748b" },
  level: { fontSize: "0.7rem", fontWeight: "bold", textTransform: "uppercase" },
  content: { flex: 1, fontSize: "0.85rem", overflowX: "auto" },
  expandBtn: { background: "transparent", border: "1px solid #334155", color: "#38bdf8", fontSize: "0.75rem", cursor: "pointer", padding: "2px 6px", borderRadius: "4px" },
  jsonBox: { background: "#0f172a", padding: "10px", borderRadius: "4px", marginTop: "8px", border: "1px solid #1e293b", fontSize: "0.75rem", color: "#cbd5e1" }
};