import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { ResizableDividerDemoPage } from './pages/ResizableDividerDemo.page';
import { Router } from './Router';
import { theme } from './theme';

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      {/* <Router /> */}
      <ResizableDividerDemoPage />
    </MantineProvider>
  );
}
