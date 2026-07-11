# Admin Location Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Make cafe location editing usable from both admin panels by supporting address search, device geolocation, map clicks, target clearing, and synchronized radius controls.

**Architecture:** Keep the existing shared `MapLocationPicker` as the interaction surface and add a small `lib/geocoding.ts` adapter for Nominatim search. Parent forms continue to own string form state and save validation; the picker only emits coordinate/radius changes and status events. No backend payload or endpoint changes.

**Tech Stack:** React 18, TypeScript, React Testing Library, Jest/ts-jest, Leaflet/react-leaflet, browser Geolocation API, OpenStreetMap Nominatim.

## Global Constraints

- Preserve the existing Riso visual language, dense operational layout, and keyboard-accessible numeric inputs.
- Do not require map tiles or geocoding to save manually entered valid coordinates.
- Keep the backend payload fields unchanged.
- Search requests must be bounded, cancellable, and must not let stale results overwrite newer results.
- Every behavior change gets a focused test before implementation.

---

### Task 1: Add the geocoding adapter

**Files:**
- Create: `lib/geocoding.ts`
- Test: `lib/geocoding.test.ts`

**Interfaces:**
- Produces `searchAddresses(query: string, signal?: AbortSignal): Promise<GeocodingResult[]>`.
- `GeocodingResult` contains `placeId: string`, `displayName: string`, `latitude: number`, and `longitude: number`.

- [ ] **Step 1: Write the failing tests**

```ts
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
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('q=kamp%C3%BCs'), expect.any(Object));
});

it('rejects non-success responses and empty queries without a network call', async () => {
  global.fetch = jest.fn() as jest.Mock;
  await expect(searchAddresses('   ')).resolves.toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
  (fetch as jest.Mock).mockResolvedValue({ ok: false });
  await expect(searchAddresses('x')).rejects.toThrow('Adres araması başarısız.');
});
```

- [ ] **Step 2: Run focused tests and verify the expected missing-module failure**

Run: `npm test -- --runInBand lib/geocoding.test.ts`

Expected: FAIL because `lib/geocoding.ts` does not exist.

- [ ] **Step 3: Implement the minimal adapter**

```ts
export interface GeocodingResult {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export async function searchAddresses(query: string, signal?: AbortSignal): Promise<GeocodingResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const params = new URLSearchParams({ format: 'jsonv2', limit: '5', q: normalized });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error('Adres araması başarısız.');
  const payload = (await response.json()) as Array<Record<string, unknown>>;
  return payload.flatMap((item) => {
    const latitude = Number(item.lat);
    const longitude = Number(item.lon);
    if (!item.place_id || !item.display_name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    return [{ placeId: String(item.place_id), displayName: String(item.display_name), latitude, longitude }];
  });
}
```

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npm test -- --runInBand lib/geocoding.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/geocoding.ts lib/geocoding.test.ts
git commit -m "feat: add address geocoding adapter"
```

### Task 2: Extend the shared map picker

**Files:**
- Modify: `components/shared/MapLocationPicker.tsx`
- Create: `components/shared/MapLocationPicker.test.tsx`

**Interfaces:**
- Add controlled props `primaryRadius`, `secondaryRadius`, `onPrimaryRadiusChange`, and optional secondary radius callback.
- Add optional `enableSearch` and `enableGeolocation` flags, defaulting to `true`.
- Keep existing coordinate and target callback signatures unchanged.

- [ ] **Step 1: Write failing interaction tests**

Test the rendered controls with Leaflet imports mocked out:

```tsx
it('searches an address and writes the result to the active target', async () => {
  (searchAddresses as jest.Mock).mockResolvedValue([
    { placeId: '1', displayName: 'Kampüs Kafe', latitude: 37.741, longitude: 29.101 },
  ]);
  render(<MapLocationPicker {...props} />);
  await userEvent.type(screen.getByRole('searchbox', { name: 'Adres ara' }), 'kampüs');
  await userEvent.click(screen.getByRole('button', { name: 'Adres ara' }));
  await userEvent.click(await screen.findByRole('option', { name: 'Kampüs Kafe' }));
  expect(props.onPrimaryLatitudeChange).toHaveBeenCalledWith('37.741000');
  expect(props.onPrimaryLongitudeChange).toHaveBeenCalledWith('29.101000');
});

it('uses device coordinates and updates the selected secondary target', async () => {
  Object.defineProperty(navigator, 'geolocation', { value: { getCurrentPosition: jest.fn((ok) => ok({ coords: { latitude: 37.742, longitude: 29.102 } })) }, configurable: true });
  render(<MapLocationPicker {...props} enableSecondary />);
  await userEvent.click(screen.getByRole('button', { name: 'İkinci Konum' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cihaz konumumu kullan' }));
  expect(props.onSecondaryLatitudeChange).toHaveBeenCalledWith('37.742000');
  expect(props.onSecondaryLongitudeChange).toHaveBeenCalledWith('29.102000');
});

it('synchronizes the radius slider and clears the active target', async () => {
  render(<MapLocationPicker {...props} />);
  await userEvent.click(screen.getByRole('slider', { name: 'Ana konum yarıçapı' }));
  fireEvent.change(screen.getByRole('slider', { name: 'Ana konum yarıçapı' }), { target: { value: '420' } });
  expect(props.onPrimaryRadiusChange).toHaveBeenCalledWith('420');
  await userEvent.click(screen.getByRole('button', { name: 'Ana konumu temizle' }));
  expect(props.onPrimaryLatitudeChange).toHaveBeenCalledWith('');
  expect(props.onPrimaryLongitudeChange).toHaveBeenCalledWith('');
});
```

- [ ] **Step 2: Run focused tests and verify the controls are missing**

Run: `npm test -- --runInBand components/shared/MapLocationPicker.test.tsx`

Expected: FAIL because the searchbox, geolocation button, slider, and clear action are not rendered.

- [ ] **Step 3: Implement the minimal picker behavior**

Add controlled search state, an `AbortController` per search, geolocation success/error handlers, target-aware coordinate setters, target-aware clear buttons, and synchronized range inputs (`10`–`5000`, step `10`). Render the search result list with `role="listbox"`/`role="option"`, `aria-live` status text, and a manual-entry fallback message. Keep map rendering and existing click behavior unchanged.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npm test -- --runInBand components/shared/MapLocationPicker.test.tsx`

Expected: PASS with no console errors.

- [ ] **Step 5: Commit**

```bash
git add components/shared/MapLocationPicker.tsx components/shared/MapLocationPicker.test.tsx
git commit -m "feat: improve map location picker controls"
```

### Task 3: Wire all admin location forms

**Files:**
- Modify: `components/AdminDashboard.tsx`
- Modify: `components/admin/AddCafeModal.tsx`
- Modify: `components/cafe-admin/LocationManager.tsx`
- Modify: `components/AdminDashboard.test.tsx`
- Modify: `components/CafeDashboard.test.tsx`

**Interfaces:**
- Pass the parent radius values and callbacks to `MapLocationPicker`.
- Keep the existing save handlers and API request payloads unchanged.

- [ ] **Step 1: Add failing integration assertions**

Extend the existing admin tests to assert that the picker’s radius change updates the form and that the new controls are present in both panels. Keep the existing `api.admin.updateCafe` and `api.cafes.updateLocation` payload assertions.

- [ ] **Step 2: Run focused tests and verify the new props are not wired**

Run: `npm test -- --runInBand components/AdminDashboard.test.tsx components/CafeDashboard.test.tsx`

Expected: FAIL on the new control/payload assertions.

- [ ] **Step 3: Wire controlled radius callbacks and accessibility labels**

Pass primary/secondary radius values and setters in all three picker call sites. Keep numeric inputs as the precise source of truth and make slider changes update the same parent form state. Add helper copy that explains search, device location, map click, and manual coordinate entry without hiding existing fields.

- [ ] **Step 4: Run focused integration tests**

Run: `npm test -- --runInBand components/AdminDashboard.test.tsx components/CafeDashboard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Run quality gates**

Run: `npm test -- --runInBand lib/geocoding.test.ts components/shared/MapLocationPicker.test.tsx components/AdminDashboard.test.tsx components/CafeDashboard.test.tsx`, then `npm run typecheck`, `npm run build`.

Expected: all focused tests pass, TypeScript exits 0, and Vite reports a successful production build.

- [ ] **Step 6: Commit**

```bash
git add components/AdminDashboard.tsx components/admin/AddCafeModal.tsx components/cafe-admin/LocationManager.tsx components/AdminDashboard.test.tsx components/CafeDashboard.test.tsx
git commit -m "feat: wire improved location controls into admin panels"
```
