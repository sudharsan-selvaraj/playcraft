import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { PlayCraftPage } from './pages/Platcraft.page';
import { theme } from './theme';

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <PlayCraftPage />
    </MantineProvider>
  );
}
