import type { BidBlock, FlexProduct } from '@/types';

const PRODUCT_LABELS: Record<FlexProduct, string> = {
  fcr: 'FCR',
  afrr: 'aFRR',
  mfrr: 'mFRR',
  'id-balancing': 'ID Balancing',
};

const PRODUCT_COLORS: Record<FlexProduct, string> = {
  fcr: '#10b981',
  afrr: '#3b82f6',
  mfrr: '#8b5cf6',
  'id-balancing': '#f59e0b',
};

interface BidSummaryStripProps {
  blocks: BidBlock[];
}

export function BidSummaryStrip({ blocks }: BidSummaryStripProps) {
  const products: FlexProduct[] = ['fcr', 'afrr', 'mfrr', 'id-balancing'];

  const summaries = products
    .map((product) => {
      const available = blocks.filter(
        (b) => b.product === product && b.isAvailable
      );
      if (available.length === 0) return null;

      const first = available[0];
      const last = available[available.length - 1];
      const startHour = first.timestamp.getHours();
      const endHour = last.timestamp.getHours() + 1;
      const window = `${startHour.toString().padStart(2, '0')}:00–${endHour.toString().padStart(2, '0')}:00`;
      const mw = first.reservedMw;

      return { product, window, mw };
    })
    .filter(Boolean);

  if (summaries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {summaries.map(
        (s) =>
          s && (
            <div
              key={s.product}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs"
              style={{
                borderColor: PRODUCT_COLORS[s.product],
                color: PRODUCT_COLORS[s.product],
              }}
            >
              <span className="font-medium">{PRODUCT_LABELS[s.product]}</span>
              <span className="opacity-70">{s.mw.toFixed(2)} MW</span>
              <span className="opacity-60">{s.window}</span>
            </div>
          )
      )}
    </div>
  );
}
