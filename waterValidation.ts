/**
 * Water detection for planting logistics.
 *
 * Two independent free/public sources, no API keys:
 * 1. OpenStreetMap Overpass API — detects rivers, lakes, ponds and the
 *    coastline within a few metres of the point (catches inland water).
 * 2. Esri World Countries (Generalized) polygon — a point that falls
 *    outside every country polygon is offshore (catches open sea far
 *    from the coastline, where Overpass proximity checks can't reach).
 *
 * Both are best-effort: if a source is unreachable we rely on the other,
 * and if both fail we assume land so planting is never blocked by a
 * network hiccup.
 */

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const COUNTRIES_URL =
  'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0/query';

async function overpassSaysWater(lat: number, lng: number): Promise<boolean | null> {
  const query = `[out:json][timeout:10];(` +
    `way(around:20,${lat},${lng})["natural"="water"];` +
    `relation(around:20,${lat},${lng})["natural"="water"];` +
    `way(around:12,${lat},${lng})["waterway"];` +
    `way(around:12,${lat},${lng})["natural"="coastline"];` +
    `);out count;`;

  // Race all mirrors at once — first good answer wins, so a slow or
  // failing mirror doesn't stall validation.
  const attempts = OVERPASS_ENDPOINTS.map(async (endpoint) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return Number(data?.elements?.[0]?.tags?.count ?? 0) > 0;
    } finally {
      clearTimeout(timer);
    }
  });

  return new Promise((resolve) => {
    let pending = attempts.length;
    attempts.forEach((attempt) => {
      attempt
        .then((result) => resolve(result))
        .catch(() => {
          pending -= 1;
          if (pending === 0) resolve(null); // all mirrors failed
        });
    });
  });
}

async function isOffshore(lat: number, lng: number): Promise<boolean | null> {
  try {
    const params = new URLSearchParams({
      geometry: `${lng},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      returnCountOnly: 'true',
      f: 'json',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${COUNTRIES_URL}?${params.toString()}`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    const data = await response.json();
    if (typeof data.count !== 'number') return null;
    return data.count === 0;
  } catch {
    return null;
  }
}

/**
 * Returns true when the point is in the sea, a river, or a lake.
 */
export async function isInWater(lat: number, lng: number): Promise<boolean> {
  const [nearWater, offshore] = await Promise.all([
    overpassSaysWater(lat, lng),
    isOffshore(lat, lng),
  ]);

  // Offshore check is authoritative for open sea.
  if (offshore === true) return true;
  if (nearWater === true) return true;
  // If both sources answered, trust their combined "no".
  if (nearWater === false && offshore === false) return false;
  // One source failed: trust the one that answered.
  if (nearWater !== null) return nearWater;
  if (offshore !== null) return offshore;
  // Both failed — don't block planting on a network error.
  return false;
}
