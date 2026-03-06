import { useState } from 'react';
import { format, isToday, isBefore, startOfDay } from 'date-fns';
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
import { usePriceTableState } from '@/hooks/usePriceTableState';
import { api } from '@/api/client';
import type { SimulationResult } from '@/types';

export function PriceEditor() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { rows, setInput, clearInputs, getEditedBlocks, hasChanges } =
    usePriceTableState(selectedDate);

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Price Editor</h1>
        <p className="text-sm text-muted-foreground">
          Adjust the price curve to shift EV charging load
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-44 justify-start text-sm font-normal"
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

        <span className="text-sm text-muted-foreground">
          {isToday(selectedDate)
            ? 'Today'
            : format(selectedDate, 'EEEE, d MMMM yyyy')}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHistoryOpen(true)}
        >
          History
        </Button>
      </div>

      <PriceTable rows={rows} onInputChange={setInput} onPaste={handlePaste} />

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

      <VersionHistoryPanel
        open={historyOpen}
        date={format(selectedDate, 'yyyy-MM-dd')}
        onClose={() => setHistoryOpen(false)}
        onRestore={() => {}}
      />
    </div>
  );
}
