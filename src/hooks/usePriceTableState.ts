import { useState, useMemo, useCallback } from 'react';
import { isBefore, addMinutes } from 'date-fns';
import { generateBasePriceCurve } from '@/data/generators';
import type { PriceBlock } from '@/types';

export interface TableRow {
  index: number; // 0–95
  timestamp: Date;
  currentPriceEurMwh: number;
  newPriceInput: string; // raw string from input
  isPast: boolean;
  hourIndex: number; // 0–23
}

export function usePriceTableState(selectedDate: Date | null) {
  const [inputs, setInputs] = useState<Record<number, string>>({});

  const baseBlocks = useMemo<PriceBlock[]>(() => {
    if (!selectedDate) return [];
    return generateBasePriceCurve(selectedDate);
  }, [selectedDate]);

  const rows = useMemo<TableRow[]>(() => {
    const now = new Date();
    return baseBlocks.map((block, i) => ({
      index: i,
      timestamp: block.timestamp,
      currentPriceEurMwh: block.priceEurMwh,
      newPriceInput: inputs[i] ?? '',
      isPast: isBefore(addMinutes(block.timestamp, 15), now),
      hourIndex: Math.floor(i / 4),
    }));
  }, [baseBlocks, inputs]);

  const setInput = useCallback((index: number, value: string) => {
    setInputs((prev) => ({ ...prev, [index]: value }));
  }, []);

  const clearInputs = useCallback(() => {
    setInputs({});
  }, []);

  const getEditedBlocks = useCallback((): PriceBlock[] => {
    return baseBlocks.map((block, i) => {
      const raw = inputs[i];
      const parsed = raw ? parseFloat(raw) : null;
      return {
        timestamp: block.timestamp,
        priceEurMwh:
          parsed !== null && !isNaN(parsed) ? parsed : block.priceEurMwh,
      };
    });
  }, [baseBlocks, inputs]);

  const hasChanges = Object.keys(inputs).some((k) => inputs[Number(k)] !== '');

  return {
    rows,
    baseBlocks,
    setInput,
    clearInputs,
    getEditedBlocks,
    hasChanges,
  };
}
