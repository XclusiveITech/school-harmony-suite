import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface SchoolSettings {
  name: string;
  logo: string; // base64 or URL
  address: string;
  phone: string;
  email: string;
  motto: string;
  bankDetails: string;
}

const defaultSettings: SchoolSettings = {
  name: 'Brainstar Academy',
  logo: '',
  address: '42 Education Avenue, Harare, Zimbabwe',
  phone: '+263 242 700 100',
  email: 'info@brainstar.edu',
  motto: 'Excellence Through Knowledge',
  bankDetails: 'FBC Bank | Acc: 6200123456789 | Branch: Samora Machel',
};

interface SchoolSettingsContextType {
  settings: SchoolSettings;
  updateSettings: (s: Partial<SchoolSettings>) => void;
}

const SchoolSettingsContext = createContext<SchoolSettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export const useSchoolSettings = () => useContext(SchoolSettingsContext);

export function SchoolSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem('brainstar_school_settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const updateSettings = (partial: Partial<SchoolSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('brainstar_school_settings', JSON.stringify(next));
      return next;
    });
  };

  return (
    <SchoolSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SchoolSettingsContext.Provider>
  );
}
