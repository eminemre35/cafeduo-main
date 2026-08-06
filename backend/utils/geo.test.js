const { getDistanceFromLatLonInMeters, deg2rad } = require('./geo');

describe('deg2rad', () => {
  it('converts degrees to radians', () => {
    expect(deg2rad(0)).toBe(0);
    expect(deg2rad(180)).toBeCloseTo(Math.PI, 10);
    expect(deg2rad(90)).toBeCloseTo(Math.PI / 2, 10);
    expect(deg2rad(360)).toBeCloseTo(2 * Math.PI, 10);
  });
});

describe('getDistanceFromLatLonInMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(getDistanceFromLatLonInMeters(41.0082, 28.9784, 41.0082, 28.9784)).toBe(0);
  });

  it('calculates Istanbul - Ankara distance (~350 km)', () => {
    // Istanbul (41.0082, 28.9784) -> Ankara (39.9334, 32.8597)
    const meters = getDistanceFromLatLonInMeters(41.0082, 28.9784, 39.9334, 32.8597);
    expect(meters).toBeGreaterThan(340000);
    expect(meters).toBeLessThan(370000);
  });

  it('is symmetric (A->B same as B->A)', () => {
    const ab = getDistanceFromLatLonInMeters(41.0082, 28.9784, 39.9334, 32.8597);
    const ba = getDistanceFromLatLonInMeters(39.9334, 32.8597, 41.0082, 28.9784);
    expect(ab).toBeCloseTo(ba, 6);
  });

  it('handles negative coordinates (southern hemisphere)', () => {
    // Buenos Aires (-34.6037, -58.3816) -> Montevideo (-34.9011, -56.1645) ~200 km
    const meters = getDistanceFromLatLonInMeters(-34.6037, -58.3816, -34.9011, -56.1645);
    expect(meters).toBeGreaterThan(180000);
    expect(meters).toBeLessThan(230000);
  });

  it('handles prime meridian / equator crossings', () => {
    // Greenwich (51.4779, 0) -> equator on the meridian (0, 0) ~5720 km
    const meters = getDistanceFromLatLonInMeters(51.4779, 0, 0, 0);
    expect(meters).toBeGreaterThan(5600000);
    expect(meters).toBeLessThan(5900000);
  });
});
