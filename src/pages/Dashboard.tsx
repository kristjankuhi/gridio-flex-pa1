import { useMemo } from 'react';
import { StatCard } from '@/components/StatCard';
import { generateFleetStats } from '@/data/generators';

export function Dashboard() {
  const stats = useMemo(() => generateFleetStats(), []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Fleet Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Real-time overview of EV fleet capacity and flexibility
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Fleet Capacity"
          value={stats.totalCapacityKwh.toLocaleString()}
          unit="kWh"
        />
        <StatCard
          label="Available Flexibility"
          value={stats.availableFlexibilityKw.toLocaleString()}
          unit="kW"
          trend="+8% vs last week"
        />
        <StatCard
          label="Active EVs"
          value={stats.activeEvCount.toLocaleString()}
          unit="vehicles"
        />
        <StatCard
          label="Avg. State of Charge"
          value={stats.avgStateOfChargePct.toString()}
          unit="%"
        />
      </div>

      {/* Chart goes here — Task 8 */}
    </div>
  );
}
