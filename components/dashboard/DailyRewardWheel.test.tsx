/**
 * DailyRewardWheel — birim testleri
 *
 * Render bug fix doğrulaması:
 *   - Her dilim `background` inline style (conic-gradient) almalı
 *   - clipPath / WebkitClipPath kesinlikle olmamalı
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DailyRewardWheel } from './DailyRewardWheel';

// framer-motion — passthrough mock
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// api mock
jest.mock('../../lib/api', () => ({
  api: {
    wheel: {
      get: jest.fn(),
      spin: jest.fn(),
    },
  },
}));

import { api } from '../../lib/api';

const WHEEL_SLICES = [
  { points: 10, weight: 75 },
  { points: 50, weight: 20 },
  { points: 100, weight: 4 },
  { points: 500, weight: 1 },
];

const makeStatus = (overrides = {}) => ({
  cafeId: 1,
  cafeName: 'Test Kafe',
  wheel: WHEEL_SLICES,
  alreadySpunToday: false,
  lastSpin: null as { id: number; points_won: number; spun_at: string } | null,
  ...overrides,
});

describe('DailyRewardWheel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('cafeId yoksa hiçbir şey render etmez', () => {
    const { container } = render(<DailyRewardWheel cafeId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('yükleme sırasında skeleton gösterir', async () => {
    // get asla resolve etmesin
    (api.wheel.get as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<DailyRewardWheel cafeId={1} />);
    expect(screen.getByText(/Çark yükleniyor/i)).toBeInTheDocument();
  });

  it('status yüklendikten sonra ÇEVİR butonunu gösterir', async () => {
    (api.wheel.get as jest.Mock).mockResolvedValue(makeStatus());

    render(<DailyRewardWheel cafeId={1} />);
    await waitFor(() => expect(screen.getByTestId('wheel-spin-button')).toBeInTheDocument());
    expect(screen.getByTestId('wheel-spin-button')).toHaveTextContent('ÇEVİR');
  });

  // ─── Render bug fix: background conic-gradient, clipPath YOK ─────────────

  it('her dilim background:conic-gradient inline style alır', async () => {
    (api.wheel.get as jest.Mock).mockResolvedValue(makeStatus());

    render(<DailyRewardWheel cafeId={1} />);
    await waitFor(() => screen.getByTestId('wheel-slice-0'));

    for (let i = 0; i < WHEEL_SLICES.length; i++) {
      const slice = screen.getByTestId(`wheel-slice-${i}`);
      const bg = (slice as HTMLElement).style.background;
      expect(bg).toMatch(/conic-gradient/);
    }
  });

  it('hiçbir dilimde clipPath veya WebkitClipPath olmamalı', async () => {
    (api.wheel.get as jest.Mock).mockResolvedValue(makeStatus());

    render(<DailyRewardWheel cafeId={1} />);
    await waitFor(() => screen.getByTestId('wheel-slice-0'));

    for (let i = 0; i < WHEEL_SLICES.length; i++) {
      const slice = screen.getByTestId(`wheel-slice-${i}`) as HTMLElement;
      expect(slice.style.clipPath).toBeFalsy();
      expect(slice.style.getPropertyValue('-webkit-clip-path')).toBeFalsy();
    }
  });

  it("conic-gradient startDeg doğru hesaplanır: ikinci dilim 270deg'den başlar (75/100*360=270)", async () => {
    (api.wheel.get as jest.Mock).mockResolvedValue(makeStatus());

    render(<DailyRewardWheel cafeId={1} />);
    await waitFor(() => screen.getByTestId('wheel-slice-1'));

    const slice1 = screen.getByTestId('wheel-slice-1') as HTMLElement;
    expect(slice1.style.background).toMatch(/from 270deg/);
  });

  // ─── Disabled state ────────────────────────────────────────────────────────

  it('bugün çevrilmişse buton disabled', async () => {
    (api.wheel.get as jest.Mock).mockResolvedValue(
      makeStatus({ alreadySpunToday: true, lastSpin: { id: 1, points_won: 10, spun_at: '' } })
    );

    render(<DailyRewardWheel cafeId={1} />);
    await waitFor(() => screen.getByTestId('wheel-spin-button'));
    expect(screen.getByTestId('wheel-spin-button')).toBeDisabled();
  });

  // ─── API hatası ────────────────────────────────────────────────────────────

  it('API hatasında hata mesajı gösterir', async () => {
    (api.wheel.get as jest.Mock).mockRejectedValue(new Error('Sunucu hatası'));

    render(<DailyRewardWheel cafeId={1} />);
    await waitFor(() => expect(screen.getByText('Sunucu hatası')).toBeInTheDocument());
  });
});
