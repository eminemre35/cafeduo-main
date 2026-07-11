import { searchAddresses } from './geocoding';

describe('searchAddresses', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns bounded normalized Nominatim results', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { place_id: 11, display_name: 'Kampüs Kafe', lat: '37.741', lon: '29.101' },
        { place_id: 12, display_name: 'İkinci sonuç', lat: '37.742', lon: '29.102' },
      ],
    }) as jest.Mock;

    await expect(searchAddresses('kampüs')).resolves.toEqual([
      { placeId: '11', displayName: 'Kampüs Kafe', latitude: 37.741, longitude: 29.101 },
      { placeId: '12', displayName: 'İkinci sonuç', latitude: 37.742, longitude: 29.102 },
    ]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=kamp%C3%BCs'),
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
  });

  it('rejects non-success responses and skips empty queries without a network call', async () => {
    global.fetch = jest.fn() as jest.Mock;

    await expect(searchAddresses('   ')).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();

    (fetch as jest.Mock).mockResolvedValue({ ok: false });
    await expect(searchAddresses('x')).rejects.toThrow('Adres araması başarısız.');
  });
});
