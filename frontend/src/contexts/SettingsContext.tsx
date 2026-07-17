import { createContext, ReactNode, useContext, useState } from "react";
import { BuyLinkService } from "../utils/buyLinks";

const SETTINGS_STORAGE_KEY = "smart_spotify_buy_link_services";

const DEFAULT_ENABLED_SERVICES: Record<BuyLinkService, boolean> = {
  qobuz: true,
  bandcamp: true,
  appleMusic: true,
  discogs: false,
  amazon: false,
};

function getStoredServices(): Record<BuyLinkService, boolean> {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_ENABLED_SERVICES;

  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ENABLED_SERVICES, ...parsed };
  } catch {
    return DEFAULT_ENABLED_SERVICES;
  }
}

interface SettingsContextType {
  enabledServices: BuyLinkService[];
  isServiceEnabled: (service: BuyLinkService) => boolean;
  setServiceEnabled: (service: BuyLinkService, enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<Record<BuyLinkService, boolean>>(
    () => getStoredServices()
  );

  const setServiceEnabled = (service: BuyLinkService, enabled: boolean) => {
    setServices((prev) => {
      const next = { ...prev, [service]: enabled };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const value: SettingsContextType = {
    enabledServices: (Object.keys(services) as BuyLinkService[]).filter(
      (service) => services[service]
    ),
    isServiceEnabled: (service) => services[service] ?? false,
    setServiceEnabled,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
