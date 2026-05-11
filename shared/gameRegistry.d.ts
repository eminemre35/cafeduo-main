/**
 * Type definitions for shared/gameRegistry.js.
 */

export type GameMode = 'aim' | 'quiz' | 'chess';

export interface GameRegistryEntry {
  type: string;
  mode: GameMode;
  /** Null for endless games (chess). */
  maxRounds: number | null;
  minPoints: number;
  submissionKeyPrefix: string;
  category: string;
  description: string;
}

export const AIM_GAME_TYPE: string;
export const QUIZ_GAME_TYPE: string;
export const CHESS_GAME_TYPE: string;

export const GAME_REGISTRY: Record<string, GameRegistryEntry>;
export const SUPPORTED_GAME_TYPES: Set<string>;
export const GAME_TYPE_LIST: GameRegistryEntry[];
export const GAME_TYPE_ALIASES: Record<string, string>;
