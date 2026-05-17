/**
 * StatusBar Component
 *
 * @description Kullanıcı durum bilgileri ve istatistikler
 */

import React from 'react';
import { User } from '../../types';
import { Trophy, Star, Gamepad2, Wifi, MapPin } from 'lucide-react';
import { getAvatarUrl } from '../../lib/avatars';

interface StatusBarProps {
  user: User;
  tableCode: string;
  isMatched: boolean;
  onOpenProfile?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  user,
  tableCode,
  isMatched,
  onOpenProfile,
}) => {
  return (
    <div className="border-2 border-carbon bg-paper riso-shadow-sm p-4 md:p-5 mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            className="flex items-center gap-3 min-w-0 text-left"
            onClick={onOpenProfile}
            aria-label="Profilini aç"
          >
            <div className="relative w-11 h-11 border-2 border-carbon bg-riso-blue flex items-center justify-center text-paper font-riso-display font-bold text-base overflow-hidden">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-contain"
                  onError={(e) => {
                    // DiceBear outage → hide the broken img so the initial behind it shows.
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}
              <span aria-hidden={user.avatar_url ? 'true' : undefined}>
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-carbon font-riso-display text-base truncate">{user.username}</h3>
              <p className="text-carbon-muted text-sm truncate">{user.department || 'Öğrenci'}</p>
            </div>
          </button>

          <div
            className={`inline-flex items-center gap-2 self-start sm:self-auto border-2 border-carbon px-3 py-1.5 ${
              isMatched ? 'bg-riso-spring/25 text-carbon' : 'bg-paper-deep text-carbon-muted'
            }`}
            data-testid="table-status"
          >
            {isMatched ? <Wifi className="animate-pulse" size={16} /> : <MapPin size={16} />}
            <span className="text-xs font-medium">
              {isMatched ? tableCode : 'Masa bağlı değil'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          <div
            className="border-2 border-carbon bg-paper-deep p-2.5 sm:p-3"
            data-testid="user-points"
          >
            <div className="flex items-center gap-1.5 text-riso-mustard mb-1">
              <Star size={15} />
              <span className="text-[10px] uppercase tracking-[0.1em]">Puan</span>
            </div>
            <div className="text-carbon text-lg sm:text-xl font-riso-display leading-none">
              {user.points}
            </div>
          </div>

          <div
            className="border-2 border-carbon bg-paper-deep p-2.5 sm:p-3"
            data-testid="user-wins"
          >
            <div className="flex items-center gap-1.5 text-riso-blue mb-1">
              <Trophy size={15} />
              <span className="text-[10px] uppercase tracking-[0.1em]">Galibiyet</span>
            </div>
            <div className="text-carbon text-lg sm:text-xl font-riso-display leading-none">
              {user.wins}
            </div>
          </div>

          <div
            className="border-2 border-carbon bg-paper-deep p-2.5 sm:p-3"
            data-testid="user-games"
          >
            <div className="flex items-center gap-1.5 text-carbon-soft mb-1">
              <Gamepad2 size={15} />
              <span className="text-[10px] uppercase tracking-[0.1em]">Oyun</span>
            </div>
            <div className="text-carbon text-lg sm:text-xl font-riso-display leading-none">
              {user.gamesPlayed}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
