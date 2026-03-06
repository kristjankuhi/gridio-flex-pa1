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
import { usePriceTableState } from '@/hooks/usePriceTableState';
import { runSimulation } from '@/data/simulation';
import { generateHistoricLoad, generateForecastLoad } from '@/data/generators';
import { usePriceCurve } from '@/store/priceCurveStore';
import type { SimulationResult } from '@/types';

export function FlexEditor() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);

  const {
    rows,
    baseBlocks,
    setInput,
    clearInputs,
    getEditedBlocks,
    hasChanges,
  } = usePriceTableState(selectedDate);
  const { saveVersion } = usePriceCurve();

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

  function handleSimulate() {
    if (!selectedDate) return;
    const editedBlocks = getEditedBlocks();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const forecastBlocks = generateForecastLoad(2).filter(
      (b) => format(b.timestamp, 'yyyy-MM-dd') === dateStr
    );
    if (forecastBlocks.length === 0) {
      const historicBlocks = generateHistoricLoad(1).filter(
        (b) => format(b.timestamp, 'yyyy-MM-dd') === dateStr
      );
      setSimulationResult(runSimulation(historicBlocks, editedBlocks));
    } else {
      setSimulationResult(runSimulation(forecastBlocks, editedBlocks));
    }
  }

  function handleSave() {
    const editedBlocks = getEditedBlocks();
    saveVersion(editedBlocks, baseBlocks);
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
        <h1 className="text-xl font-semibold mb-1">Flex Editor</h1>
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
              {selectedDate
                ? format(selectedDate, 'd MMM yyyy')
                : 'Select date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate ?? undefined}
              onSelect={(date) => {
                setSelectedDate(date ?? null);
                setCalendarOpen(false);
              }}
              disabled={(date) => isBefore(date, startOfDay(new Date()))}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {selectedDate && (
          <span className="text-sm text-muted-foreground">
            {isToday(selectedDate)
              ? 'Today'
              : format(selectedDate, 'EEEE, d MMMM yyyy')}
          </span>
        )}
      </div>

      <PriceTable rows={rows} onInputChange={setInput} onPaste={handlePaste} />

      {selectedDate && (
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
                onClick={handleSimulate}
                disabled={!hasChanges}
              >
                Simulate →
              </Button>
              <Button
                onClick={handleSave}
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
                  onClick={handleSave}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save & Activate
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
