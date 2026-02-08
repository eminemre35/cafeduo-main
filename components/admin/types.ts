import { Cafe, User } from '../../types';

export type AdminRole = 'user' | 'admin' | 'cafe_admin';

export interface AdminUserFormData {
  username: string;
  email: string;
  password: string;
  department: string;
  role: AdminRole;
  cafe_id: string;
}

export interface AdminCafeFormData {
  name: string;
  address: string;
  total_tables: number;
  pin: string;
}

export interface AdminCafeEditData {
  address: string;
  total_tables: number;
  pin: string;
}

export interface AdminGameRow {
  id: number;
  host_name: string;
  guest_name: string | null;
  game_type: string;
  status: string;
  created_at: string;
  cafe_name?: string | null;
  table_code?: string | null;
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
  onFormChange: (next: AdminCafeFormData) => void;
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

