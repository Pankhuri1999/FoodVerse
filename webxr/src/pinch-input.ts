import { pinchCommit } from './comfort-catalog.js';

type PinchInput = {
  xr: {
    visualAdapters?: { hand?: { left?: unknown; right?: unknown } };
    getSelectState: (side: 'left' | 'right') => { active: boolean };
  };
};

export function pinchStrength(input: PinchInput, side: 'left' | 'right'): number {
  const adapter = input.xr.visualAdapters?.hand?.[side] as { getPinchStrength?: () => number } | undefined;
  if (adapter && typeof adapter.getPinchStrength === 'function') return adapter.getPinchStrength();
  return input.xr.getSelectState(side).active ? 1 : 0;
}

export function handIsPinching(input: PinchInput, ease: number): boolean {
  const commit = pinchCommit(ease);
  return pinchStrength(input, 'left') >= commit || pinchStrength(input, 'right') >= commit;
}
