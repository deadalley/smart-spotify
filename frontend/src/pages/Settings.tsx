import { Page } from "../components/Page";
import { useSettings } from "../contexts/SettingsContext";
import { BUY_LINK_SERVICES } from "../utils/buyLinks";

export function Settings() {
  const { isServiceEnabled, setServiceEnabled } = useSettings();

  return (
    <Page>
      <Page.Header
        title="Settings"
        subtitle="Choose which services show up as buy / view links on tracks, albums, and artists."
      />

      <div className="flex flex-col divide-y divide-base-200 max-w-md">
        {BUY_LINK_SERVICES.map(({ id, label }) => (
          <label
            key={id}
            className="flex items-center justify-between py-3 cursor-pointer"
          >
            <span className="text-base-content">{label}</span>
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
