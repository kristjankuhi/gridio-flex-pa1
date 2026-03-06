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
import { usePriceTableState } from '@/hooks/usePriceTableState';

export function FlexEditor() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const {
    rows,
    baseBlocks,
    setInput,
    clearInputs,
    getEditedBlocks,
    hasChanges,
  } = usePriceTableState(selectedDate);

  // suppress unused warning — used by T10
  void baseBlocks;
  void clearInputs;
  void getEditedBlocks;
  void hasChanges;

  function handlePaste(startIndex: number, text: string) {
    const lines = text.trim().split('\n').filter(Boolean);

    lines.forEach((line, offset) => {
      const parts = line.split('\t').map((p) => p.trim().replace(',', '.'));

      let priceStr: string | undefined;
      let targetIndex = startIndex + offset;

      if (parts.length >= 2) {
        // Two-column paste: time + price — match by time
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

      {/* Action bar + simulation — Task 10 */}
    </div>
  );
}
