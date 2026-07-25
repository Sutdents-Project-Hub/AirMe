import type { StyleSpecification } from '@maplibre/maplibre-react-native';

/**
 * Uses Mapbox Static Tiles rather than a Mapbox GL style document so the existing MapLibre Web
 * and native renderers can share one portable, read-only style. The token is intentionally a
 * Mapbox public token and must be restricted to the deployed Web origin where possible.
 */
export function createMapboxRasterStyle(publicToken: string): StyleSpecification {
  const token = encodeURIComponent(publicToken);
  return {
    version: 8,
    name: 'AirMe Mapbox Streets',
    sources: {
      'mapbox-streets': {
        type: 'raster',
        tiles: [
          `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}?access_token=${token}`,
        ],
        tileSize: 512,
        attribution: '© Mapbox © OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'mapbox-streets', type: 'raster', source: 'mapbox-streets' }],
  };
}
