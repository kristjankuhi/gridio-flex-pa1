import { format } from 'date-fns';
import type { TableRow } from '@/hooks/usePriceTableState';

interface PriceTableProps {
  rows: TableRow[];
  onInputChange: (index: number, value: string) => void;
  onPaste: (index: number, text: string) => void;
}

export function PriceTable({ rows, onInputChange, onPaste }: PriceTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Select a date to edit the price curve
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card z-10">
          <tr className="border-b border-border">
            <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground w-20">
              Time
            </th>
            <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
              Current (€/MWh)
            </th>
            <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground w-40">
              New Price (€/MWh)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isEvenHour = row.hourIndex % 2 === 0;
            return (
              <tr
                key={row.index}
                className={`border-b border-border/30 ${
                  row.isPast
                    ? 'opacity-35'
                    : isEvenHour
                      ? 'bg-background/40'
                      : 'bg-muted/20'
                }`}
              >
                <td className="py-1.5 px-4 font-mono text-xs text-muted-foreground">
                  {format(row.timestamp, 'HH:mm')}
                </td>
                <td className="py-1.5 px-4 text-right font-mono text-xs">
                  {row.currentPriceEurMwh.toFixed(1)}
                </td>
                <td className="py-1.5 px-4 text-right">
                  {row.isPast ? (
                    <span className="text-xs text-muted-foreground/40 font-mono">
                      —
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      data-row={row.index}
                      value={row.newPriceInput}
                      onChange={(e) => onInputChange(row.index, e.target.value)}
                      onPaste={(e) => {
                        e.preventDefault();
                        onPaste(row.index, e.clipboardData.getData('text'));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          const next = rows.find(
                            (r) => r.index > row.index && !r.isPast
                          );
                          if (next)
                            document
                              .querySelector<HTMLInputElement>(
                                `[data-row="${next.index}"]`
                              )
                              ?.focus();
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          const prev = [...rows]
                            .reverse()
                            .find((r) => r.index < row.index && !r.isPast);
                          if (prev)
                            document
                              .querySelector<HTMLInputElement>(
                                `[data-row="${prev.index}"]`
                              )
                              ?.focus();
                        }
                      }}
                      placeholder={row.currentPriceEurMwh.toFixed(1)}
                      className={`w-28 text-right bg-transparent border rounded px-2 py-0.5 text-xs font-mono outline-none transition-colors
                        ${
                          row.newPriceInput
                            ? 'border-primary text-primary'
                            : 'border-border/50 text-foreground hover:border-border focus:border-primary'
                        }`}
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
