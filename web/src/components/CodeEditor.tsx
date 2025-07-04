import React, { useCallback, useEffect, useRef, useState } from 'react';
import MonacoEditor, {useMonaco} from '@monaco-editor/react';
import { Play, Square, Copy, Trash2 } from 'lucide-react';
import { Tooltip } from '@mantine/core';
import { customColors } from '../theme';
import { ModernSpinner } from './ModernSpinner';
import { useSocket } from './SocketProvider';
import { getPlaywrightTypes } from '../apiService';


interface CodeEditorProps {
  code: string;
  onCodeChange?: (value: string | undefined) => void;
  colorScheme: 'dark' | 'light';
  onPlayClick?: () => void;
  onStopClick?: () => void;
  isExecuting?: boolean;
  currentStepNumber?: number | null;
  error? : {
    error: string;
    line: number;
  } | null
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onCodeChange,
  colorScheme,
  onPlayClick,
  onStopClick,
  isExecuting,
  currentStepNumber,
  error
}) => {
  const ICON_SIZE = 16;
  const socket = useSocket();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<any>(null);
  const currentHighlightedLineRef = useRef<number | null>(null);
  const [typesLoaded, setTypesLoaded] = useState<boolean>(false);
  const [currentHighlightedLine, setCurrentHighlightedLine] = useState<number | null>(currentStepNumber ?? null);
  const monaco = useMonaco();

  // Clear code function
  const handleClearCode = () => {
    if (onCodeChange) {
      onCodeChange('');
    }
  };

  // Copy code function
  const handleCopyCode = async () => {
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        // Could add a toast notification here if needed
      } catch (err) {
        console.error('Failed to copy code:', err);
      }
    }
  };

  // Recording message listener
  useEffect(() => {
    const handleRecordingMessage = (event: MessageEvent) => {
      if (event.data.action === 'insert-code' && editorRef.current) {
        const editor = editorRef.current;
        const model = editor.getModel();
        
        if (model) {
          const position = editor.getPosition();
          const currentLine = position.lineNumber;
          const currentColumn = position.column;
          
          // Get the current line content to determine proper indentation
          const currentLineContent = model.getLineContent(currentLine);
          const indentMatch = currentLineContent.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          
          // Insert the code at cursor position with proper indentation
          const codeToInsert = `${indent}${event.data.code}\n`;
          
          const range = {
            startLineNumber: currentLine,
            startColumn: currentColumn,
            endLineNumber: currentLine,
            endColumn: currentColumn,
          };
          
          const operation = {
            range: range,
            text: codeToInsert,
            forceMoveMarkers: true,
          };
          
          editor.executeEdits('recording', [operation]);
          
          // Move cursor to end of inserted code
          const newPosition = {
            lineNumber: currentLine + 1,
            column: indent.length + 1,
          };
          editor.setPosition(newPosition);
          
          // Update the parent component with the new code
          if (onCodeChange) {
            onCodeChange(model.getValue());
          }
          
          // Don't focus the editor automatically - let the user maintain focus on the iframe
          // editor.focus();
        }
      }
    };

    window.addEventListener('message', handleRecordingMessage);
    return () => {
      window.removeEventListener('message', handleRecordingMessage);
    };
  }, [onCodeChange]);

  useEffect(()=>{
    if(monaco){
      loadPlaywrightTypes(monaco);
    }
  }, [monaco])

  // Keep ref in sync with state
  useEffect(() => {
    currentHighlightedLineRef.current = currentHighlightedLine;
  }, [currentHighlightedLine]);

  useEffect(() => {
    setCurrentHighlightedLine(currentStepNumber ?? null);
  }, [currentStepNumber]);

  // Listen for step events from socket
  useEffect(() => {
    if (!socket) return;

    const onStepStart = (data: { step: number }) => {
      setCurrentHighlightedLine(data.step);
    };

    socket.on('step-start', onStepStart);

    return () => {
      socket.off('step-start', onStepStart);
    };
  }, [socket]);

  const hideHighlight = () => {
    decorationsRef.current?.clear()
  }

  const highlightLine = (line: number | null, isError: boolean = false) => {
    if(!line || !editorRef.current || !monacoRef.current){
      return;
    }
    hideHighlight()
    decorationsRef.current = editorRef.current?.createDecorationsCollection([
      {
        range: new monacoRef.current!.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: isError ? `error-highlight-line-${colorScheme}` : `debug-highlight-line-${colorScheme}`,
        }
      }
    ]);
    editorRef.current?.revealLineInCenter(line);
  }

  useEffect(() => {
    highlightLine(currentHighlightedLine);
  }, [currentHighlightedLine, editorRef.current, monacoRef.current]);


  useEffect(() => {
    if(!isExecuting && error) {
      hideHighlight();
      highlightLine(error.line, true);
    }
    else if (!isExecuting && editorRef.current) {
      hideHighlight();
      setCurrentHighlightedLine(null);
    }
  }, [isExecuting, currentHighlightedLine]);

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    const currentLine = currentHighlightedLineRef.current;
    highlightLine(currentLine);
  }, []);

  const loadPlaywrightTypes = useCallback(async (monaco: any) => {
    try {
      // Load main Playwright types
      const types = [{
        name: "types.d.ts",
        path: "file:///node_modules/playwright-core/types/types.d.ts",
        moduleName: "playwright-core"
      }, {
        name: "test.d.ts",
        path: "file:///node_modules/playwright/types/test.d.ts",
        moduleName: "playwright"
      }]
        const typeContent = await Promise.all(types.map(t => getPlaywrightTypes(t.name)));
        typeContent.forEach((t, i)=> {
          monaco.languages.typescript.typescriptDefaults.addExtraLib(
            t,
            types[i].path
          );
        })
      
      monaco.languages.typescript.typescriptDefaults.addExtraLib(`
              declare const page: import('playwright-core').Page;
              declare const expect: import('playwright').Expect<{}>;`,
              'file:///playwright-globals.d.ts'
      );

      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ScriptTarget.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        allowJs: true,
        baseUrl: "file:///",
        paths: {
          "playwright-core": ["node_modules/playwright-core/types/types.d.ts"],
          "playwright": ["node_modules/playwright/types/test.d.ts"],
        } 
      });

      setTypesLoaded(true)

    } catch (error) {
      console.error('Failed to load Playwright types:', error);
    }
  }, []);

  // Config for controls
  const controls = [
    {
      key: 'clear',
      icon: Trash2,
      tooltip: 'Clear',
      color: '#ff6b6b',
      onClick: handleClearCode,
      disabled: !code || code.trim() === '',
      active: true,
    },
    {
      key: 'copy',
      icon: Copy,
      tooltip: 'Copy',
      color: '#4c6ef5',
      onClick: handleCopyCode,
      disabled: !code || code.trim() === '',
      active: true,
    },
    {
      key: 'separator',
      icon: null,
      tooltip: '',
      color: '',
      onClick: undefined,
      disabled: false,
      active: false,
    },
    {
      key: 'play',
      icon: Play,
      tooltip: 'Run',
      color: '#44BA4A',
      onClick: !isExecuting ? onPlayClick : undefined,
      disabled: isExecuting,
      active: !isExecuting,
    },
    {
      key: 'stop',
      icon: Square,
      tooltip: 'Stop',
      color: '#ff0000',
      onClick: isExecuting && onStopClick ? onStopClick : undefined,
      disabled: !isExecuting,
      active: isExecuting,
    },
  ];

  return (
    <div
      style={{
        height: '100%',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
      }}
    >
      {typesLoaded && (
        <>
          {/* VSCode-style control bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 8px',
              borderRadius: 6,
              boxShadow: 'none',
              margin: '8px 8px 0 0',
              minHeight: 30,
              width: 'fit-content',
              alignSelf: 'flex-end',
            }}
          >
            {controls.map(({ key, icon: Icon, tooltip, color, onClick, disabled, active }) => {
              if (key === 'separator') {
                return (
                  <div
                    key={key}
                    style={{
                      width: 1,
                      height: 20,
                      backgroundColor: customColors.border[colorScheme],
                      margin: '0 4px',
                    }}
                  />
                );
              }
              
              return (
                <Tooltip key={key} label={tooltip} position="bottom">
                  <button
                    onClick={onClick}
                    disabled={disabled}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28,
                      height: 28,
                      border: 'none',
                      outline: 'none',
                      background: 'none',
                      borderRadius: '20%',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                      color: active ? color : customColors.iconDisabled[colorScheme],
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled) {
                        (e.currentTarget as HTMLElement).style.background =
                          colorScheme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'none';
                    }}
                    aria-label={tooltip}
                    tabIndex={0}
                  >
                    {Icon && (
                      <Icon
                        size={ICON_SIZE}
                        fill={active ? color : customColors.iconDisabled[colorScheme]}
                      />
                    )}
                  </button>
                </Tooltip>
              );
            })}
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
              defaultLanguage="typescript"
              value={code}
              onChange={onCodeChange}
              theme={colorScheme === 'dark' ? 'vs-dark' : 'light'}
              onMount={(editor, monaco)=> {
                handleEditorDidMount(editor, monaco)
              }}
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
                loading={<ModernSpinner />}
              />
            </div>
          </>
          )}
        </div>
      );
    };