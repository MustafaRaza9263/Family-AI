import type { CardState } from './components/generation-status';

/** Status line for video cards (queued keeps the minutes hint). */
export function videoStatusPlain(
  state: CardState,
  position: number | undefined,
  pct = 0,
  regenerating = false,
): string {
  switch (state) {
    case 'queued': {
      const ahead = position && position > 1 ? position - 1 : 0;
      return ahead > 0
        ? `Queued · ${ahead} ahead · Videos can take a few minutes`
        : 'Next up · Videos can take a few minutes';
    }
    case 'preparing':
      return 'Warming up';
    case 'generating':
      return `Generating · ${pct}%`;
    case 'finishing':
      return 'Finishing';
    case 'failed':
      return regenerating
        ? 'Couldn’t regenerate · not counted'
        : 'Couldn’t generate · not counted';
    case 'cancelled':
      return regenerating ? 'Cancelled · not counted' : 'Cancelled';
    default:
      return '';
  }
}
