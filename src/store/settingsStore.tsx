import React, { createContext, useContext, useState } from 'react';

interface Settings {
  flex2Enabled: boolean;
  showForecast: boolean;
  realtimeSimulation: boolean;
}

const DEFAULTS: Settings = {
  flex2Enabled: false,
  showForecast: true,
  realtimeSimulation: true,
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem('gridio-flex-settings');
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

interface SettingsStore {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsStore | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  function update(patch: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('gridio-flex-settings', JSON.stringify(next));
      return next;
    });
  }

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
