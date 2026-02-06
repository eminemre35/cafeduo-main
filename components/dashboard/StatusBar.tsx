/**
 * StatusBar Component
 * 
 * @description Kullanıcı durum bilgileri ve istatistikler
 */

import React from 'react';
import { User } from '../../types';
import { Trophy, Star, Gamepad2, Wifi, MapPin } from 'lucide-react';

interface StatusBarProps {
  user: User;
  tableCode: string;
  isMatched: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  user,
  tableCode,
  isMatched
}) => {
  return (
    <div className="rf-panel border-cyan-400/20 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Kullanıcı Bilgileri */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-600 to-sky-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-[0_10px_24px_rgba(0,215,255,0.26)]">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-white font-bold">{user.username}</h3>
            <p className="text-[var(--rf-muted)] text-sm">{user.department || 'Öğrenci'}</p>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="flex items-center gap-6">
          {/* Puan */}
          <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-300/20 px-4 py-2 rounded-lg" data-testid="user-points">
            <Star className="text-amber-300" size={20} />
            <div>
              <span className="text-amber-300 font-bold text-lg">{user.points}</span>
              <span className="text-[var(--rf-muted)] text-xs block">Puan</span>
            </div>
          </div>

          {/* Galibiyet */}
          <div className="flex items-center gap-2 bg-cyan-400/10 border border-cyan-300/20 px-4 py-2 rounded-lg" data-testid="user-wins">
            <Trophy className="text-cyan-300" size={20} />
            <div>
              <span className="text-cyan-300 font-bold text-lg">{user.wins}</span>
              <span className="text-[var(--rf-muted)] text-xs block">Galibiyet</span>
            </div>
          </div>

          {/* Oynanan Oyun */}
          <div className="flex items-center gap-2 bg-slate-500/10 border border-slate-300/20 px-4 py-2 rounded-lg" data-testid="user-games">
            <Gamepad2 className="text-slate-300" size={20} />
            <div>
              <span className="text-slate-200 font-bold text-lg">{user.gamesPlayed}</span>
              <span className="text-[var(--rf-muted)] text-xs block">Oyun</span>
            </div>
          </div>
        </div>

        {/* Masa Durumu */}
        <div className="flex items-center gap-2" data-testid="table-status">
          {isMatched ? (
            <>
              <Wifi className="text-green-500 animate-pulse" size={18} />
              <span className="text-green-400 text-sm font-medium">
                {tableCode}
              </span>
            </>
          ) : (
            <>
              <MapPin className="text-[var(--rf-muted)]" size={18} />
              <span className="text-[var(--rf-muted)] text-sm">
                Masa bağlı değil
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
