export interface ActivationRecord {
  id: string;
  timestamp: Date;
  type: 'price-curve' | 'mfrr';
  direction: 'up' | 'down' | null;
  requestedKw: number | null;
  deliveredKw: number | null;
  durationMin: number;
  baselineKwh: number;
  actualKwh: number;
  shiftedKwh: number;
  revenueEur: number;
}

function daysAgo(days: number, hour = 0, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const activations: ActivationRecord[] = [
  {
    id: 'act_001',
    timestamp: daysAgo(7, 9, 0),
    type: 'mfrr',
    direction: 'up',
    requestedKw: 2100,
    deliveredKw: 2050,
    durationMin: 45,
    baselineKwh: 840,
    actualKwh: 303,
    shiftedKwh: 537,
    revenueEur: 385.5,
  },
  {
    id: 'act_002',
    timestamp: daysAgo(7, 14, 30),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 60,
    baselineKwh: 420,
    actualKwh: 280,
    shiftedKwh: 140,
    revenueEur: 18.2,
  },
  {
    id: 'act_003',
    timestamp: daysAgo(6, 8, 15),
    type: 'mfrr',
    direction: 'down',
    requestedKw: 1800,
    deliveredKw: 1800,
    durationMin: 30,
    baselineKwh: 315,
    actualKwh: 540,
    shiftedKwh: 225,
    revenueEur: 162.0,
  },
  {
    id: 'act_004',
    timestamp: daysAgo(6, 17, 0),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 90,
    baselineKwh: 630,
    actualKwh: 378,
    shiftedKwh: 252,
    revenueEur: 32.8,
  },
  {
    id: 'act_005',
    timestamp: daysAgo(5, 7, 45),
    type: 'mfrr',
    direction: 'up',
    requestedKw: 2200,
    deliveredKw: 2150,
    durationMin: 60,
    baselineKwh: 840,
    actualKwh: 194,
    shiftedKwh: 646,
    revenueEur: 410.2,
  },
  {
    id: 'act_006',
    timestamp: daysAgo(5, 12, 0),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 45,
    baselineKwh: 315,
    actualKwh: 210,
    shiftedKwh: 105,
    revenueEur: 13.7,
  },
  {
    id: 'act_007',
    timestamp: daysAgo(4, 10, 30),
    type: 'mfrr',
    direction: 'up',
    requestedKw: 1900,
    deliveredKw: 1875,
    durationMin: 45,
    baselineKwh: 630,
    actualKwh: 236,
    shiftedKwh: 394,
    revenueEur: 298.4,
  },
  {
    id: 'act_008',
    timestamp: daysAgo(4, 19, 0),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 60,
    baselineKwh: 420,
    actualKwh: 252,
    shiftedKwh: 168,
    revenueEur: 21.8,
  },
  {
    id: 'act_009',
    timestamp: daysAgo(3, 8, 0),
    type: 'mfrr',
    direction: 'down',
    requestedKw: 2000,
    deliveredKw: 2000,
    durationMin: 30,
    baselineKwh: 280,
    actualKwh: 560,
    shiftedKwh: 280,
    revenueEur: 196.0,
  },
  {
    id: 'act_010',
    timestamp: daysAgo(3, 15, 15),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 75,
    baselineKwh: 525,
    actualKwh: 367,
    shiftedKwh: 158,
    revenueEur: 20.5,
  },
  {
    id: 'act_011',
    timestamp: daysAgo(2, 9, 0),
    type: 'mfrr',
    direction: 'up',
    requestedKw: 2100,
    deliveredKw: 2080,
    durationMin: 60,
    baselineKwh: 840,
    actualKwh: 188,
    shiftedKwh: 652,
    revenueEur: 398.7,
  },
  {
    id: 'act_012',
    timestamp: daysAgo(2, 14, 0),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 60,
    baselineKwh: 420,
    actualKwh: 294,
    shiftedKwh: 126,
    revenueEur: 16.4,
  },
  {
    id: 'act_013',
    timestamp: daysAgo(1, 8, 30),
    type: 'mfrr',
    direction: 'up',
    requestedKw: 1950,
    deliveredKw: 1920,
    durationMin: 45,
    baselineKwh: 630,
    actualKwh: 198,
    shiftedKwh: 432,
    revenueEur: 316.8,
  },
  {
    id: 'act_014',
    timestamp: daysAgo(1, 13, 0),
    type: 'price-curve',
    direction: null,
    requestedKw: null,
    deliveredKw: null,
    durationMin: 90,
    baselineKwh: 630,
    actualKwh: 441,
    shiftedKwh: 189,
    revenueEur: 24.6,
  },
  {
    id: 'act_015',
    timestamp: daysAgo(0, 7, 0),
    type: 'mfrr',
    direction: 'down',
    requestedKw: 1800,
    deliveredKw: 1750,
    durationMin: 30,
    baselineKwh: 245,
    actualKwh: 490,
    shiftedKwh: 245,
    revenueEur: 171.5,
  },
];

export function listActivations(): ActivationRecord[] {
  return [...activations].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  );
}

export function getActivationById(id: string): ActivationRecord | undefined {
  return activations.find((a) => a.id === id);
}

export function filterActivations(opts: {
  from?: Date;
  to?: Date;
  type?: 'price-curve' | 'mfrr';
}): ActivationRecord[] {
  return listActivations().filter((a) => {
    if (opts.from && a.timestamp < opts.from) return false;
    if (opts.to && a.timestamp > opts.to) return false;
    if (opts.type && a.type !== opts.type) return false;
    return true;
  });
}

export function addActivation(record: ActivationRecord): void {
  activations.push(record);
}
