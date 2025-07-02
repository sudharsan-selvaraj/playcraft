import React from 'react';


import { MantineProvider } from '@mantine/core';
import { SettingsProvider } from './components/SettingsContext';
import { PlayCraftPage } from './pages/Platcraft.page';
import { theme } from './theme';

export default function App() {
  return (
    <SettingsProvider>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <PlayCraftPage />
      </MantineProvider>
    </SettingsProvider>
  );
}
