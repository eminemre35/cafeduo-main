// API Layer - Now using Firebase
import { firebaseAuth, firebaseUsers, firebaseCafes, firebaseGames, firebaseRewards } from './firebase';
import type { User, GameRequest, Reward, Cafe } from '../types';

// Re-export Firebase functions as the main API
export const api = {
  // AUTH
  auth: {
    login: async (email: string, password: string): Promise<User> => {
      return await firebaseAuth.login(email, password) as User;
    },
    register: async (username: string, email: string, password: string): Promise<User> => {
      return await firebaseAuth.register(email, password, username) as User;
    },
    googleLogin: async (): Promise<User> => {
      return await firebaseAuth.googleLogin() as User;
    },
    logout: async (): Promise<void> => {
      return await firebaseAuth.logout();
    }
  },

  // USERS
  users: {
    get: async (userId: string): Promise<User | null> => {
      return await firebaseUsers.get(userId) as User | null;
    },
    update: async (userData: Partial<User> & { id: string | number }): Promise<User> => {
      return await firebaseUsers.update(userData.id.toString(), userData) as User;
    },
    getActiveGame: async (username: string): Promise<GameRequest | null> => {
      // Check if user has an active game
      const games = await firebaseGames.getAll();
      const activeGame = games.find((g: any) =>
        (g.hostName === username || g.guestName === username) &&
        (g.status === 'waiting' || g.status === 'playing' || g.status === 'active')
      );
      return activeGame ? (activeGame as GameRequest) : null;
    }
  },

  // CAFES
  cafes: {
    list: async (): Promise<Cafe[]> => {
      return await firebaseCafes.getAll() as Cafe[];
    },
    get: async (cafeId: string): Promise<Cafe | null> => {
      return await firebaseCafes.get(cafeId) as Cafe | null;
    },
    checkIn: async (params: { userId: string | number; cafeId: string | number; tableNumber: number; pin: string }) => {
      return await firebaseCafes.checkIn(
        params.userId.toString(),
        params.cafeId.toString(),
        params.tableNumber,
        params.pin
      );
    },
    updatePin: async (cafeId: string | number, pin: string, userId?: string | number) => {
      return await firebaseCafes.updatePin(cafeId.toString(), pin);
    }
  },

  // GAMES
  games: {
    list: async (): Promise<GameRequest[]> => {
      return await firebaseGames.getAll() as GameRequest[];
    },
    get: async (gameId: number | string): Promise<GameRequest> => {
      return await firebaseGames.get(gameId.toString()) as GameRequest;
    },
    create: async (data: Partial<GameRequest>): Promise<GameRequest> => {
      return await firebaseGames.create(data) as GameRequest;
    },
    join: async (gameId: number | string, guestName: string): Promise<GameRequest> => {
      await firebaseGames.join(gameId.toString(), guestName);
      return await firebaseGames.get(gameId.toString()) as GameRequest;
    },
    move: async (gameId: number | string, data: { gameState: any }) => {
      await firebaseGames.updateState(gameId.toString(), data.gameState);
    },
    finish: async (gameId: number | string, winner: string) => {
      await firebaseGames.finish(gameId.toString(), winner);
    },
    delete: async (gameId: number | string) => {
      await firebaseGames.delete(gameId.toString());
    },
    // REALTIME LISTENERS
    onGameChange: firebaseGames.onGameChange,
    onLobbyChange: firebaseGames.onLobbyChange
  },

  // REWARDS / SHOP
  rewards: {
    list: async (): Promise<Reward[]> => {
      return await firebaseRewards.getAll() as Reward[];
    },
    create: async (data: Partial<Reward> & { cafeId?: string | number }): Promise<Reward> => {
      return await firebaseRewards.create(data) as Reward;
    },
    delete: async (rewardId: string | number): Promise<void> => {
      return await firebaseRewards.delete(rewardId.toString());
    }
  },

  shop: {
    buy: async (userId: string | number, rewardId: string | number): Promise<{ success: boolean; newPoints: number; reward?: any; error?: string }> => {
      return await firebaseRewards.buy(userId.toString(), rewardId.toString());
    },
    inventory: async (userId: string | number): Promise<any[]> => {
      return await firebaseRewards.getUserItems(userId.toString());
    }
  },

  // LEADERBOARD
  leaderboard: {
    get: async (): Promise<User[]> => {
      return await firebaseUsers.getLeaderboard(10) as User[];
    }
  },

  // ADMIN (for AdminDashboard)
  admin: {
    getUsers: async (): Promise<User[]> => {
      return await firebaseUsers.getAll() as User[];
    },
    getGames: async (): Promise<GameRequest[]> => {
      return await firebaseGames.getAllGames() as GameRequest[];
    },
    updateUserRole: async (userId: number | string, role: string): Promise<void> => {
      await firebaseUsers.update(userId.toString(), { role });
    },
    updateCafe: async (cafeId: string | number, data: Partial<Cafe>): Promise<void> => {
      await firebaseCafes.update(cafeId.toString(), data);
    },
    createCafe: async (data: Partial<Cafe>): Promise<Cafe> => {
      return await firebaseCafes.create(data) as Cafe;
    }
  },

  // COUPONS (for CafeDashboard)
  coupons: {
    use: async (code: string): Promise<{ success: boolean; item?: any }> => {
      return await firebaseRewards.useCoupon(code);
    }
  }
};

// Export Firebase auth for direct access if needed
export { firebaseAuth } from './firebase';