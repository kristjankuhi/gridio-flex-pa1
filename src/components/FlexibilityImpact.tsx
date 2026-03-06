import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  ReferenceLine,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { generateActivationHistory } from '@/data/generators';
import type { PeriodRange, TimeWindow } from '@/types';

const GREEN = '#10b981';
const RED = '#ef4444';

interface FlexibilityImpactProps {
  range: PeriodRange;
  timeWindow: TimeWindow;
}

export function FlexibilityImpact({
  range,
  timeWindow,
}: FlexibilityImpactProps) {
  const activations = useMemo(
    () =>
      generateActivationHistory(365).filter(
        (a) => a.timestamp >= range.start && a.timestamp <= range.end
      ),
    [range]
  );

  if (activations.length === 0) return null;

  const totalShifted = activations.reduce(
    (s, a) => s + Math.abs(a.shiftedKwh),
    0
  );
  const totalSavings = activations
    .filter((a) => a.type === 'price-curve')
    .reduce((s, a) => s + a.revenueEur, 0);
  const totalMfrrRevenue = activations
    .filter((a) => a.type === 'mfrr')
    .reduce((s, a) => s + a.revenueEur, 0);

  const deltaData = activations
    .flatMap((a) =>
      a.blocks.map((b) => ({
        label: format(b.timestamp, timeWindow === '1D' ? 'HH:mm' : 'd MMM'),
        deltaKwh: Math.round(b.deltaKwh),
      }))
    )
    .slice(0, 200);

  const kpis = [
    {
      label: 'Load Shifted',
      value: `${Math.round(totalShifted).toLocaleString()} kWh`,
      sub: 'vs baseline',
    },
    {
      label: 'Cost Savings',
      value: `€${Math.round(totalSavings).toLocaleString()}`,
      sub: 'DA / ID optimisation',
    },
    {
      label: 'mFRR Revenue',
      value: `€${Math.round(totalMfrrRevenue).toLocaleString()}`,
      sub: `${activations.filter((a) => a.type === 'mfrr').length} activations`,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4">
      <h3 className="text-sm font-medium">Flexibility Impact</h3>

      <div className="grid grid-cols-3 gap-4">
        {kpis.map(({ label, value, sub }) => (
          <div key={label} className="bg-muted/30 rounded-md p-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="h-20">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={deltaData}
            margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
          >
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222 47% 10%)',
                border: '1px solid hsl(222 47% 18%)',
                borderRadius: '6px',
                fontSize: '11px',
              }}
              formatter={(v: number | undefined) => [
                v !== undefined ? `${v > 0 ? '+' : ''}${v} kWh` : '',
                'Shift vs baseline',
              ]}
            />
            <Bar dataKey="deltaKwh" maxBarSize={8} radius={[1, 1, 0, 0]}>
              {deltaData.map((entry, i) => (
                <Cell key={i} fill={entry.deltaKwh >= 0 ? GREEN : RED} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
