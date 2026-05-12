import { act, renderHook, waitFor } from '@testing-library/react';
import { useCafeSelection } from './useCafeSelection';
import { api } from '../lib/api';
import type { User } from '../types';

jest.mock('../lib/api', () => ({
  api: {
    cafes: {
      list: jest.fn(),
      checkIn: jest.fn(),
    },
  },
}));

describe('useCafeSelection', () => {
  const mockUser: User = {
    id: 7,
    username: 'emin',
    email: 'emin@example.com',
    points: 120,
    wins: 4,
    gamesPlayed: 11,
    role: 'user',
    isAdmin: false,
  };

  const onCheckInSuccess = jest.fn();
  const memoryStorage = new Map<string, string>();

  const mockGeoSuccess = (latitude = 37.741, longitude = 29.101) => {
    const geolocation = {
      getCurrentPosition: jest.fn((onSuccess: (p: GeolocationPosition) => void) => {
        onSuccess({
          coords: {
            latitude,
            longitude,
            accuracy: 5,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON: () => ({}),
          },
          timestamp: Date.now(),
          toJSON: () => ({}),
        } as GeolocationPosition);
      }),
    } as unknown as Geolocation;

    Object.defineProperty(window.navigator, 'geolocation', {
      value: geolocation,
      configurable: true,
    });
  };

  const mockGeoError = (code = 1) => {
    const geolocation = {
      getCurrentPosition: jest.fn(
        (
          _onSuccess: (p: GeolocationPosition) => void,
          onError: (e: GeolocationPositionError) => void
        ) => {
          onError({ code } as GeolocationPositionError);
        }
      ),
    } as unknown as Geolocation;

    Object.defineProperty(window.navigator, 'geolocation', {
      value: geolocation,
      configurable: true,
    });
  };

  /**
   * Mock `navigator.permissions.query` so the hook can probe the OS/browser
   * permission state. Passing `undefined` strips the API entirely (simulates
   * older browsers / non-secure contexts).
   */
  const mockPermissionState = (state: 'granted' | 'denied' | 'prompt' | undefined) => {
    if (state === undefined) {
      Object.defineProperty(window.navigator, 'permissions', {
        value: undefined,
        configurable: true,
      });
      return;
    }
    Object.defineProperty(window.navigator, 'permissions', {
      value: {
        query: jest.fn().mockResolvedValue({ state }),
      },
      configurable: true,
    });
  };

  const mockGeoCoarseTimeoutThenPreciseSuccess = (latitude = 37.7415, longitude = 29.1017) => {
    const geolocation = {
      getCurrentPosition: jest.fn(
        (
          onSuccess: (p: GeolocationPosition) => void,
          onError: (e: GeolocationPositionError) => void,
          options?: PositionOptions
        ) => {
          if (options?.enableHighAccuracy === false) {
            onError({ code: 3 } as GeolocationPositionError);
            return;
          }

          onSuccess({
            coords: {
              latitude,
              longitude,
              accuracy: 18,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          } as GeolocationPosition);
        }
      ),
    } as unknown as Geolocation;

    Object.defineProperty(window.navigator, 'geolocation', {
      value: geolocation,
      configurable: true,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    onCheckInSuccess.mockReset();
    memoryStorage.clear();
    mockGeoSuccess();

    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) =>
          memoryStorage.has(key) ? memoryStorage.get(key)! : null
        ),
        setItem: jest.fn((key: string, value: string) => {
          memoryStorage.set(key, String(value));
        }),
        removeItem: jest.fn((key: string) => {
          memoryStorage.delete(key);
        }),
        clear: jest.fn(() => {
          memoryStorage.clear();
        }),
      },
      writable: true,
    });
  });

  it('handles empty cafe list safely', async () => {
    (api.cafes.list as jest.Mock).mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );

    await waitFor(() => {
      expect(result.current.cafes).toEqual([]);
      expect(result.current.selectedCafeId).toBeNull();
    });
  });

  it('restores saved cafe and table when cache is valid', async () => {
    localStorage.setItem('last_cafe_id', '2');
    localStorage.setItem('last_table_number', '9');
    (api.cafes.list as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Kafe A', table_count: 20 },
      { id: 2, name: 'Kafe B', table_count: 30 },
    ]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );

    await waitFor(() => {
      expect(result.current.selectedCafeId).toBe('2');
      expect(result.current.tableNumber).toBe('9');
    });
  });

  it('falls back to first cafe and clears stale saved cafe id', async () => {
    localStorage.setItem('last_cafe_id', '999');
    (api.cafes.list as jest.Mock).mockResolvedValue([
      { id: 44, name: 'Tek Kafe', table_count: 10 },
    ]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );

    await waitFor(() => {
      expect(result.current.selectedCafeId).toBe('44');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('last_cafe_id');
    });
  });

  it('surfaces load error when cafe fetch fails', async () => {
    (api.cafes.list as jest.Mock).mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );

    await waitFor(() => {
      expect(result.current.error).toContain('Kafeler yüklenemedi');
      expect(result.current.error).toContain('network down');
    });
  });

  it('validates missing data and table range', async () => {
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 1, name: 'Kafe A', table_count: 5 }]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );

    await waitFor(() => expect(result.current.selectedCafeId).toBe('1'));

    await act(async () => {
      await result.current.checkIn();
    });
    expect(result.current.error).toBe('Lütfen kafe ve masa numarası seçin.');

    act(() => {
      result.current.setTableNumber('99');
    });
    await act(async () => {
      await result.current.checkIn();
    });
    expect(result.current.error).toContain('Masa numarası 1 ile 5 arasında olmalıdır.');
  });

  it('updates location status when permission is granted', async () => {
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 3, name: 'Kafe C', table_count: 15 }]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );
    await waitFor(() => expect(result.current.selectedCafeId).toBe('3'));

    await act(async () => {
      await result.current.requestLocationAccess();
    });

    expect(result.current.locationStatus).toBe('ready');
    expect(result.current.error).toBeNull();
  });

  it('shows permission error when geolocation is denied', async () => {
    mockGeoError(1);
    mockPermissionState('denied');
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 4, name: 'Kafe D', table_count: 10 }]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );
    await waitFor(() => expect(result.current.selectedCafeId).toBe('4'));

    await act(async () => {
      await result.current.requestLocationAccess();
    });

    expect(result.current.locationStatus).toBe('denied');
    expect(result.current.error).toContain('Konum izni reddedildi');
    // Backend supports verification code fallback — surface that to the user
    expect(result.current.error).toContain('Masa Doğrulama Kodu');
  });

  it('explains mobile system-level location off when browser permission is granted but geo still fails', async () => {
    // The "Allow" was granted in the browser, but iOS Settings → Privacy →
    // Location Services is off (or the Android global toggle). Browser still
    // returns code 1 in that case. We want a DIFFERENT message than plain
    // "browser permission denied" so the user knows where to look.
    mockGeoError(1);
    mockPermissionState('granted');
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 5, name: 'Kafe E', table_count: 10 }]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );
    await waitFor(() => expect(result.current.selectedCafeId).toBe('5'));

    await act(async () => {
      await result.current.requestLocationAccess();
    });

    expect(result.current.locationStatus).toBe('denied');
    expect(result.current.error).toContain('Tarayıcı konum izni verilmiş');
    expect(result.current.error).toContain('Konum Servisleri');
    expect(result.current.error).toContain('Masa Doğrulama Kodu');
  });

  it('falls back to legacy denial message when Permissions API is unsupported', async () => {
    // Older browsers / iOS Safari pre-16 expose no `navigator.permissions`.
    // We should not crash — the legacy "permission denied" copy still ships,
    // including the verification-code fallback hint.
    mockGeoError(1);
    mockPermissionState(undefined);
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 6, name: 'Kafe F', table_count: 10 }]);

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );
    await waitFor(() => expect(result.current.selectedCafeId).toBe('6'));

    await act(async () => {
      await result.current.requestLocationAccess();
    });

    expect(result.current.locationStatus).toBe('denied');
    expect(result.current.error).toContain('Konum izni reddedildi');
    expect(result.current.error).toContain('Masa Doğrulama Kodu');
  });

  it('falls back to high accuracy when coarse location times out', async () => {
    mockGeoCoarseTimeoutThenPreciseSuccess();
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 8, name: 'Kafe Z', table_count: 20 }]);
    (api.cafes.checkIn as jest.Mock).mockResolvedValueOnce({
      cafeName: 'Kafe Z',
      table: 'MASA08',
    });

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );

    await waitFor(() => expect(result.current.selectedCafeId).toBe('8'));

    act(() => {
      result.current.setTableNumber('8');
    });

    await act(async () => {
      await result.current.checkIn();
    });

    expect(api.cafes.checkIn).toHaveBeenCalledWith({
      cafeId: '8',
      tableNumber: 8,
      latitude: 37.7415,
      longitude: 29.1017,
      accuracy: 18,
    });
    expect(result.current.error).toBeNull();
    expect(result.current.locationStatus).toBe('ready');
  });

  it('maps network errors on failed check-in', async () => {
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 1, name: 'Kafe A', table_count: 10 }]);
    (api.cafes.checkIn as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );
    await waitFor(() => expect(result.current.selectedCafeId).toBe('1'));

    act(() => {
      result.current.setTableNumber('2');
    });
    await act(async () => {
      await result.current.checkIn();
    });

    expect(result.current.error).toBe(
      'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'
    );
  });

  it('completes successful check-in and persists last selection', async () => {
    (api.cafes.list as jest.Mock).mockResolvedValue([{ id: 5, name: 'Kafe X', table_count: 10 }]);
    (api.cafes.checkIn as jest.Mock).mockResolvedValueOnce({
      cafeName: 'Kafe X',
      table: 'MASA03',
    });

    const { result } = renderHook(() =>
      useCafeSelection({ currentUser: mockUser, onCheckInSuccess })
    );
    await waitFor(() => expect(result.current.selectedCafeId).toBe('5'));

    act(() => {
      result.current.setTableNumber('3');
    });

    await act(async () => {
      await result.current.checkIn();
    });

    expect(api.cafes.checkIn).toHaveBeenCalledWith({
      cafeId: '5',
      tableNumber: 3,
      latitude: 37.741,
      longitude: 29.101,
      accuracy: 5,
    });
    expect(onCheckInSuccess).toHaveBeenCalledWith('Kafe X', 'MASA03', '5');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('last_cafe_id', '5');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('last_table_number', '3');
  });
});
