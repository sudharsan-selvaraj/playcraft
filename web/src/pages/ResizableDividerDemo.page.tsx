import PlayCraftLogo from '@/assets/logo.png';
import PlayCraftLogo1 from '@/assets/logo1.png';
import { ResizableDivider } from '../components/ResizableDivider';
import { AutomationFrame } from './AutomationFrame.page';

export function ResizableDividerDemoPage() {
  return (
    <div style={{ width: '100%', height: '100vh', padding: 10 }}>
      <ResizableDivider
        left={
          <div
            style={{
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <img src={PlayCraftLogo} alt="PlayCraft Logo" height={120} width={'auto'} />
            <img src={PlayCraftLogo1} alt="PlayCraft Logo" height={120} width={'auto'} />
          </div>
        }
        right={<AutomationFrame />}
      />
    </div>
  );
}
