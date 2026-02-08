import React from 'react';
import { AddCafeModalProps } from './types';

export const AddCafeModal: React.FC<AddCafeModalProps> = ({
  isOpen,
  formData,
  onFormChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[linear-gradient(170deg,rgba(8,14,30,0.96),rgba(10,24,52,0.88))] border border-cyan-400/25 rounded-2xl p-8 max-w-md w-full relative">
        <h2 className="text-2xl font-bold text-white mb-6">Yeni Kafe Ekle</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Kafe Adı *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
              placeholder="Örn: Kampüs Kafeterya"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Adres</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => onFormChange({ ...formData, address: e.target.value })}
              className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
              placeholder="Örn: İİBF, Merkez Kampüs"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Toplam Masa Sayısı *</label>
            <input
              type="number"
              value={formData.total_tables}
              onChange={(e) =>
                onFormChange({
                  ...formData,
                  total_tables: Number.parseInt(e.target.value || '0', 10),
                })
              }
              className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">PIN Kodu (4 Haneli) *</label>
            <input
              type="text"
              value={formData.pin}
              onChange={(e) => onFormChange({ ...formData, pin: e.target.value.slice(0, 4) })}
              className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-blue-500 font-mono text-lg"
              placeholder="1234"
              maxLength={4}
            />
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              İptal
            </button>
            <button
              onClick={onSubmit}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

