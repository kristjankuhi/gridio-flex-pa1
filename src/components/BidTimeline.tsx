import { useState, useCallback } from 'react';
import { startOfDay } from 'date-fns';
import type { BidBlock, FlexProduct } from '@/types';

const PRODUCTS: { key: FlexProduct; label: string; color: string }[] = [
  { key: 'fcr', label: 'FCR', color: '#10b981' },
  { key: 'afrr', label: 'aFRR', color: '#3b82f6' },
  { key: 'mfrr', label: 'mFRR', color: '#8b5cf6' },
  { key: 'id-balancing', label: 'ID Balancing', color: '#f59e0b' },
];

interface BidTimelineProps {
  blocks: BidBlock[];
  onSave: (blocks: BidBlock[]) => void;
}

interface PopoverState {
  product: FlexProduct;
  reservedMw: string;
  capacityPrice: string;
  energyPrice: string;
}

const SLOTS = 96;

function slotIndex(timestamp: Date): number {
  const dayStart = startOfDay(timestamp);
  return Math.floor(
    (timestamp.getTime() - dayStart.getTime()) / (15 * 60 * 1000)
  );
}

export function BidTimeline({ blocks, onSave }: BidTimelineProps) {
  const [localBlocks, setLocalBlocks] = useState<BidBlock[]>(blocks);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProduct, setDragProduct] = useState<FlexProduct | null>(null);
  const [dragValue, setDragValue] = useState(true);
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const getBlock = useCallback(
    (product: FlexProduct, idx: number) =>
      localBlocks.find(
        (b) => b.product === product && slotIndex(b.timestamp) === idx
      ),
    [localBlocks]
  );

  const toggleSlot = useCallback(
    (product: FlexProduct, idx: number, value: boolean) => {
      setLocalBlocks((prev) =>
        prev.map((b) =>
          b.product === product && slotIndex(b.timestamp) === idx
            ? { ...b, isAvailable: value }
            : b
        )
      );
      setHasChanges(true);
    },
    []
  );

  const productSummary = PRODUCTS.map(({ key, label, color }) => {
    const available = localBlocks.filter(
      (b) => b.product === key && b.isAvailable
    );
    if (available.length === 0) return null;
    const hoursAvailable = available.length * 0.25;
    const sample = available[0];
    const expCapacity = sample
      ? hoursAvailable * sample.reservedMw * sample.capacityPriceEurMwH
      : 0;
    return {
      key,
      label,
      color,
      hoursAvailable,
      reservedMw: sample?.reservedMw ?? 0,
      capacityPrice: sample?.capacityPriceEurMwH ?? 0,
      energyPrice: sample?.energyPriceEurMwh ?? 0,
      expCapacity,
    };
  }).filter(Boolean);

  const slotLabels = Array.from({ length: SLOTS }, (_, i) => {
    const h = Math.floor(i / 4)
      .toString()
      .padStart(2, '0');
    const m = ((i % 4) * 15).toString().padStart(2, '0');
    return i % 4 === 0 ? `${h}:${m}` : '';
  });

  return (
    <div className="space-y-6">
      {/* Timeline grid */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: '800px' }}>
          {/* Hour labels */}
          <div className="flex mb-1 pl-24">
            {slotLabels.map((label, i) => (
              <div
                key={i}
                style={{ width: `${100 / SLOTS}%` }}
                className="text-xs text-muted-foreground text-center shrink-0 select-none"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Product rows */}
          {PRODUCTS.map(({ key, label, color }) => (
            <div key={key} className="flex items-center mb-1">
              <div
                className="w-24 shrink-0 text-xs font-medium pr-3 text-right select-none"
                style={{ color }}
              >
                {label}
              </div>
              <div
                className="flex flex-1"
                onMouseLeave={() => {
                  if (isDragging && dragProduct === key) {
                    setIsDragging(false);
                    setDragProduct(null);
                  }
                }}
              >
                {Array.from({ length: SLOTS }, (_, i) => {
                  const block = getBlock(key, i);
                  const isAvail = block?.isAvailable ?? false;
                  return (
                    <div
                      key={i}
                      style={{
                        width: `${100 / SLOTS}%`,
                        backgroundColor: isAvail ? color : undefined,
                      }}
                      className={`h-7 shrink-0 border-r border-b border-border/20 cursor-pointer transition-opacity select-none ${
                        isAvail
                          ? 'opacity-80 hover:opacity-100'
                          : 'bg-muted/10 hover:opacity-60'
                      }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                        setDragProduct(key);
                        const newVal = !isAvail;
                        setDragValue(newVal);
                        toggleSlot(key, i, newVal);
                      }}
                      onMouseEnter={() => {
                        if (isDragging && dragProduct === key) {
                          toggleSlot(key, i, dragValue);
                        }
                      }}
                      onMouseUp={() => {
                        setIsDragging(false);
                        setDragProduct(null);
                        // If clicking (not dragging) on an available slot, open popover
                        if (isAvail && block) {
                          setPopover({
                            product: key,
                            reservedMw: String(block.reservedMw),
                            capacityPrice: String(block.capacityPriceEurMwH),
                            energyPrice: String(block.energyPriceEurMwh),
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Click and drag to mark availability windows. Click an active slot to
        edit bid prices.
      </p>

      {/* Bid price popover */}
      {popover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setPopover(null)}
        >
          <div
            className="bg-card border border-border rounded-lg p-5 w-80 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold">
              {PRODUCTS.find((p) => p.key === popover.product)?.label} — Bid
              Prices
            </h3>
            <p className="text-xs text-muted-foreground">
              Applied to all availability windows for this product today.
            </p>
            {[
              {
                label: 'Reserved MW',
                field: 'reservedMw' as const,
                unit: 'MW',
              },
              {
                label: 'Capacity Price',
                field: 'capacityPrice' as const,
                unit: '€/MW/h',
              },
              {
                label: 'Energy Bid Price',
                field: 'energyPrice' as const,
                unit: '€/MWh',
              },
            ].map(({ label, field, unit }) => (
              <div key={field} className="flex items-center gap-3">
                <label className="text-xs text-muted-foreground flex-1">
                  {label}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={popover[field]}
                  onChange={(e) =>
                    setPopover((p) =>
                      p ? { ...p, [field]: e.target.value } : null
                    )
                  }
                  className="w-24 bg-background border border-border rounded px-2 py-1 text-xs text-right font-mono"
                />
                <span className="text-xs text-muted-foreground w-14">
                  {unit}
                </span>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPopover(null)}
                className="flex-1 text-xs px-3 py-2 border border-border rounded hover:bg-muted/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const mw = parseFloat(popover.reservedMw);
                  const cap = parseFloat(popover.capacityPrice);
                  const en = parseFloat(popover.energyPrice);
                  if (isNaN(mw) || isNaN(cap) || isNaN(en)) return;
                  setLocalBlocks((prev) =>
                    prev.map((b) =>
                      b.product === popover.product
                        ? {
                            ...b,
                            reservedMw: mw,
                            capacityPriceEurMwH: cap,
                            energyPriceEurMwh: en,
                          }
                        : b
                    )
                  );
                  setHasChanges(true);
                  setPopover(null);
                }}
                className="flex-1 text-xs px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Apply to all windows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Per-product summary table */}
      {productSummary.length > 0 && (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 text-xs font-medium text-muted-foreground">
                  Product
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  Hours Available
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  Reserved MW
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  Capacity Price
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  Energy Price
                </th>
                <th className="text-right py-2 px-4 text-xs font-medium text-muted-foreground">
                  Exp. Capacity Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {productSummary.map(
                (p) =>
                  p && (
                    <tr key={p.key} className="border-b border-border/30">
                      <td
                        className="py-2 px-4 font-medium"
                        style={{ color: p.color }}
                      >
                        {p.label}
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {p.hoursAvailable.toFixed(1)}h
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        {p.reservedMw.toFixed(2)} MW
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        €{p.capacityPrice.toFixed(2)}/MW/h
                      </td>
                      <td className="py-2 px-4 text-right font-mono">
                        €{p.energyPrice.toFixed(0)}/MWh
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-primary">
                        €{p.expCapacity.toFixed(0)}
                      </td>
                    </tr>
                  )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2 border-t border-border">
        <button
          disabled={!hasChanges}
          onClick={() => {
            onSave(localBlocks);
            setHasChanges(false);
          }}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Save Bids
        </button>
      </div>
    </div>
  );
}
