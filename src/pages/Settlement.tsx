import { useMemo } from 'react';
import { usePeriodSelector } from '@/hooks/usePeriodSelector';
import { PeriodSelector } from '@/components/PeriodSelector';
import { ActivationTable } from '@/components/ActivationTable';
import { StatCard } from '@/components/StatCard';
import {
  generateActivationHistory,
  type ActivationRecord,
} from '@/data/generators';

function exportCsv(activations: ActivationRecord[], label: string) {
  const header =
    'Timestamp,Type,Direction,Requested kW,Delivered kW,Duration min,Baseline kWh,Actual kWh,Shifted kWh,Revenue EUR';
  const rows = activations.map((a) =>
    [
      a.timestamp.toISOString(),
      a.type,
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
  const savings = activations
    .filter((a) => a.type === 'price-curve')
    .reduce((s, a) => s + a.revenueEur, 0);
  const mfrrRevenue = activations
    .filter((a) => a.type === 'mfrr')
    .reduce((s, a) => s + a.revenueEur, 0);
  const total = savings + mfrrRevenue;

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Load Shifted"
          value={Math.round(totalShifted).toLocaleString()}
          unit="kWh"
        />
        <StatCard
          label="DA / ID Cost Savings"
          value={`€${Math.round(savings).toLocaleString()}`}
          unit=""
        />
        <StatCard
          label="mFRR Revenue"
          value={`€${Math.round(mfrrRevenue).toLocaleString()}`}
          unit=""
        />
        <StatCard
          label="Total Earned"
          value={`€${Math.round(total).toLocaleString()}`}
          unit=""
        />
      </div>

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
