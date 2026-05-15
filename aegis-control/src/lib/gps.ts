export function gpsToXYZ(
  lat: number,
  lon: number,
  alt: number,
  originLat: number,
  originLon: number,
  originAlt: number
) {
  // Use equirectangular projection for local offset
  const x = (lon - originLon) * Math.cos((originLat * Math.PI) / 180) * 111320;
  const z = -(lat - originLat) * 110540; // Negative because z is forward/back in Three.js (usually -z is North)
  const y = alt - originAlt;
  return { x, y, z };
}
