import { useEffect, useState } from 'react';
import { StatCard } from '@/components/StatCard';
import { FleetChart } from '@/components/FleetChart';
import { api } from '@/api/client';
import type { FleetStats } from '@/types';

export function Dashboard() {
  const [stats, setStats] = useState<FleetStats | null>(null);

  useEffect(() => {
    api.fleet.stats().then(setStats).catch(console.error);
  }, []);

  if (!stats)
    return <div className="text-muted-foreground text-sm">Loading...</div>;

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

      <div className="bg-card border border-border rounded-lg p-6">
        <FleetChart />
      </div>
    </div>
  );
}
