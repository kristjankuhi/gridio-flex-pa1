import { useState, useEffect } from 'react';
import { format, isToday, isBefore, startOfDay, addDays } from 'date-fns';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { PriceTable } from '@/components/PriceTable';
import { SimulationChart } from '@/components/SimulationChart';
import { VersionHistoryPanel } from '@/components/VersionHistoryPanel';
import { BidTimeline } from '@/components/BidTimeline';
import { usePriceTableState } from '@/hooks/usePriceTableState';
import { api } from '@/api/client';
import { useSettings } from '@/store/settingsStore';
import type { SimulationResult, PriceReferenceBlock, BidBlock } from '@/types';

export function PriceEditor() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { settings } = useSettings();
  const [refPrices, setRefPrices] = useState<PriceReferenceBlock[]>([]);
  const [bidBlocks, setBidBlocks] = useState<BidBlock[]>([]);
  const [showDA, setShowDA] = useState(true);
  const [showID, setShowID] = useState(false);
  const [showMFRR, setShowMFRR] = useState(false);

  const { rows, setInput, clearInputs, getEditedBlocks, hasChanges } =
    usePriceTableState(selectedDate);

  useEffect(() => {
    if (!settings.flex2Enabled) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    api.bids
      .get(dateStr)
      .then((blocks) =>
        setBidBlocks(
          blocks.map((b) => ({
            ...b,
            timestamp: new Date(b.timestamp as unknown as string),
          }))
        )
      )
      .catch(console.error);
  }, [selectedDate, settings.flex2Enabled]);

  async function handleSaveBids(blocks: BidBlock[]) {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await api.bids.save(dateStr, blocks);
  }

  useEffect(() => {
    if (settings.flex2Enabled) return; // Flex 2.0 mode uses bid manager instead
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    api.market
      .referencePrices(dateStr)
      .then((blocks) =>
        setRefPrices(
          blocks.map((b) => ({
            ...b,
            timestamp: new Date(b.timestamp as unknown as string),
          }))
        )
      )
      .catch(console.error);
  }, [selectedDate, settings.flex2Enabled]);

  function handlePaste(startIndex: number, text: string) {
    const lines = text.trim().split('\n').filter(Boolean);

    lines.forEach((line, offset) => {
      const parts = line.split('\t').map((p) => p.trim().replace(',', '.'));

      let priceStr: string | undefined;
      let targetIndex = startIndex + offset;

      if (parts.length >= 2) {
        const timeStr = parts[0];
        const matchedRow = rows.find(
          (r) => format(r.timestamp, 'HH:mm') === timeStr
        );
        if (matchedRow) {
          targetIndex = matchedRow.index;
          priceStr = parts[1];
        }
      } else {
        priceStr = parts[0];
      }

      if (!priceStr) return;
      const targetRow = rows[targetIndex];
      if (!targetRow || targetRow.isPast) return;

      const parsed = parseFloat(priceStr);
      if (!isNaN(parsed) && parsed >= 0) {
        setInput(targetIndex, priceStr);
      }
    });
  }

  async function handleSimulate() {
    const editedBlocks = getEditedBlocks();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const result = await api.simulation.run(dateStr, editedBlocks);
    setSimulationResult({
      baseline: result.baseline.map((b) => ({
        ...b,
        timestamp: new Date(b.timestamp),
      })),
      projected: result.projected.map((b) => ({
        ...b,
        timestamp: new Date(b.timestamp),
      })),
    });
  }

  async function handleSave() {
    const editedBlocks = getEditedBlocks();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    await api.priceCurve.save(dateStr, editedBlocks);
    clearInputs();
    setSimulationResult(null);
  }

  function handleDiscard() {
    clearInputs();
    setSimulationResult(null);
  }

  // ELIA mFRR R3 D-1 gate: closes at 15:00 CET (approximated as local 15:00).
  // After gate close, D+1 nominations are locked — only D+2 bids can be edited.
  const now = new Date();
  const gateClose = new Date(now);
  gateClose.setHours(15, 0, 0, 0);
  const gateIsOpen = now < gateClose;
  const gateDiffMs = gateClose.getTime() - now.getTime();
  const gateInfo = gateIsOpen
    ? {
        label: `Gate open — D-1 deadline in ${Math.floor(gateDiffMs / 3600000)}h ${Math.floor((gateDiffMs % 3600000) / 60000)}m (15:00 CET)`,
        color: 'text-emerald-400',
      }
    : {
        label:
          'Gate closed — D-1 bids locked · editing D+1 (next gate 15:00 tomorrow)',
        color: 'text-amber-400',
      };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">
          {settings.flex2Enabled ? 'Bid Manager' : 'Price Curve'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {settings.flex2Enabled
            ? 'Submit availability windows and bid prices for grid balancing products'
            : 'Adjust the price curve to shift EV charging load'}
        </p>
        {settings.flex2Enabled && (
          <p className={`text-xs mt-1 ${gateInfo.color}`}>{gateInfo.label}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-36 justify-start text-sm font-normal"
            >
              {format(selectedDate, 'd MMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) setSelectedDate(date);
                setCalendarOpen(false);
              }}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-0.5">
          {[
            { label: 'Today', date: new Date() },
            { label: 'Tmrw', date: addDays(new Date(), 1) },
            { label: '+2d', date: addDays(new Date(), 2) },
          ].map(({ label, date }) => {
            const active =
              startOfDay(selectedDate).getTime() === startOfDay(date).getTime();
            return (
              <button
                key={label}
                onClick={() => setSelectedDate(date)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-muted-foreground">
          {isToday(selectedDate)
            ? ''
            : format(selectedDate, 'EEEE, d MMMM yyyy')}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => setHistoryOpen(true)}
        >
          History
        </Button>
      </div>

      {!settings.flex2Enabled && refPrices.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Market Reference Prices</h3>
              <p className="text-xs text-muted-foreground">
                Reference context for setting your price curve
              </p>
            </div>
            <div className="flex gap-2">
              {(
                [
                  {
                    key: 'da',
                    label: 'DA Spot',
                    show: showDA,
                    set: setShowDA,
                    color: '#f59e0b',
                  },
                  {
                    key: 'id',
                    label: 'ID Forecast',
                    show: showID,
                    set: setShowID,
                    color: '#60a5fa',
                  },
                  {
                    key: 'mfrr',
                    label: 'mFRR Ref',
                    show: showMFRR,
                    set: setShowMFRR,
                    color: '#a78bfa',
                  },
                ] satisfies {
                  key: string;
                  label: string;
                  show: boolean;
                  set: (v: boolean) => void;
                  color: string;
                }[]
              ).map(({ key, label, show, set, color }) => (
                <button
                  key={key}
                  onClick={() => set(!show)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    show
                      ? 'border-current'
                      : 'border-border text-muted-foreground'
                  }`}
                  style={show ? { color, borderColor: color } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ReferenceOverlayChart
            blocks={refPrices}
            showDA={showDA}
            showID={showID}
            showMFRR={showMFRR}
          />
        </div>
      )}

      {settings.flex2Enabled ? (
        bidBlocks.length > 0 ? (
          <BidTimeline
            blocks={bidBlocks}
            onSave={(b) => void handleSaveBids(b)}
          />
        ) : (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Loading bid timeline…
          </div>
        )
      ) : (
        <>
          <PriceTable
            rows={rows}
            onInputChange={setInput}
            onPaste={handlePaste}
          />

          <div className="space-y-6">
            <div className="flex items-center justify-between border-t border-border pt-6">
              <Button
                variant="ghost"
                onClick={handleDiscard}
                disabled={!hasChanges && !simulationResult}
              >
                Discard changes
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => void handleSimulate()}
                  disabled={!hasChanges}
                >
                  Simulate →
                </Button>
                <Button
                  onClick={() => void handleSave()}
                  disabled={!hasChanges}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save & Activate
                </Button>
              </div>
            </div>

            {simulationResult && (
              <div className="bg-card border border-border rounded-lg p-6">
                <SimulationChart result={simulationResult} />
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <Button variant="ghost" onClick={handleDiscard}>
                    Discard
                  </Button>
                  <Button
                    onClick={() => void handleSave()}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Save & Activate
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <VersionHistoryPanel
        open={historyOpen}
        date={format(selectedDate, 'yyyy-MM-dd')}
        onClose={() => setHistoryOpen(false)}
        onRestore={() => {}}
      />
    </div>
  );
}

interface ReferenceOverlayChartProps {
  blocks: PriceReferenceBlock[];
  showDA: boolean;
  showID: boolean;
  showMFRR: boolean;
}

function ReferenceOverlayChart({
  blocks,
  showDA,
  showID,
  showMFRR,
}: ReferenceOverlayChartProps) {
  const data = blocks.map((b) => ({
    label: format(b.timestamp, 'HH:mm'),
    da: b.daSpotEurMwh,
    id: b.idForecastEurMwh,
    mfrr: b.mfrrRefEurMwh,
  }));

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(222 47% 18%)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `€${v}`}
            width={48}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(222 47% 10%)',
              border: '1px solid hsl(222 47% 18%)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#e2e8f0',
            }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          {showDA && (
            <Line
              type="monotone"
              dataKey="da"
              name="DA Spot"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          )}
          {showID && (
            <Line
              type="monotone"
              dataKey="id"
              name="ID Forecast"
              stroke="#60a5fa"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
          )}
          {showMFRR && (
            <Line
              type="monotone"
              dataKey="mfrr"
              name="mFRR Ref"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
