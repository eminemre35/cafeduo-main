import React from 'react';
import { AssignCafeAdminModalProps } from './types';

export const AssignCafeAdminModal: React.FC<AssignCafeAdminModalProps> = ({
  isOpen,
  cafes,
  selectedUser,
  selectedCafeId,
  onCafeChange,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !selectedUser) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[linear-gradient(170deg,rgba(8,14,30,0.96),rgba(10,24,52,0.88))] border border-cyan-400/25 rounded-2xl p-8 max-w-md w-full relative">
        <h2 className="text-2xl font-bold text-white mb-2">Kafe Yöneticisi Ata</h2>
        <p className="text-gray-400 mb-6">
          <span className="text-white font-bold">{selectedUser.username}</span> kullanıcısını hangi kafenin
          yöneticisi yapmak istiyorsunuz?
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Kafe Seç *</label>
            <select
              value={selectedCafeId}
              onChange={(e) => onCafeChange(e.target.value)}
              className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
            >
              {cafes.map((cafe) => (
                <option key={String(cafe.id)} value={String(cafe.id)}>
                  {cafe.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Seçilen kafenin yönetim yetkisi verilecek</p>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              İptal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Yönetici Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

