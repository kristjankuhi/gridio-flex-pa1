import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { StatCard } from '@/components/StatCard';
import { FleetChart } from '@/components/FleetChart';
import { PeriodSelector } from '@/components/PeriodSelector';
import { FlexibilityImpact } from '@/components/FlexibilityImpact';
import { SoCChart } from '@/components/SoCChart';
import { BidSummaryStrip } from '@/components/BidSummaryStrip';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { api } from '@/api/client';
import {
  generateHistoricLoad,
  generateFleetStats,
  generateMarketSplitStats,
  generateLoadShiftBlocks,
  generatePriceReference,
} from '@/data/generators';
import { useSettings } from '@/store/settingsStore';
import type { FleetStats, SoCBlock, BidBlock } from '@/types';

export function Dashboard() {
  const { settings } = useSettings();
  const { flex2Enabled, marketArea } = settings;
  const [stats, setStats] = useState<FleetStats>(() =>
    generateFleetStats(marketArea)
  );
  const [socBlocks, setSocBlocks] = useState<SoCBlock[]>([]);
  const [bidBlocks, setBidBlocks] = useState<BidBlock[]>([]);
  const {
    timeWindow,
    setTimeWindow,
    anchor,
    jumpTo,
    range,
    goNext,
    goPrev,
    isAtPresent,
  } = usePeriodSelector('1D');

  useEffect(() => {
    api.fleet.stats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    setStats(generateFleetStats(marketArea));
  }, [marketArea]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    api.fleet
      .soc(today)
      .then((blocks) =>
        setSocBlocks(
          blocks.map((b) => ({
            ...b,
            timestamp: new Date(b.timestamp as unknown as string),
          }))
        )
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!flex2Enabled) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    api.bids
      .get(today)
      .then((blocks) =>
        setBidBlocks(
          blocks.map((b) => ({
            ...b,
            timestamp: new Date(b.timestamp as unknown as string),
          }))
        )
      )
      .catch(console.error);
  }, [flex2Enabled]);

  const marketStats = useMemo(
    () => generateMarketSplitStats(range, marketArea),
    [range, marketArea]
  );

  const perEvStats = useMemo(() => {
    if (flex2Enabled) return null;
    const allBlocks = generateLoadShiftBlocks(365, marketArea);
    const blocks = allBlocks.filter(
      (b) => b.timestamp >= range.start && b.timestamp <= range.end
    );
    const baselineCost = blocks.reduce(
      (s, b) => s + (b.baselineKwh * Math.max(0, b.daSpotEurMwh)) / 1000,
      0
    );
    const actualCost = blocks.reduce(
      (s, b) => s + (b.actualKwh * Math.max(0, b.daSpotEurMwh)) / 1000,
      0
    );
    const savings = baselineCost - actualCost;
    const activeEvs = 847;
    return {
      savingsPerEv: savings / activeEvs,
      savingsRatePct:
        baselineCost > 0 ? Math.round((savings / baselineCost) * 1000) / 10 : 0,
      activeEvs,
    };
  }, [flex2Enabled, range, marketArea]);

  // Current DA spot price for the present 15-min block (computed once at render)
  const _now = new Date();
  const _rounded = new Date(_now);
  _rounded.setMinutes(Math.floor(_now.getMinutes() / 15) * 15, 0, 0);
  const _priceBlocks = generatePriceReference(_now, marketArea);
  const _currentBlock = _priceBlocks.find(
    (b) => new Date(b.timestamp).getTime() === _rounded.getTime()
  );
  const currentDaPrice = _currentBlock
    ? Math.round(_currentBlock.daSpotEurMwh * 10) / 10
    : null;

  const totalReservedMw = bidBlocks
    .filter((b) => b.isAvailable)
    .reduce((max, b) => Math.max(max, b.reservedMw), 0);

  const capacityRevenueToday = bidBlocks
    .filter((b) => b.isAvailable)
    .reduce((s, b) => s + b.reservedMw * b.capacityPriceEurMwH * 0.25, 0);

  const periodStats = useMemo(() => {
    if (timeWindow === '1D') return null; // use API snapshot for 1D
    const blocks = generateHistoricLoad(365, marketArea).filter(
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
  }, [timeWindow, range, marketArea]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold mb-1">Fleet Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time overview of EV fleet capacity and flexibility
          </p>
        </div>
        {currentDaPrice != null && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">DA Spot (now)</p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                currentDaPrice < 0
                  ? 'text-emerald-400'
                  : currentDaPrice > 100
                    ? 'text-red-400'
                    : 'text-amber-400'
              }`}
            >
              €{currentDaPrice.toFixed(1)}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                /MWh
              </span>
            </p>
          </div>
        )}
      </div>

      <PeriodSelector
        timeWindow={timeWindow}
        label={range.label}
        anchor={anchor}
        isAtPresent={isAtPresent}
        onWindowChange={setTimeWindow}
        onPrev={goPrev}
        onNext={goNext}
        onJumpTo={jumpTo}
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
          label="Active EVs"
          value={(
            periodStats?.activeEvCount ??
            stats?.activeEvCount ??
            0
          ).toLocaleString()}
          unit="vehicles"
        />
        <StatCard
          label="Up Headroom"
          value={((stats?.upHeadroomKw ?? 0) / 1000).toFixed(2)}
          unit="MW"
          trend="Available for up-regulation"
        />
        <StatCard
          label="Down Headroom"
          value={((stats?.downHeadroomKw ?? 0) / 1000).toFixed(2)}
          unit="MW"
          trend="Available for down-regulation"
        />
      </div>

      {flex2Enabled ? (
        <div className="space-y-3">
          <BidSummaryStrip blocks={bidBlocks} />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Reserved Capacity"
              value={totalReservedMw.toFixed(2)}
              unit="MW"
            />
            <StatCard
              label="Capacity Revenue Today"
              value={`€${Math.round(capacityRevenueToday).toLocaleString()}`}
              unit=""
            />
            <StatCard
              label="mFRR Activations (30d)"
              value={marketStats.mfrrDeliveryRatePct.toString()}
              unit="events"
            />
            <StatCard
              label="Delivery Rate"
              value={marketStats.mfrrDeliveryRatePct.toString()}
              unit="%"
            />
          </div>
        </div>
      ) : (
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
          {perEvStats && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Per Vehicle
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Saving per EV"
                  value={`€${Math.round(perEvStats.savingsPerEv).toLocaleString()}`}
                  unit=""
                  trend="vs uncontrolled baseline"
                />
                <StatCard
                  label="Cost Reduction"
                  value={perEvStats.savingsRatePct.toString()}
                  unit="%"
                  trend="DA charging cost"
                />
                <StatCard
                  label="Opted-in Fleet"
                  value={perEvStats.activeEvs.toLocaleString()}
                  unit="EVs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {socBlocks.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <SoCChart blocks={socBlocks} />
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-6">
        <FleetChart
          range={range}
          timeWindow={timeWindow}
          showBaseline={!flex2Enabled}
          area={marketArea}
        />
      </div>

      <FlexibilityImpact range={range} timeWindow={timeWindow} />
    </div>
  );
}
