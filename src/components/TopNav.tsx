import { NavLink } from 'react-router-dom';
import type { MarketArea } from '@/types';
import { AREA_GROUPS, AREA_LABEL } from '@/data/areaConfig';
import { Badge } from '@/components/ui/badge';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useSettings } from '@/store/settingsStore';

export function TopNav() {
  const { settings, update } = useSettings();
  const { flex2Enabled, marketArea } = settings;
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-8">
          <span className="text-sm font-semibold tracking-wide">
            Gridio <span className="text-primary">Flex</span>
          </span>
          <nav className="flex items-center gap-6">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `text-sm transition-colors pb-0.5 ${
                  isActive
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/price-editor"
              className={({ isActive }) =>
                `text-sm transition-colors pb-0.5 ${
                  isActive
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {flex2Enabled ? 'Bid Manager' : 'Price Editor'}
            </NavLink>
            <NavLink
              to="/settlement"
              className={({ isActive }) =>
                `text-sm transition-colors pb-0.5 ${
                  isActive
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              Settlement
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={`text-xs font-medium ${
              flex2Enabled
                ? 'border-blue-500/50 text-blue-400'
                : 'border-primary/50 text-primary'
            }`}
          >
            {flex2Enabled ? 'Flex 2.0' : 'Flex 1.0'}
          </Badge>
          {/* Market area selector */}
          <select
            value={marketArea}
            onChange={(e) =>
              update({ marketArea: e.target.value as MarketArea })
            }
            className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            aria-label="Market area"
          >
            {AREA_GROUPS.map(({ label, areas }) => (
              <optgroup key={label} label={label}>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {AREA_LABEL[a]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <SettingsPanel />
          <Badge
            variant="secondary"
            className="text-xs font-normal text-muted-foreground"
          >
            Simulated data
          </Badge>
        </div>
      </div>
    </header>
  );
}
