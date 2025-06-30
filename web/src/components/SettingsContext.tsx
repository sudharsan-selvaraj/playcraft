import React, { createContext, useContext, useEffect, useState } from 'react';

export type Settings = {
  allowIframeSandboxing: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  allowIframeSandboxing: true,
};

const SettingsContext = createContext<{
  settings: Settings;
  setSettings: (s: Settings) => void;
}>({
  settings: DEFAULT_SETTINGS,
  setSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = localStorage.getItem('playcraft_settings');
    if (saved) {
      try {
        setSettingsState({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {}
    }
  }, []);

  const setSettings = (s: Settings) => {
    setSettingsState(s);
    localStorage.setItem('playcraft_settings', JSON.stringify(s));
  };

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
