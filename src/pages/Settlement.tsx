import { useMemo } from 'react';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { PeriodSelector } from '@/components/PeriodSelector';
import { ActivationTable } from '@/components/ActivationTable';
import { StatCard } from '@/components/StatCard';
import {
  generateActivationHistory,
  generateLoadShiftBlocks,
  generateUserEconomics,
} from '@/data/generators';
import { LoadShiftChart } from '@/components/LoadShiftChart';
import { UserValueChart } from '@/components/UserValueChart';
import type {
  ActivationRecord,
  LoadShiftBlock,
  UserEconomicsBlock,
} from '@/types';
import { useSettings } from '@/store/settingsStore';

function exportCsv(activations: ActivationRecord[], label: string) {
  const header =
    'Timestamp,Type,Direction,Requested kW,Delivered kW,Duration min,Baseline kWh,Actual kWh,Shifted kWh,Revenue EUR';
  const rows = activations.map((a) =>
    [
      a.timestamp.toISOString(),
      a.product,
      a.direction ?? '',
      a.requestedKw ?? '',
      a.deliveredKw ?? '',
      a.durationMin,
      Math.round(a.baselineKwh),
      Math.round(a.actualKwh),
      Math.round(a.shiftedKwh),
      Math.round(a.revenueEur),
    ].join(',')
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gridio-flex-settlement-${label}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function Settlement() {
  const { settings } = useSettings();
  const { marketArea } = settings;
  const {
    timeWindow,
    setTimeWindow,
    anchor,
    jumpTo,
    range,
    goNext,
    goPrev,
    isAtPresent,
  } = usePeriodSelector('1M');

  const allActivations = useMemo(() => generateActivationHistory(365), []);
  const activations = useMemo(
    () =>
      allActivations.filter(
        (a) => a.timestamp >= range.start && a.timestamp <= range.end
      ),
    [allActivations, range]
  );

  const allShiftBlocks = useMemo<LoadShiftBlock[]>(
    () => generateLoadShiftBlocks(365, marketArea),
    [marketArea]
  );
  const shiftBlocks = useMemo(
    () =>
      allShiftBlocks.filter(
        (b) => b.timestamp >= range.start && b.timestamp <= range.end
      ),
    [allShiftBlocks, range]
  );

  const allEconomics = useMemo<UserEconomicsBlock[]>(
    () => generateUserEconomics(365),
    []
  );
  const economicsBlocks = useMemo(
    () =>
      allEconomics.filter(
        (b) => b.timestamp >= range.start && b.timestamp <= range.end
      ),
    [allEconomics, range]
  );

  const totalUserCredit = economicsBlocks.reduce(
    (s, b) => s + b.userCreditEur,
    0
  );
  const totalGridioRetained = economicsBlocks.reduce(
    (s, b) => s + b.gridioRetainedEur,
    0
  );
  const avgCreditPerEv = totalUserCredit / 847;
  const gridioSharePct =
    totalUserCredit + totalGridioRetained > 0
      ? Math.round(
          (totalGridioRetained / (totalUserCredit + totalGridioRetained)) * 100
        )
      : 60;

  const capacityRevenue = activations.reduce(
    (s, a) => s + a.capacityPaymentEur,
    0
  );
  const energyRevenue = activations.reduce((s, a) => s + a.energyPaymentEur, 0);
  const imbalanceCost = activations.reduce((s, a) => s + a.imbalanceCostEur, 0);
  const netRevenue = activations.reduce((s, a) => s + a.revenueEur, 0);

  const baselineCostEur = shiftBlocks.reduce(
    (s, b) => s + (b.baselineKwh * Math.max(0, b.daSpotEurMwh)) / 1000,
    0
  );
  const actualCostEur = shiftBlocks.reduce(
    (s, b) => s + (b.actualKwh * Math.max(0, b.daSpotEurMwh)) / 1000,
    0
  );
  const daSavingsEur = baselineCostEur - actualCostEur;
  const savingsRatePct =
    baselineCostEur > 0
      ? Math.round((daSavingsEur / baselineCostEur) * 1000) / 10
      : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Settlement</h1>
        <p className="text-sm text-muted-foreground">
          Activation log, load shift proof and earned revenue
        </p>
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

      {settings.flex2Enabled ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Capacity Payments"
            value={`€${Math.round(capacityRevenue).toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="Energy Payments"
            value={`€${Math.round(energyRevenue).toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="Imbalance Costs"
            value={`-€${Math.round(imbalanceCost).toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="Net Revenue"
            value={`€${Math.round(netRevenue).toLocaleString()}`}
            unit=""
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Baseline Cost"
            value={`€${Math.round(baselineCostEur).toLocaleString()}`}
            unit=""
            trend="Without Gridio"
          />
          <StatCard
            label="Actual Cost"
            value={`€${Math.round(actualCostEur).toLocaleString()}`}
            unit=""
            trend="With Gridio"
          />
          <StatCard
            label="DA Savings"
            value={`€${Math.round(daSavingsEur).toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="Savings Rate"
            value={savingsRatePct.toString()}
            unit="%"
          />
        </div>
      )}

      {/* User Value panel */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          EV User Value
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Bill Credits Distributed"
            value={`€${Math.round(totalUserCredit).toLocaleString()}`}
            unit=""
            trend="credited to EV users"
          />
          <StatCard
            label="Avg. Credit per Vehicle"
            value={`€${Math.round(avgCreditPerEv)}`}
            unit="/ vehicle"
          />
          <StatCard
            label="Gridio Share"
            value={`€${Math.round(totalGridioRetained).toLocaleString()}`}
            unit=""
            trend={`${gridioSharePct}% of gross savings`}
          />
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-3">Value split</p>
          <UserValueChart blocks={economicsBlocks} timeWindow={timeWindow} />
        </div>
      </div>

      {!settings.flex2Enabled && shiftBlocks.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <LoadShiftChart blocks={shiftBlocks} timeWindow={timeWindow} />
        </div>
      )}

      {settings.flex2Enabled && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Activation Log</h2>
            <button
              onClick={() => exportCsv(activations, range.label)}
              className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Download CSV
            </button>
          </div>
          <ActivationTable activations={activations} />
        </div>
      )}
    </div>
  );
}
