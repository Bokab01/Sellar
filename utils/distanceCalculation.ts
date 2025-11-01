/**
 * Distance Calculation Utilities
 * Calculate distance between two geographic coordinates using Haversine formula
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param coord1 First coordinate (latitude, longitude)
 * @param coord2 Second coordinate (latitude, longitude)
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
    Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display
 * @param distanceInKm Distance in kilometers
 * @returns Formatted string (e.g., "1.5 km", "500 m")
 */
export function formatDistance(distanceInKm: number): string {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)} m`;
  }
  
  if (distanceInKm < 10) {
    return `${distanceInKm.toFixed(1)} km`;
  }
  
  return `${Math.round(distanceInKm)} km`;
}

/**
 * Check if a point is within a certain radius of another point
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @param radiusInKm Radius in kilometers
 * @returns True if within radius
 */
export function isWithinRadius(
  coord1: Coordinates,
  coord2: Coordinates,
  radiusInKm: number
): boolean {
  const distance = calculateDistance(coord1, coord2);
  return distance <= radiusInKm;
}

/**
 * Sort an array of items by distance from a reference point
 * @param items Array of items with coordinates
 * @param referencePoint Reference coordinate
 * @param getCoordinates Function to extract coordinates from item
 * @returns Sorted array (nearest first)
 */
export function sortByDistance<T>(
  items: T[],
  referencePoint: Coordinates,
  getCoordinates: (item: T) => Coordinates | null
): T[] {
  return items
    .map(item => ({
      item,
      distance: (() => {
        const coords = getCoordinates(item);
        return coords ? calculateDistance(referencePoint, coords) : Infinity;
      })(),
    }))
    .sort((a, b) => a.distance - b.distance)
    .map(({ item }) => item);
}

/**
 * Get distance label for UI display
 * @param distanceInKm Distance in kilometers
 * @returns Friendly label (e.g., "Nearby", "5 km away")
 */
export function getDistanceLabel(distanceInKm: number): string {
  if (distanceInKm < 0.5) {
    return 'Very close';
  }
  if (distanceInKm < 2) {
    return 'Nearby';
  }
  if (distanceInKm < 10) {
    return `${distanceInKm.toFixed(1)} km away`;
  }
  if (distanceInKm < 50) {
    return `${Math.round(distanceInKm)} km away`;
  }
  return 'Far';
}

