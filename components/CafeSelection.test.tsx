import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CafeSelection } from './CafeSelection';
import { api } from '../lib/api';
import { User } from '../types';

jest.mock('../lib/api', () => ({
  api: {
    cafes: {
      list: jest.fn(),
      checkIn: jest.fn(),
    },
  },
}));

describe('CafeSelection', () => {
  const currentUser: User = {
    id: 1,
    username: 'emin',
    email: 'emin@example.com',
    points: 0,
    wins: 0,
    gamesPlayed: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (api.cafes.list as jest.Mock).mockResolvedValue([
      { id: '10', name: 'Merkez Kafe', table_count: 12 },
    ]);
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'last_cafe_id') return null;
      if (key === 'last_table_number') return null;
      return null;
    });
  });

  it('loads cafes and renders default selection', async () => {
    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={jest.fn()} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });
    expect(screen.getByText('Kafe Giriş')).toBeInTheDocument();
    expect(screen.getByText('Merkez Kafe')).toBeInTheDocument();
  });

  it('keeps submit disabled when table number is missing', async () => {
    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={jest.fn()} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText('PIN kodu girişi'), { target: { value: '1234' } });
    expect(screen.getByText('GİRİŞ YAP & OYNA')).toBeDisabled();
  });

  it('keeps submit disabled when pin is short', async () => {
    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={jest.fn()} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('PIN kodu girişi'), { target: { value: '12' } });
    expect(screen.getByText('GİRİŞ YAP & OYNA')).toBeDisabled();
    expect(screen.getByText(/2 hane kaldı/i)).toBeInTheDocument();
  });

  it('submits check-in and stores last cafe/table on success', async () => {
    const onCheckInSuccess = jest.fn();
    (api.cafes.checkIn as jest.Mock).mockResolvedValueOnce({
      cafeName: 'Merkez Kafe',
      table: 'Masa 5',
    });

    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={onCheckInSuccess} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('PIN kodu girişi'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('GİRİŞ YAP & OYNA'));

    await waitFor(() => {
      expect(api.cafes.checkIn).toHaveBeenCalledWith({
        cafeId: '10',
        tableNumber: 5,
        pin: '1234',
      });
    });
    expect(onCheckInSuccess).toHaveBeenCalledWith('Merkez Kafe', 'Masa 5', '10');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('last_cafe_id', '10');
    expect(window.localStorage.setItem).toHaveBeenCalledWith('last_table_number', '5');
  });

  it('falls back to cafe object response shape from backend', async () => {
    const onCheckInSuccess = jest.fn();
    (api.cafes.checkIn as jest.Mock).mockResolvedValueOnce({
      success: true,
      cafe: { id: '10', name: 'Merkez Kafe' },
    });

    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={onCheckInSuccess} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText('PIN kodu girişi'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('GİRİŞ YAP & OYNA'));

    await waitFor(() => {
      expect(onCheckInSuccess).toHaveBeenCalledWith('Merkez Kafe', 'MASA04', '10');
    });
  });

  it('uses first available cafe when saved cafe id is stale', async () => {
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === 'last_cafe_id') return '999';
      if (key === 'last_table_number') return '2';
      return null;
    });
    (api.cafes.list as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Kafe 1', table_count: 10 },
      { id: 2, name: 'Kafe 2', table_count: 10 },
    ]);
    (api.cafes.checkIn as jest.Mock).mockResolvedValueOnce({
      cafeName: 'Kafe 1',
      table: 'MASA02',
    });

    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={jest.fn()} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByLabelText('PIN kodu girişi'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('GİRİŞ YAP & OYNA'));

    await waitFor(() => {
      expect(api.cafes.checkIn).toHaveBeenCalledWith({
        cafeId: '1',
        tableNumber: 2,
        pin: '1234',
      });
    });
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('last_cafe_id');
  });

  it('shows network-friendly error on fetch failure during check-in', async () => {
    (api.cafes.checkIn as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<CafeSelection currentUser={currentUser} onCheckInSuccess={jest.fn()} />);

    await waitFor(() => {
      expect(api.cafes.list).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('PIN kodu girişi'), { target: { value: '1234' } });
    fireEvent.click(screen.getByText('GİRİŞ YAP & OYNA'));

    await waitFor(() => {
      expect(screen.getByText(/Sunucuya bağlanılamadı/)).toBeInTheDocument();
    });
  });
});
