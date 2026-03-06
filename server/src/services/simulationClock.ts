import { addMinutes } from 'date-fns';

let simulatedNow = new Date();

export function getSimulatedNow(): Date {
  return simulatedNow;
}

export function startSimulationClock(onTick: (now: Date) => void): void {
  onTick(simulatedNow);

  setInterval(
    () => {
      simulatedNow = addMinutes(simulatedNow, 15);
      console.log(`Simulation clock advanced to ${simulatedNow.toISOString()}`);
      onTick(simulatedNow);
    },
    15 * 60 * 1000
  );
}
