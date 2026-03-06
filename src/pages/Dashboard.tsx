import { useEffect, useState, useMemo } from 'react';
import { StatCard } from '@/components/StatCard';
import { FleetChart } from '@/components/FleetChart';
import { PeriodSelector } from '@/components/PeriodSelector';
import { FlexibilityImpact } from '@/components/FlexibilityImpact';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { api } from '@/api/client';
import {
  generateHistoricLoad,
  generateMarketSplitStats,
} from '@/data/generators';
import { useSettings } from '@/store/settingsStore';
import type { FleetStats } from '@/types';

export function Dashboard() {
  const { settings } = useSettings();
  const [stats, setStats] = useState<FleetStats | null>(null);
  const { timeWindow, setTimeWindow, range, goNext, goPrev, isAtPresent } =
    usePeriodSelector('1D');

  useEffect(() => {
    api.fleet.stats().then(setStats).catch(console.error);
  }, []);

  const marketStats = useMemo(() => generateMarketSplitStats(range), [range]);

  const periodStats = useMemo(() => {
    if (timeWindow === '1D') return null; // use API snapshot for 1D
    const blocks = generateHistoricLoad(365).filter(
      (b) => b.timestamp >= range.start && b.timestamp <= range.end
    );
    const totalFlex = blocks.reduce((s, b) => s + b.flexibleKwh, 0);
    const avgSoC = 62;
    return {
      totalCapacityKwh: 12_450,
      optedInFlexibilityKwh: Math.round(totalFlex),
      activeEvCount: 847,
      avgStateOfChargePct: avgSoC,
    };
  }, [timeWindow, range]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Fleet Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Real-time overview of EV fleet capacity and flexibility
        </p>
      </div>

      <PeriodSelector
        timeWindow={timeWindow}
        label={range.label}
        isAtPresent={isAtPresent}
        onWindowChange={setTimeWindow}
        onPrev={goPrev}
        onNext={goNext}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Fleet Capacity"
          value={(
            periodStats?.totalCapacityKwh ??
            stats?.totalCapacityKwh ??
            0
          ).toLocaleString()}
          unit="kWh"
        />
        <StatCard
          label="Opted-in for Flexibility"
          value={
            timeWindow === '1D'
              ? (stats?.availableFlexibilityKw ?? 0).toLocaleString()
              : (periodStats?.optedInFlexibilityKwh ?? 0).toLocaleString()
          }
          unit={timeWindow === '1D' ? 'kW' : 'kWh'}
          trend={timeWindow === '1D' ? '+8% vs last week' : undefined}
        />
        <StatCard
          label="Active EVs"
          value={(
            periodStats?.activeEvCount ??
            stats?.activeEvCount ??
            0
          ).toLocaleString()}
          unit="vehicles"
        />
        <StatCard
          label="Avg. State of Charge"
          value={(
            periodStats?.avgStateOfChargePct ??
            stats?.avgStateOfChargePct ??
            0
          ).toString()}
          unit="%"
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">
          Day-Ahead Market
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="DA Load"
            value={marketStats.daLoadKwh.toLocaleString()}
            unit="kWh"
          />
          <StatCard
            label="DA Savings"
            value={`€${marketStats.daSavingsEur.toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="ID Adjustments"
            value={marketStats.idAdjustmentsKwh.toLocaleString()}
            unit="kWh"
          />
          <StatCard
            label="ID Savings"
            value={`€${marketStats.idSavingsEur.toLocaleString()}`}
            unit=""
          />
        </div>
      </div>

      {settings.mfrrEnabled && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            mFRR (Flex 2.0)
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="mFRR Up"
              value={marketStats.mfrrUpKwh.toLocaleString()}
              unit="kWh"
            />
            <StatCard
              label="mFRR Down"
              value={marketStats.mfrrDownKwh.toLocaleString()}
              unit="kWh"
            />
            <StatCard
              label="mFRR Revenue"
              value={`€${marketStats.mfrrRevenueEur.toLocaleString()}`}
              unit=""
            />
            <StatCard
              label="Delivery Rate"
              value={marketStats.mfrrDeliveryRatePct.toString()}
              unit="%"
            />
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <FleetChart range={range} timeWindow={timeWindow} />
      </div>

      <FlexibilityImpact range={range} timeWindow={timeWindow} />
    </div>
  );
}
