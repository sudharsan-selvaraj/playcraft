import React from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Play } from 'lucide-react';
import { ActionIcon } from '@mantine/core';

interface CodeEditorProps {
  code: string;
  onCodeChange?: (value: string | undefined) => void;
  colorScheme: 'dark' | 'light';
  onPlayClick?: () => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onCodeChange,
  colorScheme,
  onPlayClick,
}) => {
  return (
    <div
      style={{
        minHeight: '50%',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'end',
        }}
      >
        <ActionIcon
          variant="transparent"
          size={20}
          style={{ color: '#44BA4A' }}
          onClick={onPlayClick}
        >
          <Play fill="currentColor" />
        </ActionIcon>
      </div>
      <div
        style={{
          border: `1px solid ${colorScheme === 'dark' ? '#222' : '#ddd'}`,
          width: '100%',
          height: '100%',
        }}
      >
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={onCodeChange}
          theme={colorScheme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'Fira Mono, monospace',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineDecorationsWidth: 5,
            lineHeight: 20,
            wordWrap: 'on',
            lineNumbersMinChars: 2,
          }}
        />
      </div>
    </div>
  );
};
