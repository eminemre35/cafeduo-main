export interface GeocodingResult {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchAddresses(
  query: string,
  signal?: AbortSignal
): Promise<GeocodingResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    limit: '5',
    q: normalized,
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) throw new Error('Adres araması başarısız.');

  const payload = (await response.json()) as Array<Record<string, unknown>>;
  return payload.flatMap((item) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (
      item.place_id == null ||
      !item.display_name ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return [];
    }

    return [
      {
        placeId: String(item.place_id),
        displayName: String(item.display_name),
        latitude,
        longitude,
      },
    ];
  });
}
