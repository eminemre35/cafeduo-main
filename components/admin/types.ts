import { AdminGameRow, Cafe, User } from '../../types';

export type { AdminGameRow };

export type AdminRole = 'user' | 'admin' | 'cafe_admin';

export interface AdminUserFormData {
  username: string;
  email: string;
  password: string;
  department: string;
  role: AdminRole;
  cafe_id: string;
}

/** PR #36 — slice on the daily reward wheel. weights need not sum to a
 *  particular total; backend normalizes them on spin. */
export interface RewardWheelSlice {
  points: number;
  weight: number;
}

export interface AdminCafeFormData {
  name: string;
  address: string;
  total_tables: number;
  latitude: string;
  longitude: string;
  radius: number;
  secondaryLatitude: string;
  secondaryLongitude: string;
  secondaryRadius: number;
  /** PR #36 per-cafe knobs */
  dailyGameLimit?: number;
  dailyRewardWheel?: RewardWheelSlice[];
}

export interface AdminCafeEditData {
  address: string;
  total_tables: number;
  latitude: string;
  longitude: string;
  radius: number;
  secondaryLatitude: string;
  secondaryLongitude: string;
  secondaryRadius: number;
  /** PR #36 per-cafe knobs */
  dailyGameLimit?: number;
  dailyRewardWheel?: RewardWheelSlice[];
}

export type AdminUserRow = User;

export interface AddUserModalProps {
  isOpen: boolean;
  cafes: Cafe[];
  isSubmitting: boolean;
  formData: AdminUserFormData;
  onFormChange: (next: AdminUserFormData) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export interface AddCafeModalProps {
  isOpen: boolean;
  formData: AdminCafeFormData;
  onFormChange: (
    next: AdminCafeFormData | ((current: AdminCafeFormData) => AdminCafeFormData)
  ) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export interface AssignCafeAdminModalProps {
  isOpen: boolean;
  cafes: Cafe[];
  selectedUser: AdminUserRow | null;
  selectedCafeId: string;
  onCafeChange: (nextCafeId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}
