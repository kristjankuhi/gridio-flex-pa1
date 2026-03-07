import { useMemo } from 'react';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { PeriodSelector } from '@/components/PeriodSelector';
import { ActivationTable } from '@/components/ActivationTable';
import { StatCard } from '@/components/StatCard';
import { generateActivationHistory } from '@/data/generators';
import type { ActivationRecord } from '@/types';
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
  const {
    timeWindow,
    setTimeWindow,
    anchor,
    jumpTo,
    range,
    goNext,
    goPrev,
    isAtPresent,
  } = usePeriodSelector('1W');

  const allActivations = useMemo(() => generateActivationHistory(365), []);
  const activations = useMemo(
    () =>
      allActivations.filter(
        (a) => a.timestamp >= range.start && a.timestamp <= range.end
      ),
    [allActivations, range]
  );

  const totalShifted = activations.reduce(
    (s, a) => s + Math.abs(a.shiftedKwh),
    0
  );
  const capacityRevenue = activations.reduce(
    (s, a) => s + a.capacityPaymentEur,
    0
  );
  const energyRevenue = activations.reduce((s, a) => s + a.energyPaymentEur, 0);
  const imbalanceCost = activations.reduce((s, a) => s + a.imbalanceCostEur, 0);
  const netRevenue = activations.reduce((s, a) => s + a.revenueEur, 0);

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
            label="Total Load Shifted"
            value={Math.round(totalShifted).toLocaleString()}
            unit="kWh"
          />
          <StatCard
            label="DA / ID Cost Savings"
            value={`€${Math.round(netRevenue).toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="Capacity Revenue"
            value={`€${Math.round(capacityRevenue).toLocaleString()}`}
            unit=""
          />
          <StatCard
            label="Net Revenue"
            value={`€${Math.round(netRevenue).toLocaleString()}`}
            unit=""
          />
        </div>
      )}

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
    </div>
  );
}
