export const GamePhase = {
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  CRASHED: 'CRASHED',
} as const;
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export interface PlayerInfo {
  id: string;
  name: string;
  betAmount: number;
  cashedOut: boolean;
  cashOutMultiplier?: number;
}
