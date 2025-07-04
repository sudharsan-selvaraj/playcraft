import React from 'react';
import AnsiToHtml from 'ansi-to-html';


export type LogEntry = {
  message: string;
  level: string;
  timestamp?: number;
};

const ansiConverter = new AnsiToHtml();

function formatLogLine(log: LogEntry) {
  let color = '#C9D1D9';
  if (log.level === 'error') color = '#ff5555';
  else if (log.level === 'warn') color = '#ffb86c';
  else if (log.level === 'info') color = '#8be9fd';
  else if (log.level === 'debug') color = '#50fa7b';
  // Convert ANSI to HTML
  const html = ansiConverter.toHtml(log.message);
  return (
    <span style={{ color, padding: '10px 0' }}>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      {/* <span style={{ color: '#555', marginLeft: 8, fontSize: 10 }}>
        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
      </span> */}
    </span>
  );
}

function TerminalLog({ logs }: { logs: LogEntry[] }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#181A1B',
        color: '#C9D1D9',
        fontFamily: 'Fira Mono, monospace',
        fontSize: 12,
        padding: '16px',
        overflowY: 'auto',
        minHeight: 120,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {logs.map((log, idx) => (
        <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {formatLogLine(log)}
        </div>
      ))}
    </div>
  );
}

export default TerminalLog;