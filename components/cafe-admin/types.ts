import type { Reward, Cafe } from '../../types';

export type CafeAdminTab = 'verification' | 'rewards' | 'tournaments' | 'settings';

export type CafeCouponStatus = 'idle' | 'success' | 'error';
export type CafeLocationStatus = 'idle' | 'success' | 'error';

export interface CouponItem {
  id?: number;
  code: string;
  item_title?: string;
  itemTitle?: string;
  user_id?: number;
  username?: string;
  used_at?: string;
  usedAt?: string;
}

export interface RewardFormData {
  title: string;
  cost: number;
  description: string;
  icon: Reward['icon'];
}

export interface CafeDashboardStats {
  rewardCount: number;
  locationSummary: string;
  lastCouponCode: string | null;
}

export interface CafeInfoState {
  cafe: Cafe | null;
  latitude: number | null;
  longitude: number | null;
  radius: number;
  secondaryLatitude?: number | null;
  secondaryLongitude?: number | null;
  secondaryRadius?: number | null;
}


/**
 * Form state for the admin TournamentManager. Mirrors the body shape
 * accepted by POST /api/tournaments but with strings for the form inputs.
 */
export interface TournamentTierForm {
  rank: number;
  rewardId: number | null;
}

export interface TournamentFormData {
  name: string;
  gameType: string;  // '' means 'all games count'
  startAt: string;   // <input type="datetime-local"> value
  endAt: string;
  tiers: TournamentTierForm[];
}
