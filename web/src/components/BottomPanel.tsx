import React, { useState } from 'react';
import { Tabs, ActionIcon, useComputedColorScheme } from '@mantine/core';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { customColors } from '../theme';

const tabList = [
  { value: 'terminal', label: 'Terminal' },
  { value: 'mock', label: 'Mock' },
  { value: 'network', label: 'Network' },
  { value: 'console', label: 'Console' },
];

export default function BottomPanel({
  children,
  initialTab = 'terminal',
  minimized = false,
  onMinimize,
  onMaximize,
  onTerminalClear,
}: {
  children: React.ReactNode[];
  initialTab?: string;
  minimized?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onTerminalClear?: () => void;
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const colorScheme = useComputedColorScheme('dark');

  // Dynamic theme colors
  const panelBg = customColors.secondaryBg[colorScheme];
  const borderColor = customColors.border[colorScheme] ?? (colorScheme === 'dark' ? '#222' : '#ddd');
  const tabBarBg = colorScheme === 'dark' ? '#2c2c32' : '#f3f3f3';
  const tabActiveBorder = colorScheme === 'dark' ? '#3b82f6' : '#2563eb';
  const tabActiveColor = colorScheme === 'dark' ? '#fff' : '#222';
  const tabInactiveColor = colorScheme === 'dark' ? '#d4d4d4' : '#444';

  return (
    <div
      style={{
        width: '100%',
        height: minimized ? 28 : '100%',
        background: panelBg,
        borderTop: `1px solid ${borderColor}`,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'auto',
        position: 'relative',
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 28,
          borderBottom: `1px solid ${borderColor}`,
          background: tabBarBg,
          paddingLeft: 4,
        }}
      >
        <Tabs value={activeTab} onChange={(v) => setActiveTab(v || 'terminal')} variant="unstyled">
          <Tabs.List style={{ display: 'flex', gap: 0 }}>
            {tabList.map((tab) => (
              <Tabs.Tab
                key={tab.value}
                value={tab.value}
                style={{
                  background: 'transparent',
                  color: activeTab === tab.value ? tabActiveColor : tabInactiveColor,
                  border: 'none',
                  borderBottom: activeTab === tab.value
                    ? `2px solid ${tabActiveBorder}`
                    : '2px solid transparent',
                  borderRadius: 0,
                  fontWeight:  activeTab === tab.value
                  ? 800
                   : 500,
                  fontSize: 13,
                  padding: '0 14px',
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: 2,
                  cursor: 'pointer',
                  transition: 'color 0.15s, border-bottom 0.15s',
                }}
              >
                {tab.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs>
        <div style={{ flex: 1 }} />
        {/* Per-tab actions: Terminal clear icon */}
        {activeTab === 'terminal' && onTerminalClear && (
          <ActionIcon
            variant="subtle"
            size={18}
            onClick={onTerminalClear}
            style={{ marginRight: 8, color: tabActiveColor }}
            aria-label="Clear terminal logs"
          >
            <Trash2 size={18} />
          </ActionIcon>
        )}
        <ActionIcon
          variant="subtle"
          size={24}
          onClick={minimized ? onMaximize : onMinimize}
          style={{ marginRight: 8, color: tabInactiveColor }}
          aria-label={minimized ? 'Maximize' : 'Minimize'}
        >
          {minimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </ActionIcon>
      </div>
      {/* Panel content */}
      {!minimized && (
        <div style={{ flex: 1, overflow: 'auto', background: panelBg }}>
          {children[tabList.findIndex((t) => t.value === activeTab)]}
        </div>
      )}
    </div>
  );
} 