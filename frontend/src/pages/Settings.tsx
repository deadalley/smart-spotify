import { Monitor, Moon, Sun } from "lucide-react";
import { Page } from "../components/Page";
import { useSettings } from "../contexts/SettingsContext";
import { ColorMode, useTheme } from "../contexts/ThemeContext";
import { BUY_LINK_SERVICES } from "../utils/buyLinks";

const COLOR_MODE_OPTIONS: { value: ColorMode; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function Settings() {
  const { isServiceEnabled, setServiceEnabled } = useSettings();
  const { colorMode, setColorMode } = useTheme();

  return (
    <Page>
      <Page.Header
        title="Settings"
        subtitle="Manage your appearance preferences and connected services."
      />

      <div className="mb-8 max-w-md">
        <h2 className="text-lg font-semibold text-base-content mb-3">
          Appearance
        </h2>
        <div className="join w-full">
          {COLOR_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={`join-item btn flex-1 gap-2 ${
                colorMode === value ? "btn-primary" : "btn-outline"
              }`}
              aria-pressed={colorMode === value}
              onClick={() => setColorMode(value)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold text-base-content mb-1">
        Buy / view links
      </h2>
      <p className="text-base-content/60 mb-3">
        Choose which services show up as buy / view links on tracks, albums,
        and artists.
      </p>

      <div className="flex flex-col divide-y divide-base-200 max-w-md">
        {BUY_LINK_SERVICES.map(({ id, label, icon }) => (
          <label
            key={id}
            className="flex items-center justify-between py-3 cursor-pointer"
          >
            <span className="flex items-center gap-3 text-base-content">
              <img src={icon} alt="" className="size-6 rounded-sm" />
              {label}
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={isServiceEnabled(id)}
              onChange={(e) => setServiceEnabled(id, e.target.checked)}
            />
          </label>
        ))}
      </div>
    </Page>
  );
}
