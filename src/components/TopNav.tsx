import { NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useSettings } from '@/store/settingsStore';

export function TopNav() {
  const {
    settings: { flex2Enabled },
  } = useSettings();
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
          <SettingsPanel />
          <Badge
            variant="secondary"
            className="text-xs font-normal text-muted-foreground"
          >
            v1.0 · Simulated data
          </Badge>
        </div>
      </div>
    </header>
  );
}
