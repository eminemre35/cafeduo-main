/**
 * Tournament handlers — cafe-scoped, time-windowed prize competitions.
 *
 * Lifecycle:
 *   scheduled ─ start_at → active ─ end_at → finalizing → finished
 *                                       └→ cancelled (admin)
 *
 * Status transitions and prize handout happen in
 * `backend/jobs/tournamentJobs.js`. These handlers only handle the
 * CRUD + leaderboard read.
 *
 * Cafe-scoping: cafe_admin role is locked to req.user.cafe_id; admin role
 * may pass a cafeId in the body to operate on any cafe. Same convention
 * the commerce handlers use, but stricter for cafe_admin (no impersonation).
 */

const { executeDataMode, sendApiError, sendApiProblem } = require('../utils/routeHelpers');
const { clearCache } = require('../middleware/cache');
const { SUPPORTED_GAME_TYPES } = require('../utils/serverConfig');
const memoryState = require('../store/memoryState');

const MIN_WINDOW_MS = 15 * 60 * 1000; // 15 min
const MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MIN_LEAD_MS = 60 * 1000; // 1 min lead from now until start_at
const MAX_NAME_LEN = 120;
const MAX_TIERS = 10;

const isAdminActor = (user) => user?.role === 'admin' || user?.isAdmin === true;

const resolveTargetCafeId = (req) => {
  if (isAdminActor(req.user)) {
    // Admin may operate on any cafe by passing cafeId in body; otherwise
    // fall back to their own cafe_id if set.
    const bodyCafe = Number(req.body?.cafeId);
    if (Number.isInteger(bodyCafe) && bodyCafe > 0) return bodyCafe;
    return Number(req.user?.cafe_id || 0) || null;
  }
  // cafe_admin: always their own cafe — body cafeId ignored to prevent
  // an attacker from spinning tournaments in someone else's cafe.
  return Number(req.user?.cafe_id || 0) || null;
};

const parseTimestamp = (raw) => {
  if (!raw) return null;
  const t = new Date(raw);
  return Number.isFinite(t.getTime()) ? t : null;
};

const validatePrizeTiers = (raw) => {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'prize_tiers dizi olmalıdır.' };
  }
  if (raw.length === 0) {
    return { ok: false, error: 'En az bir ödül kademesi gerekli.' };
  }
  if (raw.length > MAX_TIERS) {
    return { ok: false, error: `En fazla ${MAX_TIERS} kademe tanımlayabilirsin.` };
  }
  const seenRanks = new Set();
  const tiers = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: 'Her kademe rank ve reward_id alanlı obje olmalıdır.' };
    }
    const rank = Number(entry.rank);
    const rewardId = Number(entry.reward_id ?? entry.rewardId);
    if (!Number.isInteger(rank) || rank < 1 || rank > MAX_TIERS) {
      return { ok: false, error: `Geçersiz rank: ${entry.rank}` };
    }
    if (!Number.isInteger(rewardId) || rewardId < 1) {
      return { ok: false, error: `Geçersiz reward_id: ${entry.reward_id}` };
    }
    if (seenRanks.has(rank)) {
      return { ok: false, error: `Rank tekrarı: ${rank}` };
    }
    seenRanks.add(rank);
    tiers.push({ rank, reward_id: rewardId });
  }
  tiers.sort((a, b) => a.rank - b.rank);
  // Ranks must be a consecutive 1..N sequence (no gaps).
  for (let i = 0; i < tiers.length; i += 1) {
    if (tiers[i].rank !== i + 1) {
      return { ok: false, error: 'Rank sıralaması 1..N kesintisiz olmalıdır.' };
    }
  }
  return { ok: true, tiers };
};

const createTournamentHandlers = ({ pool, isDbConnected, logger }) => {
  const createTournament = async (req, res) => {
    const cafeId = resolveTargetCafeId(req);
    if (!cafeId) {
      return sendApiProblem(res, {
        status: 400,
        code: 'CAFE_REQUIRED',
        message: 'Turnuva oluşturmak için bir kafe atanmış olmalı.',
      });
    }

    const rawName = String(req.body?.name || '').trim();
    if (!rawName || rawName.length > MAX_NAME_LEN) {
      return sendApiProblem(res, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: `Turnuva adı 1-${MAX_NAME_LEN} karakter olmalıdır.`,
      });
    }

    const rawGameType = req.body?.game_type ?? req.body?.gameType;
    let gameType = null;
    if (rawGameType !== null && rawGameType !== undefined && rawGameType !== '') {
      const trimmed = String(rawGameType).trim();
      if (!SUPPORTED_GAME_TYPES.has(trimmed)) {
        return sendApiProblem(res, {
          status: 400,
          code: 'INVALID_GAME_TYPE',
          message: 'Geçersiz oyun türü.',
        });
      }
      gameType = trimmed;
    }

    const startAt = parseTimestamp(req.body?.start_at ?? req.body?.startAt);
    const endAt = parseTimestamp(req.body?.end_at ?? req.body?.endAt);
    if (!startAt || !endAt) {
      return sendApiProblem(res, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'start_at ve end_at geçerli ISO tarih olmalıdır.',
      });
    }
    const now = Date.now();
    if (startAt.getTime() < now + MIN_LEAD_MS) {
      return sendApiProblem(res, {
        status: 400,
        code: 'WINDOW_TOO_SOON',
        message: 'Başlangıç en az 1 dakika sonra olmalıdır.',
      });
    }
    const windowMs = endAt.getTime() - startAt.getTime();
    if (windowMs < MIN_WINDOW_MS || windowMs > MAX_WINDOW_MS) {
      return sendApiProblem(res, {
        status: 400,
        code: 'WINDOW_OUT_OF_RANGE',
        message: 'Turnuva süresi 15 dakika ile 30 gün arasında olmalıdır.',
      });
    }

    const tierResult = validatePrizeTiers(req.body?.prize_tiers ?? req.body?.prizeTiers ?? []);
    if (!tierResult.ok) {
      return sendApiProblem(res, {
        status: 400,
        code: 'INVALID_PRIZE_TIERS',
        message: tierResult.error,
      });
    }
    const tiers = tierResult.tiers;

    return executeDataMode(isDbConnected, {
      db: async () => {
        try {
          // Verify every reward_id belongs to this cafe and is active.
          const rewardIds = tiers.map((t) => t.reward_id);
          const rewardsRes = await pool.query(
            'SELECT id FROM rewards WHERE id = ANY($1) AND cafe_id = $2 AND is_active = true',
            [rewardIds, cafeId]
          );
          const validIds = new Set(rewardsRes.rows.map((r) => r.id));
          const missing = rewardIds.filter((id) => !validIds.has(id));
          if (missing.length > 0) {
            return sendApiProblem(res, {
              status: 400,
              code: 'REWARD_NOT_IN_CAFE',
              message: 'Bazı ödüller bu kafeye ait değil veya aktif değil.',
              details: { missing },
            });
          }

          const result = await pool.query(
            `INSERT INTO tournaments
              (cafe_id, name, game_type, start_at, end_at, prize_tiers, created_by)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
             RETURNING id, cafe_id, name, game_type, start_at, end_at, status, prize_tiers,
                       created_by, created_at, finalized_at`,
            [
              cafeId,
              rawName,
              gameType,
              startAt.toISOString(),
              endAt.toISOString(),
              JSON.stringify(tiers),
              req.user?.id || null,
            ]
          );

          await clearCache('cache:/api/tournaments*').catch(() => undefined);

          return res.json({ success: true, tournament: result.rows[0] });
        } catch (err) {
          return sendApiError(
            res,
            logger,
            'Tournament create error',
            err,
            'Turnuva oluşturulamadı.'
          );
        }
      },
      memory: async () => {
        const nextId =
          memoryState.tournaments.reduce((max, t) => Math.max(max, Number(t.id) || 0), 0) + 1;
        const tournament = {
          id: nextId,
          cafe_id: cafeId,
          name: rawName,
          game_type: gameType,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          // start_at >= now + MIN_LEAD validasyonu gereği her zaman scheduled
          // başlar; tournamentJobs start_at geçince active'e ilerletir (DB ile aynı).
          status: 'scheduled',
          prize_tiers: tiers,
          created_by: req.user?.id || null,
          created_at: new Date().toISOString(),
          finalized_at: null,
        };
        memoryState.tournaments.push(tournament);
        return res.json({ success: true, tournament });
      },
    });
  };

  const listTournaments = async (req, res) => {
    const cafeId = Number(req.query?.cafeId);
    if (!Number.isInteger(cafeId) || cafeId <= 0) {
      return res.json([]);
    }
    return executeDataMode(isDbConnected, {
      db: async () => {
        try {
          const result = await pool.query(
            `SELECT id, cafe_id, name, game_type, start_at, end_at, status, prize_tiers,
                    created_by, created_at, finalized_at
             FROM tournaments
             WHERE cafe_id = $1
               AND status IN ('scheduled', 'active', 'finalizing', 'finished')
             ORDER BY start_at DESC
             LIMIT 50`,
            [cafeId]
          );
          return res.json(result.rows);
        } catch (err) {
          return sendApiError(res, logger, 'Tournament list error', err, 'Turnuvalar yüklenemedi.');
        }
      },
      memory: async () => {
        const rows = memoryState.tournaments
          .filter(
            (t) =>
              Number(t.cafe_id) === cafeId &&
              ['scheduled', 'active', 'finalizing', 'finished'].includes(t.status)
          )
          .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())
          .slice(0, 50);
        return res.json(rows);
      },
    });
  };

  const getLeaderboard = async (req, res) => {
    const tournamentId = Number(req.params?.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return sendApiProblem(res, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Geçersiz turnuva id.',
      });
    }
    return executeDataMode(isDbConnected, {
      db: async () => {
        try {
          const tournamentRes = await pool.query(
            `SELECT id, cafe_id, name, status, start_at, end_at, prize_tiers
             FROM tournaments WHERE id = $1`,
            [tournamentId]
          );
          if (tournamentRes.rows.length === 0) {
            return sendApiProblem(res, {
              status: 404,
              code: 'TOURNAMENT_NOT_FOUND',
              message: 'Turnuva bulunamadı.',
            });
          }
          const tournament = tournamentRes.rows[0];

          const boardRes = await pool.query(
            `SELECT u.id, u.username, u.avatar_url,
                    SUM(tp.points)::NUMERIC(8,2) AS total_points,
                    COUNT(tp.game_id)::INTEGER AS games_counted
             FROM tournament_points tp
             JOIN users u ON u.id = tp.user_id
             WHERE tp.tournament_id = $1
             GROUP BY u.id, u.username, u.avatar_url
             ORDER BY total_points DESC, u.username ASC
             LIMIT 20`,
            [tournamentId]
          );

          return res.json({ tournament, leaderboard: boardRes.rows });
        } catch (err) {
          return sendApiError(
            res,
            logger,
            'Tournament leaderboard error',
            err,
            'Sıralama yüklenemedi.'
          );
        }
      },
      memory: async () => {
        const tournament = memoryState.tournaments.find((t) => Number(t.id) === tournamentId);
        if (!tournament) {
          return sendApiProblem(res, {
            status: 404,
            code: 'TOURNAMENT_NOT_FOUND',
            message: 'Turnuva bulunamadı.',
          });
        }
        // Memory mode'da turnuva puanları birikmez; boş leaderboard döner.
        return res.json({ tournament, leaderboard: [] });
      },
    });
  };

  const cancelTournament = async (req, res) => {
    const tournamentId = Number(req.params?.id);
    const cafeId = resolveTargetCafeId(req);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return sendApiProblem(res, {
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Geçersiz turnuva id.',
      });
    }
    return executeDataMode(isDbConnected, {
      db: async () => {
        try {
          // Only cancel `scheduled` tournaments — active/finished are immutable.
          // cafe_admins can only cancel their own cafe's tournaments.
          const adminScope = isAdminActor(req.user);
          const params = adminScope ? [tournamentId] : [tournamentId, cafeId];
          const cafeFilter = adminScope ? '' : ' AND cafe_id = $2';
          const result = await pool.query(
            `UPDATE tournaments
             SET status = 'cancelled', finalized_at = now()
             WHERE id = $1 AND status = 'scheduled'${cafeFilter}
             RETURNING id, status`,
            params
          );
          if (result.rows.length === 0) {
            return sendApiProblem(res, {
              status: 409,
              code: 'NOT_CANCELLABLE',
              message: 'Sadece henüz başlamamış turnuvalar iptal edilebilir.',
            });
          }
          await clearCache('cache:/api/tournaments*').catch(() => undefined);
          return res.json({ success: true });
        } catch (err) {
          return sendApiError(
            res,
            logger,
            'Tournament cancel error',
            err,
            'Turnuva iptal edilemedi.'
          );
        }
      },
      memory: async () => {
        const adminScope = isAdminActor(req.user);
        const target = memoryState.tournaments.find((t) => {
          const idMatches = Number(t.id) === tournamentId;
          if (!idMatches) return false;
          if (adminScope) return true;
          return Number(t.cafe_id) === cafeId;
        });
        if (!target || target.status !== 'scheduled') {
          return sendApiProblem(res, {
            status: 409,
            code: 'NOT_CANCELLABLE',
            message: 'Sadece henüz başlamamış turnuvalar iptal edilebilir.',
          });
        }
        target.status = 'cancelled';
        target.finalized_at = new Date().toISOString();
        return res.json({ success: true });
      },
    });
  };

  return {
    createTournament,
    listTournaments,
    getLeaderboard,
    cancelTournament,
  };
};

module.exports = { createTournamentHandlers };
