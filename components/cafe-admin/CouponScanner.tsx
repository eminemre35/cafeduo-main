import React, { useMemo } from 'react';
import { CheckCircle, Coffee, QrCode, XCircle } from 'lucide-react';
import { RetroButton } from '../RetroButton';
import type { CafeCouponStatus, CouponItem } from './types';

interface CouponScannerProps {
  couponCode: string;
  onCouponCodeChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  status: CafeCouponStatus;
  message: string;
  submitting: boolean;
  lastItem: CouponItem | null;
}

export const CouponScanner: React.FC<CouponScannerProps> = ({
  couponCode,
  onCouponCodeChange,
  onSubmit,
  status,
  message,
  submitting,
  lastItem,
}) => {
  const lastItemTitle = useMemo(
    () => String(lastItem?.item_title || lastItem?.itemTitle || 'Bilinmiyor'),
    [lastItem]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border-2 border-carbon bg-paper riso-shadow-sm p-8 shadow-xl">
        <p className="font-riso-mono text-xs uppercase tracking-[0.18em] text-carbon-soft mb-3">
          Kupon Doğrulama
        </p>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <QrCode className="text-blue-400" />
          Kupon Kullan
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="coupon-code-input"
              className="block text-sm font-medium text-carbon-muted mb-2 uppercase tracking-[0.08em]"
            >
              Kupon Kodu
            </label>
            <input
              id="coupon-code-input"
              type="text"
              value={couponCode}
              onChange={(event) => onCouponCodeChange(event.target.value.toUpperCase())}
              placeholder="Kupon kodunu girin..."
              className="border-2 border-carbon bg-paper w-full px-4 py-3 text-white placeholder:text-carbon-muted outline-none transition-all font-mono text-lg tracking-wider"
            />
          </div>

          <RetroButton type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? 'DOĞRULANIYOR...' : 'KUPONU ONAYLA'}
          </RetroButton>
        </form>

        {status !== 'idle' && (
          <div
            className={`mt-6 p-4 border flex items-center gap-3 ${
              status === 'success'
                ? 'bg-green-900/20 border-green-700/50 text-riso-spring'
                : 'bg-riso-redox/15 border-red-700/50 text-riso-redox'
            }`}
            role="status"
            aria-live="polite"
          >
            {status === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            <p className="font-medium">{message}</p>
          </div>
        )}
      </div>

      <div className="border-2 border-carbon bg-paper-deep p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl" />
        <h2 className="text-xl font-bold text-white mb-6">Son İşlem Detayı</h2>

        {lastItem ? (
          <div className="space-y-4">
            <div className="p-4 bg-black/30 border border-cyan-800/35">
              <div className="text-sm text-carbon-muted mb-1">Ürün</div>
              <div className="text-lg font-bold text-white">{lastItemTitle}</div>
            </div>
            <div className="p-4 bg-black/30 border border-cyan-800/35">
              <div className="text-sm text-carbon-muted mb-1">Kupon Kodu</div>
              <div className="text-lg font-mono text-riso-mustard-deep tracking-wider">
                {lastItem.code}
              </div>
            </div>
            <div className="p-4 bg-black/30 border border-cyan-800/35">
              <div className="text-sm text-carbon-muted mb-1">İşlem Zamanı</div>
              <div className="text-white">{new Date().toLocaleString('tr-TR')}</div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-carbon-muted py-12">
            <div className="w-16 h-16 bg-[#07142b]/75 border border-cyan-800/40 flex items-center justify-center mb-4">
              <Coffee size={24} className="opacity-50" />
            </div>
            <p>Henüz işlem yapılmadı</p>
          </div>
        )}
      </div>
    </div>
  );
};
