/**
 * MapLocationPicker — shared Riso Kantin map picker for cafe location editing.
 *
 * Renders a Leaflet map with:
 *   - A target switcher (Primary / Secondary location pair)
 *   - Click-to-pick: clicking the map writes lat/lng (6 decimal places) into
 *     the currently selected target slot via the supplied setters
 *   - Visual ring for each location showing its check-in radius
 *
 * The component is purely the map; the lat/lng/radius **inputs** themselves
 * remain in the parent so callers can pick their own layout. The shared map
 * keeps Leaflet's loading + tile-attribution + Riso colour scheme in one
 * place so both AdminDashboard's cafe editor and cafe-admin's
 * LocationManager stay in sync.
 *
 * Leaflet is loaded dynamically (no top-level import) so the bundle doesn't
 * pay the cost on pages that don't need a map. The leaflet.css link is
 * injected once per session via an id-marked <link> in <head>.
 */

import React, { useEffect, useMemo, useState } from 'react';

interface LeafletBundle {
  MapContainer: React.ComponentType<any>;
  TileLayer: React.ComponentType<any>;
  Marker: React.ComponentType<any>;
  Circle: React.ComponentType<any>;
  useMapEvents: (handlers: {
    click?: (event: { latlng?: { lat?: number; lng?: number } }) => void;
  }) => unknown;
}

/** Internal — wires Leaflet's click events into our pick callback. Lives
 *  inside the map's React tree so it can call useMapEvents safely. */
const MapClickHandler: React.FC<{
  onPick: (lat: number, lng: number) => void;
  useMapEvents: LeafletBundle['useMapEvents'];
}> = ({ onPick, useMapEvents }) => {
  useMapEvents({
    click: (event) => {
      const lat = Number(event?.latlng?.lat);
      const lng = Number(event?.latlng?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      onPick(lat, lng);
    },
  });
  return null;
};

interface MapLocationPickerProps {
  /** Primary location latitude as string ('' if unset) — uses string so
   *  caller's controlled input pattern matches without converting. */
  primaryLatitude: string;
  primaryLongitude: string;
  /** Numeric radius in metres for the primary location ring. */
  primaryRadius: number;

  /** Optional secondary location pair. Omit/leave empty to hide the
   *  secondary target switch and skip rendering the second ring. */
  secondaryLatitude?: string;
  secondaryLongitude?: string;
  secondaryRadius?: number;

  onPrimaryLatitudeChange: (value: string) => void;
  onPrimaryLongitudeChange: (value: string) => void;
  onSecondaryLatitudeChange?: (value: string) => void;
  onSecondaryLongitudeChange?: (value: string) => void;

  /** If true, the secondary location switch is shown. Default: true if any
   *  of the secondary props are provided. */
  enableSecondary?: boolean;

  /** Height of the map area. Default: responsive (260px → 300px sm+). */
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [37.741, 29.101]; // Pamukkale Üniversitesi

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  primaryLatitude,
  primaryLongitude,
  primaryRadius,
  secondaryLatitude = '',
  secondaryLongitude = '',
  secondaryRadius = 150,
  onPrimaryLatitudeChange,
  onPrimaryLongitudeChange,
  onSecondaryLatitudeChange,
  onSecondaryLongitudeChange,
  enableSecondary,
  className = '',
}) => {
  const allowSecondary =
    enableSecondary ?? Boolean(onSecondaryLatitudeChange && onSecondaryLongitudeChange);

  const [mapTarget, setMapTarget] = useState<'primary' | 'secondary'>('primary');
  const [leafletBundle, setLeafletBundle] = useState<LeafletBundle | null>(null);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  const primaryLat = Number(primaryLatitude);
  const primaryLng = Number(primaryLongitude);
  const secondaryLat = Number(secondaryLatitude);
  const secondaryLng = Number(secondaryLongitude);

  const primaryCoords = useMemo<[number, number] | null>(() => {
    if (!Number.isFinite(primaryLat) || !Number.isFinite(primaryLng)) return null;
    if (primaryLat < -90 || primaryLat > 90 || primaryLng < -180 || primaryLng > 180) return null;
    return [primaryLat, primaryLng];
  }, [primaryLat, primaryLng]);

  const secondaryCoords = useMemo<[number, number] | null>(() => {
    if (!allowSecondary) return null;
    if (!Number.isFinite(secondaryLat) || !Number.isFinite(secondaryLng)) return null;
    if (secondaryLat < -90 || secondaryLat > 90 || secondaryLng < -180 || secondaryLng > 180) {
      return null;
    }
    return [secondaryLat, secondaryLng];
  }, [allowSecondary, secondaryLat, secondaryLng]);

  // Recenter the map when the active target gets a fresh coordinate. Stable
  // string key avoids constant rerenders while coordinates are typed digit by
  // digit (re-keying remounts the MapContainer, expensive).
  const mapCenter = useMemo<[number, number]>(() => {
    if (mapTarget === 'secondary' && secondaryCoords) return secondaryCoords;
    if (primaryCoords) return primaryCoords;
    if (secondaryCoords) return secondaryCoords;
    return DEFAULT_CENTER;
  }, [mapTarget, primaryCoords, secondaryCoords]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userAgent = String(navigator?.userAgent || '').toLowerCase();
    if (userAgent.includes('jsdom')) return;

    // Inject leaflet.css once. Marked with an id so duplicate mounts (e.g.
    // admin + cafe-admin in the same SPA session) don't re-add the tag.
    const existingCss = document.getElementById('leaflet-style-cafeduo');
    if (!existingCss) {
      const link = document.createElement('link');
      link.id = 'leaflet-style-cafeduo';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let isMounted = true;
    void Promise.all([import('react-leaflet'), import('leaflet')])
      .then(([reactLeaflet, leafletModule]) => {
        if (!isMounted) return;

        const Leaflet = (leafletModule as { default?: any }).default || leafletModule;
        const defaultIcon = Leaflet.icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        Leaflet.Marker.prototype.options.icon = defaultIcon;

        setLeafletBundle({
          MapContainer: reactLeaflet.MapContainer,
          TileLayer: reactLeaflet.TileLayer,
          Marker: reactLeaflet.Marker,
          Circle: reactLeaflet.Circle,
          useMapEvents: reactLeaflet.useMapEvents,
        });
      })
      .catch((error) => {
        console.error('Leaflet map load failed', error);
        if (isMounted) {
          setMapLoadError('Harita yüklenemedi. Koordinatları elle girerek devam edebilirsiniz.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMapPick = (lat: number, lng: number) => {
    if (mapTarget === 'secondary' && allowSecondary) {
      onSecondaryLatitudeChange?.(lat.toFixed(6));
      onSecondaryLongitudeChange?.(lng.toFixed(6));
      return;
    }
    onPrimaryLatitudeChange(lat.toFixed(6));
    onPrimaryLongitudeChange(lng.toFixed(6));
  };

  const Leaflet = leafletBundle;

  return (
    <div className={`border-2 border-carbon bg-paper-deep p-3 space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-carbon-soft uppercase tracking-[0.12em] font-bold font-riso-body">
          Haritadan Nokta Seç
        </p>
        {allowSecondary && (
          <div className="inline-flex border-2 border-carbon bg-paper">
            <button
              type="button"
              onClick={() => setMapTarget('primary')}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.1em] font-riso-display transition-colors ${
                mapTarget === 'primary'
                  ? 'bg-riso-blue text-paper font-bold'
                  : 'text-carbon hover:bg-riso-blue/15'
              }`}
            >
              Ana Konum
            </button>
            <button
              type="button"
              onClick={() => setMapTarget('secondary')}
              className={`px-3 py-1.5 text-xs uppercase tracking-[0.1em] font-riso-display transition-colors border-l-2 border-carbon ${
                mapTarget === 'secondary'
                  ? 'bg-riso-pink text-carbon font-bold'
                  : 'text-carbon hover:bg-riso-pink/15'
              }`}
            >
              İkinci Konum
            </button>
          </div>
        )}
      </div>

      {Leaflet ? (
        <div className="h-[260px] sm:h-[300px] overflow-hidden border-2 border-carbon">
          <Leaflet.MapContainer
            key={`${mapCenter[0].toFixed(4)}-${mapCenter[1].toFixed(4)}`}
            center={mapCenter}
            zoom={15}
            scrollWheelZoom
            className="h-full w-full"
          >
            <Leaflet.TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onPick={handleMapPick} useMapEvents={Leaflet.useMapEvents} />
            {primaryCoords && (
              <>
                <Leaflet.Marker position={primaryCoords} />
                <Leaflet.Circle
                  center={primaryCoords}
                  radius={Math.max(10, Number(primaryRadius) || 150)}
                  pathOptions={{ color: '#1D4ED8', fillColor: '#1D4ED8', fillOpacity: 0.15 }}
                />
              </>
            )}
            {secondaryCoords && (
              <>
                <Leaflet.Marker position={secondaryCoords} />
                <Leaflet.Circle
                  center={secondaryCoords}
                  radius={Math.max(10, Number(secondaryRadius) || 150)}
                  pathOptions={{ color: '#FF3E94', fillColor: '#FF3E94', fillOpacity: 0.15 }}
                />
              </>
            )}
          </Leaflet.MapContainer>
        </div>
      ) : (
        <div className="h-[130px] border-2 border-carbon-muted bg-paper-dim flex items-center justify-center text-sm text-carbon-soft px-4 text-center font-riso-body">
          {mapLoadError || 'Harita yükleniyor...'}
        </div>
      )}

      <p className="text-xs text-carbon-muted font-riso-body">
        Haritada tıkladığın nokta, seçili hedefe (
        {mapTarget === 'primary' ? 'ana konum' : 'ikinci konum'}) otomatik yazılır. Yarıçap halkası
        içinde kalan kullanıcılar check-in yapabilir.
      </p>
    </div>
  );
};

export default MapLocationPicker;
