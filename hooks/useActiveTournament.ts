/**
 * useActiveTournament — finds the currently-active tournament for a cafe
 * (if any) and exposes a refresh handle.
 *
 * Polls every 60s so the banner reflects a freshly-finalized prize handout
 * within one minute. Polling beats Socket.IO here because tournaments
 * change rarely (few/day) — a websocket subscription would be over-engineered.
 *
 * Returns `null` when cafeId is missing (user not checked in) or no active
 * tournament exists. Callers treat both as "don't render the banner".
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Tournament } from '../types';

const POLL_INTERVAL_MS = 60_000;

interface UseActiveTournamentReturn {
  tournament: Tournament | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useActiveTournament(cafeId: number | null | undefined): UseActiveTournamentReturn {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!cafeId) {
      setTournament(null);
      return;
    }
    try {
      setLoading(true);
      const list = await api.tournaments.list(cafeId);
      // Pick the one whose window covers `now` (status='active'). If multiple
      // somehow overlap pick the one with the latest start_at — it's the most
      // recently-launched, which is the most useful banner.
      const now = Date.now();
      const active = list
        .filter((t) => t.status === 'active' && new Date(t.start_at).getTime() <= now && new Date(t.end_at).getTime() > now)
        .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0];
      setTournament(active ?? null);
    } catch (err) {
      // Endpoint is public + cached so this should rarely error; on failure
      // just hide the banner.
      console.warn('useActiveTournament fetch failed', err);
      setTournament(null);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void refresh();
    if (!cafeId) return undefined;
    const id = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [cafeId, refresh]);

  return { tournament, loading, refresh };
}
