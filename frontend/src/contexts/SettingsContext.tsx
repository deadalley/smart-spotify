import { createContext, ReactNode, useContext, useState } from "react";
import { BuyLinkService } from "../utils/buyLinks";

export type EnabledServices = Record<BuyLinkService, boolean>;

export type CollectionView = "grid" | "list";

export type Settings = {
  enabledServices: EnabledServices;
  defaultView: CollectionView;
};

const SETTINGS_STORAGE_KEY = "smart_spotify_settings";

const DEFAULT_ENABLED_SERVICES: EnabledServices = {
  qobuz: true,
  bandcamp: true,
  appleMusic: true,
  discogs: true,
  amazon: true,
};

function getStoredSettings(): Settings {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw)
    return { enabledServices: DEFAULT_ENABLED_SERVICES, defaultView: "grid" };

  try {
    const parsed = JSON.parse(raw);
    return {
      enabledServices: parsed.enabledServices || DEFAULT_ENABLED_SERVICES,
      defaultView: parsed.defaultView === "list" ? "list" : "grid",
    };
  } catch {
    return { enabledServices: DEFAULT_ENABLED_SERVICES, defaultView: "grid" };
  }
}

function getStoredServices(): EnabledServices {
  const settings = getStoredSettings();
  return settings.enabledServices || DEFAULT_ENABLED_SERVICES;
}

function getStoredDefaultView(): CollectionView {
  const settings = getStoredSettings();
  return settings.defaultView === "list" ? "list" : "grid";
}

interface SettingsContextType {
  enabledServices: BuyLinkService[];
  isServiceEnabled: (service: BuyLinkService) => boolean;
  setServiceEnabled: (service: BuyLinkService, enabled: boolean) => void;
  defaultView: CollectionView;
  setDefaultView: (view: CollectionView) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<EnabledServices>(() =>
    getStoredServices(),
  );
  const [defaultView, _setDefaultView] = useState<CollectionView>(() =>
    getStoredDefaultView(),
  );

  const setServiceEnabled = (service: BuyLinkService, enabled: boolean) => {
    setServices((prev) => {
      const next = { ...prev, [service]: enabled };
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const setDefaultView = (view: CollectionView) => {
    _setDefaultView(view);
    const settings = getStoredSettings();
    const next = { ...settings, defaultView: view };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  };

  const value: SettingsContextType = {
    enabledServices: (Object.keys(services) as BuyLinkService[]).filter(
      (service) => services[service],
    ),
    isServiceEnabled: (service) => services[service] ?? false,
    setServiceEnabled,
    defaultView,
    setDefaultView,
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
