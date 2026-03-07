import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ActivationRecord } from '@/types';

interface ActivationTableProps {
  activations: ActivationRecord[];
}

export function ActivationTable({ activations }: ActivationTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'mfrr' | 'id-balancing' | 'fcr' | 'afrr'
  >('all');

  const filtered = activations.filter(
    (a) => filter === 'all' || a.product === filter
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(['all', 'mfrr', 'id-balancing', 'fcr', 'afrr'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filter === f
                ? 'border-primary text-primary bg-primary/10'
                : 'border-border text-muted-foreground hover:border-foreground'
            }`}
          >
            {f === 'all'
              ? 'All'
              : f === 'mfrr'
                ? 'mFRR'
                : f === 'id-balancing'
                  ? 'ID Balancing'
                  : f === 'fcr'
                    ? 'FCR'
                    : 'aFRR'}
          </button>
        ))}
      </div>

      <div className="rounded-md border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-card">
            <tr className="border-b border-border">
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground w-8" />
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">
                Timestamp
              </th>
              <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">
                Product
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Requested kW
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Delivered kW
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Duration
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Baseline kWh
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Actual kWh
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Shifted kWh
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Capacity €
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Energy €
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Imbalance €
              </th>
              <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                Net Revenue
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((act) => (
              <React.Fragment key={act.id}>
                <tr
                  className="border-b border-border/30 hover:bg-muted/20 cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === act.id ? null : act.id)
                  }
                >
                  <td className="py-2 px-4 text-muted-foreground">
                    {expandedId === act.id ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </td>
                  <td className="py-2 px-4 font-mono text-xs">
                    {format(act.timestamp, 'dd MMM HH:mm')}
                  </td>
                  <td className="py-2 px-4">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        act.product === 'mfrr'
                          ? 'text-primary border-primary/30'
                          : act.product === 'fcr'
                            ? 'text-emerald-400 border-emerald-400/30'
                            : act.product === 'afrr'
                              ? 'text-blue-400 border-blue-400/30'
                              : 'text-amber-400 border-amber-400/30'
                      }`}
                    >
                      {act.product === 'mfrr'
                        ? `mFRR ${act.direction ?? ''}`.trim()
                        : act.product === 'fcr'
                          ? 'FCR'
                          : act.product === 'afrr'
                            ? 'aFRR'
                            : 'ID Balancing'}
                    </Badge>
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs">
                    {act.requestedKw?.toLocaleString() ?? '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs">
                    {act.deliveredKw?.toLocaleString() ?? '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs">
                    {act.durationMin} min
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs">
                    {Math.round(act.baselineKwh).toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs">
                    {Math.round(act.actualKwh).toLocaleString()}
                  </td>
                  <td
                    className={`py-2 px-4 text-right font-mono text-xs ${
                      act.direction === 'up' || act.shiftedKwh < 0
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {act.shiftedKwh > 0 ? '+' : ''}
                    {Math.round(act.shiftedKwh).toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs text-emerald-400">
                    {act.capacityPaymentEur > 0
                      ? `€${Math.round(act.capacityPaymentEur).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs text-emerald-400">
                    €{Math.round(act.energyPaymentEur).toLocaleString()}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs text-red-400">
                    {act.imbalanceCostEur > 0.01
                      ? `-€${Math.round(act.imbalanceCostEur).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className="py-2 px-4 text-right font-mono text-xs text-primary">
                    €{Math.round(act.revenueEur).toLocaleString()}
                  </td>
                </tr>
                {expandedId === act.id && (
                  <tr className="bg-muted/10 border-b border-border/30">
                    <td colSpan={13} className="px-8 py-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        15-minute block breakdown
                      </p>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground">
                            <th className="text-left py-1 pr-6">Time</th>
                            <th className="text-right pr-6">Baseline kWh</th>
                            <th className="text-right pr-6">Actual kWh</th>
                            <th className="text-right pr-6">Delta kWh</th>
                            <th className="text-right pr-6">Price €/MWh</th>
                            <th className="text-right pr-6">Cap €</th>
                            <th className="text-right pr-6">Energy €</th>
                            <th className="text-right pr-6">Imbalance €</th>
                            <th className="text-right">Value €</th>
                          </tr>
                        </thead>
                        <tbody>
                          {act.blocks.map((b, i) => (
                            <tr key={i} className="border-t border-border/10">
                              <td className="py-0.5 pr-6 font-mono">
                                {format(b.timestamp, 'HH:mm')}
                              </td>
                              <td className="py-0.5 pr-6 text-right font-mono">
                                {Math.round(b.baselineKwh)}
                              </td>
                              <td className="py-0.5 pr-6 text-right font-mono">
                                {Math.round(b.actualKwh)}
                              </td>
                              <td
                                className={`py-0.5 pr-6 text-right font-mono ${
                                  b.deltaKwh < 0
                                    ? 'text-emerald-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {b.deltaKwh > 0 ? '+' : ''}
                                {Math.round(b.deltaKwh)}
                              </td>
                              <td className="py-0.5 pr-6 text-right font-mono">
                                {b.priceEurMwh.toFixed(1)}
                              </td>
                              <td className="py-0.5 pr-6 text-right font-mono">
                                {b.capacityPaymentEur.toFixed(2)}
                              </td>
                              <td className="py-0.5 pr-6 text-right font-mono">
                                {b.energyPaymentEur.toFixed(2)}
                              </td>
                              <td className="py-0.5 pr-6 text-right font-mono">
                                {b.imbalanceCostEur > 0.001
                                  ? `-${b.imbalanceCostEur.toFixed(2)}`
                                  : '—'}
                              </td>
                              <td className="py-0.5 text-right font-mono text-primary">
                                €{b.valueEur.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
