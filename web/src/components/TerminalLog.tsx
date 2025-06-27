import React from 'react';

function TerminalLog({ logs }: { logs: React.ReactNode[] }) {
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
      {logs.map((line, idx) => (
        <div key={idx} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {line}
        </div>
      ))}
    </div>
  );
}

export default TerminalLog;
