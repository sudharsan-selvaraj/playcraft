import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SunMoon } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ActionIcon, Alert, useComputedColorScheme, useMantineColorScheme } from '@mantine/core';
import { executeCode, getSessionState, stopCodeExecution } from '../apiService';
import PlayCraftLogoDark from '../assets/logo_dark.png';
import PlayCraftLogoLight from '../assets/logo_light.png';
import BottomPanel from '../components/BottomPanel';
import { CodeEditor } from '../components/CodeEditor';
import { useSocket } from '../components/SocketProvider';
import TerminalLog from '../components/TerminalLog';
import { customColors } from '../theme';

const DEFAULT_CODE = `
// (async ()=> {
//   await page.goto('https://www.playwright.dev', { waitUntil: 'networkidle' });
//   console.log('Page loaded', await page.title());
//   await page.locator(".DocSearch-Button-Placeholder").click();
//   await page.locator("#docsearch-input").fill("locators");
//   await page.locator(".DocSearch-Hit-title").filter({ hasText: "Filtering Locators" }).click()
// })()


async function demo() {
  await page.locator(".DocSearch-Button-Placeholder").click();
  await page.locator("#docsearch-input").fill("locators");
}

async function waitFor() {
  try {
    await page.waitForSelector("sudharsan", {state: "visible", timeout: 2000})
  } catch(err) {
    console.error(err);
  }
}

(async ()=> {
  await page.goto('https://www.playwright.dev', { waitUntil: 'networkidle' });
  console.log('Page loaded', await page.title());
  await demo();
  await page.locator(".DocSearch-Hit-title").filter({ hasText: "Filtering Locators" }).click()
  await waitFor()
})()
`;

const logo = (colorScheme: 'dark' | 'light') => {
  const img = colorScheme === 'dark' ? PlayCraftLogoDark : PlayCraftLogoLight;
  const width = colorScheme === 'dark' ? 90 : 100;

  return <img src={img} alt="PlayCraft Logo" width={width} height={'auto'} />;
};

export function CodePanelPage() {
  const colorScheme = useComputedColorScheme('dark');
  const { colorScheme: mantineColorScheme, setColorScheme } = useMantineColorScheme();
  const [code, setCode] = useState(DEFAULT_CODE.trim());
  const [logs, setLogs] = useState<any[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'execution' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [currentStepNumber, setCurrentStepNumber] = useState<number | null>(null);
  const socket = useSocket();
  const [bottomPanelMinimized, setBottomPanelMinimized] = useState(false);
  const bottomPanelRef = useRef<any>(null);
  const [lastPanelSize, setLastPanelSize] = useState<number | undefined>(30); // percent

  // Fetch session state and restore UI on mount
  useEffect(() => {
    (async () => {
      const session = await getSessionState();
      if (session && !session.error) {
        setCode(session.code || DEFAULT_CODE.trim());
        setLogs(session.logs || []);
        setStatus(session.status || 'idle');
        setError(session.error || null);
        setCurrentStepNumber(session.currentStepNumber || null);
      }
      console.log("session", session)
    })();
  }, []);

  // Socket: join room and listen for logs
  useEffect(() => {
    if (!socket) return;
    const sessionId = (window as any).SESSION_ID;
    if (!sessionId) return;
    socket.emit('ready', { sessionId });

    const onLog = (log: { message: string; level: string; timestamp?: number }) => {
      setLogs((prev) => [...prev, log]);
    };

    const onExecutionStart = (data: { timestamp: number; status: string }) => {
      setIsExecuting(true);
      setLogs([]);
      setStatus(data.status as 'idle' | 'execution' | 'completed' | 'error');
      setError(null);
    };

    const onExecutionComplete = (data: { timestamp: number; success: boolean; status: string }) => {
      setIsExecuting(false);
      setStatus(data.status as 'idle' | 'execution' | 'completed' | 'error');
      setCurrentStepNumber(null);
    };

    const onStepStart = (data: { step: number }) => {
      setCurrentStepNumber(data.step);
    };

    socket.on('log', onLog);
    socket.on('execution-start', onExecutionStart);
    socket.on('execution-complete', onExecutionComplete);
    socket.on('step-start', onStepStart);

    return () => {
      socket.off('log', onLog);
      socket.off('execution-start', onExecutionStart);
      socket.off('execution-complete', onExecutionComplete);
      socket.off('step-start', onStepStart);
    };
  }, [socket]);

  // Handle code execution
  const handleExecute = useCallback(async () => {
    try {
      await executeCode(code);
      // Execution state is now managed by socket events
    } catch (err: any) {
      // Error handling is also managed by socket events
      console.error('Execution failed:', err);
    }
  }, [code]);

  const handleStop = useCallback(async () => {
    try {
      await stopCodeExecution();
    } catch (err: any) {
      console.error('Stopping execution failed:', err);
    }
  }, []);

  // Minimize/maximize logic for bottom panel
  const handleMinimize = useCallback(() => {
    if (bottomPanelRef.current) {
      setLastPanelSize(bottomPanelRef.current.getSize());
      bottomPanelRef.current.resize(5); // 5% or as small as possible
      setBottomPanelMinimized(true);
    }
  }, []);
  const handleMaximize = useCallback(() => {
    if (bottomPanelRef.current) {
      bottomPanelRef.current.resize(lastPanelSize || 30);
      setBottomPanelMinimized(false);
    }
  }, [lastPanelSize]);

  return (
    <div
      style={{
        height: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: customColors.background[colorScheme],
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '60px',
          background: customColors.secondaryBg[colorScheme],
          borderBottom: `1px solid ${customColors.border[colorScheme]}`,
          padding: '20px 0 20px 0',
          justifyContent: 'space-between',
        }}
      >
        {logo(colorScheme)}
        <ActionIcon
          variant="subtle"
          size={32}
          style={{
            marginRight: 24,
            color: customColors.icon[colorScheme],
            background: customColors.iconBg[colorScheme],
            border: `1px solid ${customColors.border[colorScheme]}`,
            boxShadow: '0 1px 4px 0 rgba(60,60,60,0.08)',
            transition: 'background 0.15s, box-shadow 0.15s, border-color 0.15s',
          }}
          onClick={() => setColorScheme(mantineColorScheme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle color scheme"
        >
          <SunMoon size={20} />
        </ActionIcon>
      </div>

      {/* Main Editor + Bottom Panel (Resizable) */}
      <PanelGroup direction="vertical" style={{ flex: 1, minHeight: 0 }}>
        <Panel
          minSize={20}
          defaultSize={70}
          style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
          <CodeEditor
            code={code}
            onCodeChange={(value) => setCode(value ?? '')}
            colorScheme={colorScheme}
            isExecuting={isExecuting || status === 'execution'}
            onPlayClick={handleExecute}
            onStopClick={handleStop}
            currentStepNumber={currentStepNumber}
          />
        </Panel>
        <PanelResizeHandle style={{ height: 6, background: 'transparent', cursor: 'ns-resize' }} />
        <Panel
          minSize={5}
          defaultSize={30}
          style={{ minHeight: 0, position: 'relative' }}
          ref={bottomPanelRef}
        >
          <BottomPanel
            onTerminalClear={() => setLogs([])}
            minimized={bottomPanelMinimized}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
          >
            {/* Terminal Tab */}
            <TerminalLog logs={logs} />
            {/* Mock Tab */}
            <div style={{ padding: 16, color: customColors.text[colorScheme] }}>
              Mock placeholder
            </div>
            {/* Network Tab */}
            <div style={{ padding: 16, color: customColors.text[colorScheme] }}>
              Network placeholder
            </div>
            {/* Console Tab */}
            <div style={{ padding: 16, color: customColors.text[colorScheme] }}>
              Console placeholder
            </div>
          </BottomPanel>
        </Panel>
      </PanelGroup>
      {status === 'error' && error && (
        <Alert
          color="red"
          title="Execution Error"
          style={{ position: 'absolute', bottom: 24, right: 24 }}
        >
          {error}
        </Alert>
      )}
    </div>
  );
}
