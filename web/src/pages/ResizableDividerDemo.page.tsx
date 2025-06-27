import { useComputedColorScheme } from '@mantine/core';
import PlayCraftLogo from '@/assets/logo.png';
import PlayCraftLogo1 from '@/assets/logo1.png';
import { ResizableDivider } from '../components/ResizableDivider';
import { customColors } from '../theme';
import { AutomationFrame } from './AutomationFrame.page';

export function ResizableDividerDemoPage() {
  const colorScheme = useComputedColorScheme('light');
  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        padding: 10,
        background: customColors.background[colorScheme],
      }}
    >
      <ResizableDivider
        left={
          <div
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              background: customColors.background[colorScheme],
            }}
          >
            <img src={PlayCraftLogo} alt="PlayCraft Logo" height={120} width={'auto'} />
            <img src={PlayCraftLogo1} alt="PlayCraft Logo" height={120} width={'auto'} />
          </div>
        }
        right={<AutomationFrame />}
        minLeftWidth={400}
        initialLeftWidth={400}
      />
    </div>
  );
}
