export const GAME_ASSETS = {
  backgrounds: {
    reflexRush: '/assets/games/kenney/backgrounds/blue_grass.png',
    rhythmCopy: '/assets/games/kenney/backgrounds/blue_land.png',
    oddEvenSprint: '/assets/games/kenney/backgrounds/blue_desert.png',
  },
  hud: {
    coin: '/assets/games/kenney/hud/hudCoin.png',
    heart: '/assets/games/kenney/hud/hudHeart_full.png',
    jewel: '/assets/games/kenney/hud/hudJewel_blue.png',
  },
  sfx: {
    select: '/assets/games/sfx/select.wav',
    success: '/assets/games/sfx/success.wav',
    fail: '/assets/games/sfx/fail.wav',
    hit: '/assets/games/sfx/hit.wav',
  },
} as const;

export type GameSfxKey = keyof typeof GAME_ASSETS.sfx;

