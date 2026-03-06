import { Settings } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useSettings } from '@/store/settingsStore';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  badge,
}: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-border/40">
      <div className="pr-8">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${
          value ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel() {
  const { settings, update } = useSettings();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent className="bg-card border-border w-80">
        <SheetHeader>
          <SheetTitle className="text-base">Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <ToggleRow
            label="mFRR Features"
            description="Show mFRR stat cards, revenue tracking and activation controls across the UI"
            badge="Flex 2.0"
            value={settings.mfrrEnabled}
            onChange={(v) => update({ mfrrEnabled: v })}
          />
          <ToggleRow
            label="Show Forecast"
            description="Display forecasted load and price data on charts"
            value={settings.showForecast}
            onChange={(v) => update({ showForecast: v })}
          />
          <ToggleRow
            label="Real-time Simulation"
            description="Advance the simulation clock in real time — forecast blocks become actuals every 15 minutes"
            value={settings.realtimeSimulation}
            onChange={(v) => update({ realtimeSimulation: v })}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
