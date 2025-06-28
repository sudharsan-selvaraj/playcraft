import { useComputedColorScheme } from '@mantine/core';
import { ResizableDivider } from '../components/ResizableDivider';
import { customColors } from '../theme';
import { AutomationFrame } from './AutomationFrame.page';
import { CodePanelPage } from './CodePanel.page';


export function PlayCraftPage() {
  const colorScheme = useComputedColorScheme('light');
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        background: customColors.background[colorScheme],
      }}
    >
      <ResizableDivider
        left={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              background: customColors.background[colorScheme],
            }}
          >
            <CodePanelPage />
          </div>
        }
        right={<AutomationFrame />}
        minLeftWidth={200}
        initialLeftWidth={500}
      />
    </div>
  );
}