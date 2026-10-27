// Three 80-metre areas repeat along a straight road.
export const WORLD_LENGTH = 240;
export function wrapStreetZ(z: number) {
  // Both joins sit in repeating scenery, far from the original story bubbles.
  while (z < -360) z += WORLD_LENGTH;
  while (z > 120) z -= WORLD_LENGTH;
  return z;
}
export function streetArea(z: number) {
  const progress = ((-z % WORLD_LENGTH) + WORLD_LENGTH) % WORLD_LENGTH;
  return progress < 80 ? "Station" : progress < 160 ? "Bar Street" : "Alley";
}
