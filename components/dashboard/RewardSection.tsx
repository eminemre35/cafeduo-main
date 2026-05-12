/**
 * RewardSection — Riso Kantin redesign (PR #26).
 *
 * Shop + Inventory tabs for the dashboard. All data-testid attributes are
 * preserved (`shop-tab`, `inventory-tab`, `shop-buy-button`, plus
 * `skeleton-grid`, `empty-state`, `empty-state-action` from the mocked
 * subcomponents). Tab "active" indicator class is `bg-riso-pink` (updated
 * from the legacy `bg-[#0e355f]` — test file follows the same rename).
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, Percent, Cookie, Gamepad2, ShoppingBag, Package, Gift } from 'lucide-react';
import { Reward, RedeemedReward, User } from '../../types';
import { Button } from '../ui';
import { SkeletonGrid } from '../Skeleton';
import { EmptyState } from '../EmptyState';

interface RewardSectionProps {
  currentUser: User;
  rewards: Reward[];
  rewardsLoading: boolean;
  inventory: RedeemedReward[];
  inventoryLoading: boolean;
  activeTab: 'shop' | 'inventory';
  onTabChange: (tab: 'shop' | 'inventory') => void;
  onBuyReward: (reward: Reward) => Promise<void>;
}

const getRewardIcon = (icon: string): React.ReactNode => {
  const cls = 'w-5 h-5';
  switch (icon) {
    case 'coffee':
      return <Coffee className={cls} strokeWidth={2.4} />;
    case 'discount':
      return <Percent className={cls} strokeWidth={2.4} />;
    case 'dessert':
      return <Cookie className={cls} strokeWidth={2.4} />;
    case 'game':
      return <Gamepad2 className={cls} strokeWidth={2.4} />;
    default:
      return <Coffee className={cls} strokeWidth={2.4} />;
  }
};

export const RewardSection: React.FC<RewardSectionProps> = ({
  currentUser,
  rewards,
  rewardsLoading,
  inventory,
  inventoryLoading,
  activeTab,
  onTabChange,
  onBuyReward,
}) => {
  const canAfford = (cost: number): boolean => (currentUser?.points ?? 0) >= cost;

  return (
    <div className="border-2 border-carbon bg-paper riso-shadow-md p-4 sm:p-6">
      {/* Tab + balance header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex border-2 border-carbon self-start">
          <button
            type="button"
            onClick={() => onTabChange('shop')}
            data-testid="shop-tab"
            className={`riso-focus px-4 py-2 font-riso-body text-sm font-bold tracking-wide transition-colors ${
              activeTab === 'shop'
                ? 'bg-riso-pink text-carbon'
                : 'bg-paper text-carbon hover:bg-paper-deep'
            }`}
          >
            Mağaza
          </button>
          <button
            type="button"
            onClick={() => onTabChange('inventory')}
            data-testid="inventory-tab"
            className={`riso-focus border-l-2 border-carbon px-4 py-2 font-riso-body text-sm font-bold tracking-wide transition-colors ${
              activeTab === 'inventory'
                ? 'bg-riso-pink text-carbon'
                : 'bg-paper text-carbon hover:bg-paper-deep'
            }`}
          >
            Envanter ({inventory?.length ?? 0})
          </button>
        </div>

        <div className="inline-flex items-baseline gap-2 border-2 border-carbon bg-riso-mustard px-3 py-1.5 self-start sm:self-auto">
          <span className="font-riso-mono text-[0.7rem] font-bold uppercase tracking-wider text-carbon">
            Bakiye:
          </span>
          <span className="font-riso-display text-lg text-carbon">
            {currentUser?.points ?? 0} puan
          </span>
        </div>
      </div>

      {/* SHOP TAB */}
      {activeTab === 'shop' && (
        <div>
          {rewardsLoading ? (
            <SkeletonGrid count={3} columns={1} />
          ) : (rewards?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {rewards.map((reward, idx) => {
                const affordable = canAfford(reward.cost);
                const rotate = idx % 2 === 0 ? -0.8 : 0.8;

                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.04 }}
                    style={{ transform: `rotate(${rotate}deg)` }}
                  >
                    <div
                      className={`relative flex min-h-[200px] flex-col justify-between border-2 border-carbon p-4 sm:p-5 transition-colors ${
                        affordable ? 'bg-paper riso-shadow-sm' : 'bg-paper-deep opacity-65'
                      }`}
                    >
                      <div>
                        <div className="mb-3 flex items-start justify-between">
                          <div
                            className={`flex h-10 w-10 items-center justify-center border-2 border-carbon ${
                              affordable
                                ? 'bg-riso-blue text-paper'
                                : 'bg-paper-dim text-carbon-muted'
                            }`}
                          >
                            {getRewardIcon(reward.icon)}
                          </div>
                          <div className="text-right">
                            <p className="font-riso-mono text-[0.65rem] uppercase tracking-wider text-carbon-muted">
                              Fiyat
                            </p>
                            <span className="font-riso-display text-xl text-carbon">
                              {reward.cost}
                            </span>
                          </div>
                        </div>

                        <h4 className="font-riso-display text-lg text-carbon break-words">
                          {reward.title}
                        </h4>
                        <p className="mt-1 font-riso-body text-xs leading-5 text-carbon-soft break-words">
                          {reward.description}
                        </p>
                      </div>

                      <div className="mt-4">
                        <Button
                          tone={affordable ? 'pink' : 'paper'}
                          size="md"
                          block
                          disabled={!affordable}
                          onClick={() => void onBuyReward(reward)}
                          data-testid="shop-buy-button"
                          leadingIcon={
                            affordable ? <ShoppingBag size={16} strokeWidth={2.5} /> : undefined
                          }
                        >
                          {affordable ? 'Satın Al' : 'Yetersiz Puan'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Gift}
              title="Mağaza Boş"
              description="Şu anda satın alınabilecek ödül bulunmuyor. Daha sonra tekrar kontrol edin."
              variant="compact"
            />
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div>
          {inventoryLoading ? (
            <SkeletonGrid count={4} columns={1} />
          ) : (inventory?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {inventory.map((item) => {
                const expirationDate = new Date(
                  new Date(item.redeemedAt).getTime() + 5 * 24 * 60 * 60 * 1000
                );
                const isExpired = new Date() > expirationDate;
                const isUsed = item.isUsed;
                const dead = isUsed || isExpired;

                return (
                  <motion.div
                    key={item.redeemId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`relative overflow-hidden ${dead ? 'opacity-65' : ''}`}
                  >
                    {/* Ticket — paper tone, ink border, perforated edges via small carbon dots */}
                    <div className="relative bg-riso-mustard/20 border-2 border-carbon p-4 riso-shadow-sm">
                      {/* Perforation dots — top-bottom punch holes */}
                      <span
                        aria-hidden="true"
                        className="absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-paper border-2 border-carbon"
                      />
                      <span
                        aria-hidden="true"
                        className="absolute -right-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-paper border-2 border-carbon"
                      />

                      {/* Used / Expired stamp overlay */}
                      {isUsed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                          <div className="rotate-[-12deg] border-4 border-riso-redox bg-paper px-4 py-2 font-riso-display text-lg font-bold tracking-wider text-riso-redox shadow-md">
                            KULLANILDI
                          </div>
                        </div>
                      )}
                      {isExpired && !isUsed && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                          <div className="rotate-[-12deg] border-4 border-carbon bg-paper-deep px-4 py-2 font-riso-display text-lg font-bold tracking-wider text-carbon shadow-md">
                            SÜRESİ DOLDU
                          </div>
                        </div>
                      )}

                      <div className="border-b-2 border-dashed border-carbon pb-2 mb-3 text-center">
                        <h4 className="font-riso-display text-lg text-carbon uppercase">
                          {item.title}
                        </h4>
                        <span className="font-riso-mono text-[0.65rem] uppercase tracking-[0.2em] text-carbon-soft">
                          CafeDuo Kuponu
                        </span>
                      </div>

                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center border-2 border-carbon bg-carbon text-paper text-[8px] font-bold uppercase">
                          QR
                        </div>
                        <div className="text-right">
                          <span className="block font-riso-mono text-lg font-bold tracking-widest text-carbon">
                            {item.code}
                          </span>
                          <span className="block font-riso-mono text-[0.65rem] uppercase tracking-wider text-carbon-soft">
                            SKT: {expirationDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="border-2 border-carbon bg-carbon px-2 py-1 text-center font-riso-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-paper">
                        Kasada Gösterin
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Package}
              title="Envanterin Boş"
              description="Henüz hiç kuponun yok. Mağazadan puanlarınla ödül satın alabilirsin!"
              action={{
                label: 'Mağazaya Git',
                onClick: () => onTabChange('shop'),
              }}
              variant="compact"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RewardSection;
