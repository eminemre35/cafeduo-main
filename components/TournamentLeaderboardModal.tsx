/**
 * TournamentLeaderboardModal — top-20 with avatars + cumulative points and
 * prize-tier icons next to ranks 1..N.
 *
 * Fetches on open + every 15s while mounted so the rankings stay live as
 * players score. The endpoint is cached server-side at 15s and busted on
 * every settlement, so we'd see new scores in at most ~30s worst case.
 */
import React, { useEffect, useState } from 'react';
import { X, Trophy, Medal } from 'lucide-react';
import { api } from '../lib/api';
import { getAvatarUrl } from '../lib/avatars';
import type { Tournament, TournamentLeaderboardResponse } from '../types';

const POLL_MS = 15_000;

interface TournamentLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  rewardLookup?: Map<number, { title: string; icon?: string }>;
}

export const TournamentLeaderboardModal: React.FC<TournamentLeaderboardModalProps> = ({
  isOpen,
  onClose,
  tournament,
  rewardLookup,
}) => {
  const [data, setData] = useState<TournamentLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.tournaments.leaderboard(tournament.id);
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Sıralama yüklenemedi.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOpen, tournament.id]);

  if (!isOpen) return null;

  // Build rank → prize lookup so we can flag the top-N rows.
  const prizeByRank = new Map<number, string>();
  for (const tier of tournament.prize_tiers) {
    const rewardTitle = rewardLookup?.get(tier.reward_id)?.title;
    prizeByRank.set(tier.rank, rewardTitle || `Ödül #${tier.reward_id}`);
  }

  return (
    <div
      className="riso-kantin fixed inset-0 z-[120] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Turnuva sıralaması"
    >
      <div className="absolute inset-0 bg-carbon/80" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg bg-paper border-2 border-carbon riso-shadow-md max-h-[calc(100vh-3rem)] flex flex-col">
        <div className="flex items-center justify-between border-b-2 border-carbon px-5 py-3 shrink-0">
          <div className="min-w-0">
            <p className="font-riso-mono text-[0.65rem] uppercase tracking-[0.18em] text-carbon-soft">
              Turnuva Sıralaması
            </p>
            <h3 className="font-riso-display text-lg uppercase tracking-wide text-carbon truncate">
              {tournament.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="riso-focus inline-flex h-8 w-8 items-center justify-center border-2 border-carbon bg-paper text-carbon hover:bg-paper-deep transition-colors"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {loading && !data ? (
            <p className="font-riso-body text-carbon-muted animate-pulse">Yükleniyor...</p>
          ) : error ? (
            <p className="font-riso-body text-riso-redox">{error}</p>
          ) : !data || data.leaderboard.length === 0 ? (
            <p className="font-riso-body text-carbon-muted">
              Henüz oynayan olmadı. Bir oyun bitince burada görüneceksin.
            </p>
          ) : (
            <ol className="space-y-2" data-testid="tournament-leaderboard">
              {data.leaderboard.map((row, idx) => {
                const rank = idx + 1;
                const prize = prizeByRank.get(rank);
                const avatarSrc =
                  row.avatar_url || getAvatarUrl(row.username || `user-${row.id}`);
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 border-2 border-carbon bg-paper-deep p-2.5"
                    data-testid={`tournament-leaderboard-row-${row.id}`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-carbon bg-paper font-riso-display text-sm font-bold text-carbon">
                      {rank === 1 ? (
                        <Trophy size={14} className="text-riso-mustard-deep" strokeWidth={2.4} />
                      ) : rank <= 3 ? (
                        <Medal size={14} strokeWidth={2.4} />
                      ) : (
                        rank
                      )}
                    </div>
                    <div className="relative h-9 w-9 shrink-0 overflow-hidden border-2 border-carbon bg-riso-blue text-paper">
                      <img
                        src={avatarSrc}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center font-riso-display text-[0.65rem] font-bold">
                        {String(row.username || '?').substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-riso-body font-bold text-carbon truncate">
                        {row.username}
                      </p>
                      {prize && (
                        <p className="font-riso-mono text-[0.65rem] uppercase tracking-wider text-riso-pink-deep">
                          Ödül: {prize}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-riso-mono text-base font-bold text-riso-mustard-deep">
                        {row.total_points}
                      </p>
                      <p className="font-riso-mono text-[0.6rem] uppercase tracking-wider text-carbon-muted">
                        {row.games_counted} oyun
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};
