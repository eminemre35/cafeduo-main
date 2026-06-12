import React from 'react';
import { Coffee, Gift, Plus, Trash2 } from 'lucide-react';
import type { Reward } from '../../types';
import type { RewardFormData } from './types';
import { useConfirm } from '../ui/ConfirmDialog';

interface RewardManagerProps {
  rewards: Reward[];
  rewardsLoading: boolean;
  rewardsError: string | null;
  rewardForm: RewardFormData;
  onRewardFormChange: (next: RewardFormData) => void;
  onCreateReward: () => Promise<void>;
  onDeleteReward: (rewardId: number | string) => Promise<void>;
}

export const RewardManager: React.FC<RewardManagerProps> = ({
  rewards,
  rewardsLoading,
  rewardsError,
  rewardForm,
  onRewardFormChange,
  onCreateReward,
  onDeleteReward,
}) => {
  const { confirm, confirmDialog } = useConfirm();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onCreateReward();
  };

  const handleDelete = async (rewardId: number | string) => {
    const ok = await confirm({
      message: 'Bu ödülü silmek istediğinize emin misiniz?',
      danger: true,
    });
    if (ok) {
      await onDeleteReward(rewardId);
    }
  };

  const inputClass =
    'border-2 border-carbon bg-paper-deep w-full p-3 text-carbon placeholder:text-carbon-muted font-riso-body outline-none focus:bg-paper focus:ring-2 focus:ring-riso-blue focus:ring-offset-2 focus:ring-offset-paper';

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="border-2 border-carbon bg-paper riso-shadow-md p-6 h-fit">
          <p className="font-riso-mono text-xs uppercase tracking-[0.18em] text-carbon-soft mb-2">
            Ödül Entegrasyon
          </p>
          <h2 className="font-riso-display text-xl sm:text-2xl font-bold text-carbon mb-6 flex items-center gap-2 uppercase tracking-wide">
            <Plus className="text-riso-pink-deep" />
            Yeni Ödül Ekle
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="reward-title-input"
                className="block text-sm text-carbon mb-1 uppercase tracking-[0.08em] font-bold font-riso-body"
              >
                Ödül Başlığı
              </label>
              <input
                id="reward-title-input"
                type="text"
                value={rewardForm.title}
                onChange={(event) =>
                  onRewardFormChange({
                    ...rewardForm,
                    title: event.target.value,
                  })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="reward-cost-input"
                className="block text-sm text-carbon mb-1 uppercase tracking-[0.08em] font-bold font-riso-body"
              >
                Puan Bedeli
              </label>
              <input
                id="reward-cost-input"
                type="number"
                value={rewardForm.cost}
                onChange={(event) =>
                  onRewardFormChange({
                    ...rewardForm,
                    cost: Math.max(0, Number(event.target.value || 0)),
                  })
                }
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="reward-description-input"
                className="block text-sm text-carbon mb-1 uppercase tracking-[0.08em] font-bold font-riso-body"
              >
                Açıklama
              </label>
              <textarea
                id="reward-description-input"
                value={rewardForm.description}
                onChange={(event) =>
                  onRewardFormChange({
                    ...rewardForm,
                    description: event.target.value,
                  })
                }
                className={`${inputClass} h-24 resize-none`}
                required
              />
            </div>
            <div>
              <label
                htmlFor="reward-icon-input"
                className="block text-sm text-carbon mb-1 uppercase tracking-[0.08em] font-bold font-riso-body"
              >
                İkon Tipi
              </label>
              <select
                id="reward-icon-input"
                value={rewardForm.icon}
                onChange={(event) =>
                  onRewardFormChange({
                    ...rewardForm,
                    icon: event.target.value as RewardFormData['icon'],
                  })
                }
                className={inputClass}
              >
                <option value="coffee">Kahve</option>
                <option value="dessert">Tatlı</option>
                <option value="discount">İndirim</option>
                <option value="game">Oyun</option>
              </select>
            </div>
            <button
              type="submit"
              className="riso-focus riso-press w-full bg-riso-pink text-carbon font-riso-display font-bold py-3 border-2 border-carbon riso-shadow-md transition-all uppercase tracking-[0.08em]"
            >
              Ödülü Oluştur
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4" aria-busy={rewardsLoading} aria-live="polite">
          <h2 className="font-riso-display text-xl sm:text-2xl font-bold text-carbon mb-4 uppercase tracking-wide">
            Aktif Ödüller
          </h2>
          {rewardsError && (
            <div className="p-4 border-2 border-carbon text-carbon bg-riso-redox/25 font-riso-body">
              {rewardsError}
            </div>
          )}
          {!rewardsError && rewards.length === 0 && !rewardsLoading ? (
            <div className="text-center py-12 text-carbon-muted border-2 border-dashed border-carbon-muted bg-paper-deep">
              <Gift size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-riso-body uppercase tracking-wide">Henüz ödül eklenmemiş.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className="border-2 border-carbon bg-paper riso-shadow-sm p-4 flex justify-between items-start gap-3 group hover:-translate-y-[1px] transition-transform"
                >
                  <div className="flex gap-4 min-w-0">
                    <div className="w-12 h-12 bg-riso-mustard border-2 border-carbon flex items-center justify-center text-carbon shrink-0">
                      {reward.icon === 'coffee' && <Coffee size={24} />}
                      {reward.icon === 'dessert' && <Gift size={24} />}
                      {reward.icon === 'discount' && <span className="text-xl font-bold">%</span>}
                      {reward.icon === 'game' && <span className="text-xl">🎮</span>}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-carbon font-riso-display uppercase tracking-wide truncate">
                        {reward.title}
                      </h3>
                      <p className="text-sm text-carbon-soft font-riso-body">
                        {reward.description}
                      </p>
                      <div className="mt-2 inline-block bg-riso-spring/40 text-carbon text-xs px-2 py-1 border-2 border-carbon font-riso-mono font-bold">
                        {reward.cost} Puan
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(reward.id)}
                    className="riso-focus text-carbon-muted hover:text-paper p-2 hover:bg-riso-redox transition-colors border-2 border-transparent hover:border-carbon shrink-0"
                    aria-label={`${reward.title} ödülünü sil`}
                    title="Ödülü sil"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {confirmDialog}
    </>
  );
};
