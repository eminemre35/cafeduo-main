# Admin Location Editor Design

**Date:** 2026-07-11  
**Scope:** Global Admin Dashboard and Cafe Admin location settings

## Goal

Make cafe location setup reliable for operators who do not want to type raw coordinates: search an address, use the device's current position, or click the map, then adjust and preview the check-in radius before saving.

## Current problem

The shared `MapLocationPicker` supports map clicks and coordinate markers, while the global admin form exposes manual latitude/longitude fields. The global admin flow has no address search or device-location action, and both flows make radius editing numeric-only. Operators must guess coordinates and cannot quickly clear or compare the selected location.

## Design

Extend `MapLocationPicker` as the shared interaction surface:

- Add an address search input with a small result list. A selected result recenters the map and writes coordinates to the active target.
- Add a device-location action using `navigator.geolocation`, writing coordinates to the active target with six decimal places.
- Keep map-click selection and primary/secondary target switching.
- Add a radius slider synchronized with the existing numeric radius input and display the active radius ring.
- Add clear actions for the active target; clearing secondary coordinates also clears its radius input at the parent level when the parent opts into that behavior.
- Expose loading, empty, and error states with accessible labels and live status text. Do not block manual coordinate entry when map tiles or search are unavailable.

The backend payload remains unchanged (`latitude`, `longitude`, `radius`, `secondary_latitude`, `secondary_longitude`, `secondary_radius`). Both `AdminDashboard` and `LocationManager` pass the active target values and callbacks into the shared picker. Search uses a small geocoding helper with a bounded result list and no persistent client-side state.

## Interaction and visual rules

- Keep the existing dense operational Riso style, strong borders, and responsive layout.
- Put search and location actions above the map, with explicit labels and disabled/loading states.
- Keep numeric inputs available beside the map for precision and keyboard access.
- Use `aria-label`, `aria-live`, and visible error text for search, geolocation, and coordinate validation.
- Never require a map tile network request for saving manually entered coordinates.

## Error handling

- Geocoder network failure or zero results: show an inline message and preserve current coordinates.
- Geolocation denied/unavailable/timeout: show an actionable message and preserve current coordinates.
- Invalid coordinates/radius: keep the existing parent validation and prevent save.
- Search requests are ignored after unmount and stale results cannot overwrite a newer query.

## Testing

- Shared picker tests cover search result selection, geolocation success/failure, target switching, radius synchronization, and clear actions.
- Admin dashboard tests cover the new callbacks reaching the existing cafe update payload.
- Cafe admin tests cover the same actions without changing the backend contract.
- Run focused Jest tests, then the full unit suite, typecheck, and frontend build.
