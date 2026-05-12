/**
 * Store — Riso Kantin redesign (PR #25).
 *
 * Holographic-equipment cyber pazar replaced with a printed-zine paper
 * shop. Cards are paper-tone with spot-coloured icon chips, owned items
 * get a spring-green stamp, unaffordable items go to paper-deep with
 * muted text. Buy flow + API contract unchanged.
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap, Award, Check, Image as ImageIcon, Star } from 'lucide-react';
import { api } from '../lib/api';
import type { User } from '../types';
import { Card, Button, Squiggle } from './ui';

interface StoreItem {
  id: number;
  title: string;
  code: string;
  price: number;
  type: 'rank' | 'frame' | 'title' | 'animation';
  description: string;
}

interface UserInventoryItem {
  id: number;
  user_id: number;
  item_id: number;
  item_title: string;
  code: string;
  is_used: boolean;
}

interface StoreProps {
  user: User | null;
  updateUser: (updates: Partial<User>) => void;
  onShowToast?: {
    success?: (message: string) => void;
    error?: (message: string) => void;
    warning?: (message: string) => void;
  };
}

const TYPE_TONE: Record<StoreItem['type'], { bg: string; icon: React.ReactNode }> = {
  rank: { bg: 'bg-riso-blue text-paper', icon: <Award size={20} strokeWidth={2.4} /> },
  frame: { bg: 'bg-riso-pink text-carbon', icon: <ImageIcon size={20} strokeWidth={2.4} /> },
  title: { bg: 'bg-riso-mustard text-carbon', icon: <Star size={20} strokeWidth={2.4} /> },
  animation: { bg: 'bg-paper-deep text-carbon', icon: <Zap size={20} strokeWidth={2.4} /> },
};

export const Store: React.FC<StoreProps> = ({ user, updateUser, onShowToast }) => {
  const [items, setItems] = useState<StoreItem[]>([]);
  const [inventory, setInventory] = useState<UserInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<number | null>(null);

  useEffect(() => {
    fetchStoreData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const [itemsRes, invRes] = await Promise.all([
        api.store.items(),
        user
          ? api.store.inventory()
          : Promise.resolve({ success: true, inventory: [] as UserInventoryItem[] }),
      ]);

      if (itemsRes.success) setItems(itemsRes.items);
      if (invRes.success) setInventory(invRes.inventory);
    } catch (error) {
      console.error('Store verisi çekilemedi:', error);
      onShowToast?.error?.('Mağaza yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: StoreItem) => {
    if (!user) {
      onShowToast?.error?.('Satın alım için giriş yapmalısınız.');
      return;
    }

    if (user.points < item.price) {
      onShowToast?.warning?.('Yetersiz puan');
      return;
    }

    try {
      setBuyingId(item.id);
      const data = await api.store.buy(item.id);

      if (data.success) {
        onShowToast?.success?.(`${item.title} başarıyla satın alındı!`);
        updateUser({ points: data.remainingPoints });
        setInventory((prev) => [data.inventoryItem, ...prev]);
      } else {
        onShowToast?.error?.(data.message || 'Satın alım başarısız');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Bir hata oluştu';
      onShowToast?.error?.(message);
    } finally {
      setBuyingId(null);
    }
  };

  const hasItem = (code: string): boolean => inventory.some((item) => item.code === code);

  if (loading) {
    return (
      <div className="riso-kantin riso-kantin-app flex min-h-screen flex-col items-center justify-center bg-paper px-4">
        <div className="h-16 w-16 animate-spin border-4 border-paper-dim border-t-riso-pink rounded-full" />
        <p className="mt-4 font-riso-mono text-sm font-bold tracking-widest uppercase text-carbon-soft">
          Pazar yükleniyor...
        </p>
      </div>
    );
  }

  return (
    <div className="riso-kantin riso-kantin-app relative min-h-screen overflow-hidden bg-paper px-4 pt-24 pb-24 sm:pt-32">
      {/* Halftone */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '6px 6px',
        }}
      />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b-2 border-carbon pb-6 md:flex-row md:items-end">
          <div>
            <p className="font-riso-mono text-xs font-bold uppercase tracking-[0.18em] text-carbon-soft">
              // Lisanslı Eşya Pazarı
            </p>
            <motion.h1
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="mt-1 font-riso-display text-4xl text-carbon sm:text-5xl"
            >
              Mağaza
            </motion.h1>
            <div className="mt-1 h-2 w-24">
              <Squiggle tone="blue" />
            </div>
          </div>

          {user && (
            <motion.div
              initial={{ x: 8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="border-2 border-carbon bg-riso-mustard p-4 riso-shadow-sm"
            >
              <p className="font-riso-mono text-[0.65rem] font-bold uppercase tracking-widest text-carbon">
                Bakiye
              </p>
              <p className="mt-0.5 font-riso-display text-3xl text-carbon">
                {user.points} <span className="font-riso-mono text-base text-carbon-soft">CP</span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <p className="border-2 border-dashed border-carbon-muted bg-paper-deep p-10 text-center font-riso-body text-carbon-muted">
            Şu anda satışta ürün yok.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const owned = hasItem(item.code);
              const afford = user ? user.points >= item.price : false;
              const tone = TYPE_TONE[item.type];
              const buying = buyingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={owned ? 'opacity-80' : ''}
                >
                  <Card tone="paper" shadow="md">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center border-2 border-carbon ${tone.bg}`}
                      >
                        {tone.icon}
                      </div>
                      <div className="text-right">
                        <p className="font-riso-mono text-[0.65rem] uppercase tracking-widest text-carbon-muted">
                          Fiyat
                        </p>
                        <p className="font-riso-display text-2xl text-carbon">
                          {item.price}{' '}
                          <span className="font-riso-mono text-sm text-carbon-soft">CP</span>
                        </p>
                      </div>
                    </div>

                    <h3 className="mt-4 font-riso-display text-xl text-carbon">{item.title}</h3>
                    <p className="mt-2 font-riso-body text-sm leading-6 text-carbon-soft">
                      {item.description}
                    </p>

                    <div className="mt-5">
                      {owned ? (
                        <Button
                          tone="paper"
                          block
                          disabled
                          leadingIcon={<Check size={18} strokeWidth={2.6} />}
                          className="!bg-riso-spring !text-carbon !cursor-default"
                        >
                          Satın Alındı
                        </Button>
                      ) : !user ? (
                        <Button tone="paper" block onClick={() => handleBuy(item)}>
                          Giriş Yap
                        </Button>
                      ) : afford ? (
                        <Button
                          tone="pink"
                          block
                          disabled={buying}
                          onClick={() => handleBuy(item)}
                          leadingIcon={<ShoppingCart size={16} strokeWidth={2.5} />}
                        >
                          {buying ? 'İşleniyor...' : 'Satın Al'}
                        </Button>
                      ) : (
                        <Button tone="paper" block onClick={() => handleBuy(item)}>
                          Yetersiz Bakiye
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
