import React from 'react';


import { MantineProvider } from '@mantine/core';
import { SettingsProvider } from './components/SettingsContext';
import { PlayCraftPage } from './pages/Platcraft.page';
import { Notifications } from '@mantine/notifications';
import { theme } from './theme';

export default function App() {
  return (
    <SettingsProvider>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Notifications />
        <PlayCraftPage />
      </MantineProvider>
    </SettingsProvider>
  );
}
