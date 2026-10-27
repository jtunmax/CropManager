import { isInWater } from '@/services/waterValidation';

// Simplified polygon of Belize's borders (approximate)
// Points in [longitude, latitude] format
const BELIZE_POLYGON: [number, number][] = [
  [-89.2, 18.5],   // NW corner
  [-88.3, 18.5],   // NE corner (Corozal)
  [-88.0, 18.3],   // East coast north
  [-87.8, 17.9],   // East coast 
  [-87.5, 17.5],   // East coast (Belize City area)
  [-87.8, 16.5],   // SE coast
  [-88.2, 16.1],   // South border east
  [-88.9, 15.9],   // South border (Guatemala)
  [-89.2, 15.9],   // SW corner
  [-89.2, 17.8],   // West border
  [-89.2, 18.5],   // Back to NW corner
];

// Belize's bounding box for quick rejection
const BELIZE_BOUNDS = {
  minLat: 15.85,
  maxLat: 18.55,
  minLng: -89.3,
  maxLng: -87.4,
};

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Quick bounding box check for Belize
 */
function isInBelizeBounds(lat: number, lng: number): boolean {
  return lat >= BELIZE_BOUNDS.minLat && 
         lat <= BELIZE_BOUNDS.maxLat && 
         lng >= BELIZE_BOUNDS.minLng && 
         lng <= BELIZE_BOUNDS.maxLng;
}

/**
 * Check if coordinates are within Belize's borders
 */
export function isInBelize(lat: number, lng: number): boolean {
  // Quick bounding box check first
  if (!isInBelizeBounds(lat, lng)) {
    return false;
  }
  
  // More precise polygon check
  return isPointInPolygon(lat, lng, BELIZE_POLYGON);
}

export interface LocationValidation {
  valid: boolean;
  reason?: string;
  isOutsideBelize?: boolean;
  /** True when the point falls in the sea, a river, or a lake — only
   *  water-tolerant species (mangrove etc.) may be planted there. */
  isWater?: boolean;
}

/**
 * Validate if a location is suitable for planting.
 * Points outside Belize are rejected. Water points are allowed but
 * flagged so the form can restrict species to water-tolerant ones.
 */
export async function validateLocation(lat: number, lng: number): Promise<LocationValidation> {
  // Check if in Belize
  if (!isInBelize(lat, lng)) {
    return {
      valid: false,
      reason: 'This location is outside of Belize. Please select a location within Belize.',
      isOutsideBelize: true,
    };
  }

  const water = await isInWater(lat, lng);
  return { valid: true, isWater: water };
}
