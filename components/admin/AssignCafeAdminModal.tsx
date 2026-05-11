import React from 'react';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
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
  if (!selectedUser) return null;
  const options = cafes.map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      eyebrow="Yetki Devri"
      title="Kafe Yöneticisi Ata"
      size="md"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            İptal
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Yönetici Yap
          </Button>
        </div>
      }
    >
      <p className="text-[0.9375rem] text-[#3D332C] mb-5 leading-relaxed">
        <span className="font-semibold text-[#1C1814]">{selectedUser.username}</span> kullanıcısı,
        seçeceğin kafenin operasyon yetkisini alacak. Bu işlem rolünü{' '}
        <span className="cc-mono text-[0.875rem] text-[#843D17]">cafe_admin</span> olarak günceller.
      </p>
      <Select
        label="Kafe"
        required
        value={selectedCafeId}
        options={options}
        onChange={onCafeChange}
        helper="Bir anda yalnızca bir kafeyi yönetebilir."
      />
    </Modal>
  );
};
