const { normalizeCafeCreatePayload, normalizeCafeUpdatePayload } = require('./cafeAdminValidation');

describe('cafeAdminValidation', () => {
  describe('normalizeCafeCreatePayload', () => {
    it('normalizes valid payload with table_count alias', () => {
      const result = normalizeCafeCreatePayload({
        name: '  Test Cafe  ',
        address: '  Merkez  ',
        table_count: 42,
        pin: '5678',
        latitude: 37.77,
        longitude: 29.1,
        radius: 250,
      });

      expect(result.ok).toBe(true);
      expect(result.value).toEqual({
        name: 'Test Cafe',
        address: 'Merkez',
        totalTables: 42,
        tableCount: 42,
        pin: '5678',
        latitude: 37.77,
        longitude: 29.1,
        radius: 250,
        secondaryLatitude: null,
        secondaryLongitude: null,
        secondaryRadius: null,
      });
    });

    it('accepts optional secondary location for create payload', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Test Cafe',
        latitude: 37.77,
        longitude: 29.1,
        radius: 200,
        secondaryLatitude: 37.771,
        secondaryLongitude: 29.101,
        secondaryRadius: 320,
      });

      expect(result.ok).toBe(true);
      expect(result.value).toMatchObject({
        secondaryLatitude: 37.771,
        secondaryLongitude: 29.101,
        secondaryRadius: 320,
      });
    });

    it('rejects non-numeric pin', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        pin: '12ab',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('PIN');
    });

    it('rejects invalid table count', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        total_tables: 0,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Masa sayısı');
    });

    it('rejects missing name', () => {
      const result = normalizeCafeCreatePayload({ name: '  ' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Kafe adı zorunludur');
    });

    it('rejects name exceeding 120 characters', () => {
      const result = normalizeCafeCreatePayload({ name: 'A'.repeat(121) });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('120');
    });

    it('rejects address exceeding 240 characters', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        address: 'B'.repeat(241),
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('240');
    });

    it('uses default pin 1234 when not provided', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe' });

      expect(result.ok).toBe(true);
      expect(result.value.pin).toBe('1234');
    });

    it('uses default table count 20 when not provided', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe' });

      expect(result.ok).toBe(true);
      expect(result.value.totalTables).toBe(20);
    });

    it('uses default radius 500 when not provided', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe' });

      expect(result.ok).toBe(true);
      expect(result.value.radius).toBe(500);
    });

    it('accepts latitude at boundary values -90 and 90', () => {
      expect(normalizeCafeCreatePayload({ name: 'Cafe', latitude: -90, longitude: 0 }).ok).toBe(
        true
      );
      expect(normalizeCafeCreatePayload({ name: 'Cafe', latitude: 90, longitude: 0 }).ok).toBe(
        true
      );
    });

    it('rejects latitude outside -90 to 90', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe', latitude: 91, longitude: 0 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Enlem');
    });

    it('accepts longitude at boundary values -180 and 180', () => {
      expect(normalizeCafeCreatePayload({ name: 'Cafe', latitude: 0, longitude: -180 }).ok).toBe(
        true
      );
      expect(normalizeCafeCreatePayload({ name: 'Cafe', latitude: 0, longitude: 180 }).ok).toBe(
        true
      );
    });

    it('rejects longitude outside -180 to 180', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe', latitude: 0, longitude: 181 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Boylam');
    });

    it('accepts radius at boundary values 10 and 5000', () => {
      expect(normalizeCafeCreatePayload({ name: 'Cafe', radius: 10 }).ok).toBe(true);
      expect(normalizeCafeCreatePayload({ name: 'Cafe', radius: 5000 }).ok).toBe(true);
    });

    it('rejects radius below 10 or above 5000', () => {
      expect(normalizeCafeCreatePayload({ name: 'Cafe', radius: 9 }).ok).toBe(false);
      expect(normalizeCafeCreatePayload({ name: 'Cafe', radius: 5001 }).ok).toBe(false);
    });

    it('rejects non-integer radius', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe', radius: 100.5 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Yarıçap');
    });

    it('accepts table count at boundary values 1 and 300', () => {
      expect(normalizeCafeCreatePayload({ name: 'Cafe', total_tables: 1 }).ok).toBe(true);
      expect(normalizeCafeCreatePayload({ name: 'Cafe', total_tables: 300 }).ok).toBe(true);
    });

    it('rejects table count above 300', () => {
      const result = normalizeCafeCreatePayload({ name: 'Cafe', total_tables: 301 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Masa sayısı');
    });

    it('rejects partial secondary location (only lat, no lng)', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        secondaryLatitude: 37.77,
        // secondaryLongitude intentionally omitted
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('rejects secondary latitude out of range', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        secondaryLatitude: 95,
        secondaryLongitude: 29,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('rejects secondary longitude out of range', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        secondaryLatitude: 37,
        secondaryLongitude: 200,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('uses primary radius as secondary radius default when secondary radius not provided', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        radius: 300,
        secondaryLatitude: 37.77,
        secondaryLongitude: 29.1,
        // no secondaryRadius
      });

      expect(result.ok).toBe(true);
      expect(result.value.secondaryRadius).toBe(300);
    });

    it('rejects secondary radius out of range', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        secondaryLatitude: 37.77,
        secondaryLongitude: 29.1,
        secondaryRadius: 9,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('accepts null latitude and longitude (no location)', () => {
      const result = normalizeCafeCreatePayload({
        name: 'Cafe',
        latitude: null,
        longitude: null,
      });

      expect(result.ok).toBe(true);
      expect(result.value.latitude).toBeNull();
      expect(result.value.longitude).toBeNull();
    });

    it('accepts empty payload and uses all defaults', () => {
      const result = normalizeCafeCreatePayload({ name: 'My Cafe' });

      expect(result.ok).toBe(true);
      expect(result.value).toMatchObject({
        name: 'My Cafe',
        address: '',
        totalTables: 20,
        pin: '1234',
        radius: 500,
        latitude: null,
        longitude: null,
        secondaryLatitude: null,
        secondaryLongitude: null,
        secondaryRadius: null,
      });
    });
  });

  describe('normalizeCafeUpdatePayload', () => {
    it('rejects empty update payload', () => {
      const result = normalizeCafeUpdatePayload({});
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Güncellenecek alan');
    });

    it('normalizes mixed update payload', () => {
      const result = normalizeCafeUpdatePayload({
        total_tables: '50',
        pin: '9999',
        latitude: '37.70',
        longitude: 29.2,
      });

      expect(result.ok).toBe(true);
      expect(result.value).toEqual({
        totalTables: 50,
        tableCount: 50,
        pin: '9999',
        latitude: 37.7,
        longitude: 29.2,
      });
    });

    it('normalizes secondary location updates when both coordinates are provided', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: '37.75',
        secondaryLongitude: '29.15',
        secondaryRadius: 300,
      });

      expect(result.ok).toBe(true);
      expect(result.value).toEqual({
        secondaryLatitude: 37.75,
        secondaryLongitude: 29.15,
        secondaryRadius: 300,
      });
    });

    it('allows null to clear optional geo fields', () => {
      const result = normalizeCafeUpdatePayload({
        latitude: null,
        longitude: '',
        radius: null,
      });

      expect(result.ok).toBe(true);
      expect(result.value).toEqual({
        latitude: null,
        longitude: null,
        radius: null,
      });
    });

    it('rejects partial secondary location updates', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: 37.74,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('rejects invalid address in update', () => {
      const result = normalizeCafeUpdatePayload({
        address: 'C'.repeat(241),
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('240');
    });

    it('rejects invalid table count in update', () => {
      const result = normalizeCafeUpdatePayload({ total_tables: 0 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Masa sayısı');
    });

    it('uses table_count alias in update', () => {
      const result = normalizeCafeUpdatePayload({ table_count: 25 });

      expect(result.ok).toBe(true);
      expect(result.value.totalTables).toBe(25);
      expect(result.value.tableCount).toBe(25);
    });

    it('rejects invalid pin in update', () => {
      const result = normalizeCafeUpdatePayload({ pin: 'abcd' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('PIN');
    });

    it('rejects invalid latitude in update', () => {
      const result = normalizeCafeUpdatePayload({ latitude: -91 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Enlem');
    });

    it('rejects invalid longitude in update', () => {
      const result = normalizeCafeUpdatePayload({ longitude: 200 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Boylam');
    });

    it('rejects invalid radius in update', () => {
      const result = normalizeCafeUpdatePayload({ radius: 5 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Yarıçap');
    });

    it('allows empty string radius to clear it', () => {
      const result = normalizeCafeUpdatePayload({ radius: '' });

      expect(result.ok).toBe(true);
      expect(result.value.radius).toBeNull();
    });

    it('rejects secondary radius alone without secondary coordinates', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryRadius: 200,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek yarıçap');
    });

    it('clears secondary location when both coordinates are null/empty', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: null,
        secondaryLongitude: '',
      });

      expect(result.ok).toBe(true);
      expect(result.value.secondaryLatitude).toBeNull();
      expect(result.value.secondaryLongitude).toBeNull();
      expect(result.value.secondaryRadius).toBeNull();
    });

    it('rejects secondary latitude out of range in update', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: 91,
        secondaryLongitude: 29,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('rejects secondary longitude out of range in update', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: 37,
        secondaryLongitude: -200,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('allows null secondary radius when coordinates provided in update', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: 37.75,
        secondaryLongitude: 29.15,
        secondaryRadius: null,
      });

      expect(result.ok).toBe(true);
      expect(result.value.secondaryRadius).toBeNull();
    });

    it('rejects invalid secondary radius in update', () => {
      const result = normalizeCafeUpdatePayload({
        secondaryLatitude: 37.75,
        secondaryLongitude: 29.15,
        secondaryRadius: 9999,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Ek konum');
    });

    it('validates dailyGameLimit: rejects below 1', () => {
      const result = normalizeCafeUpdatePayload({ dailyGameLimit: 0 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Günlük oyun sınırı');
    });

    it('validates dailyGameLimit: rejects above 200', () => {
      const result = normalizeCafeUpdatePayload({ dailyGameLimit: 201 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Günlük oyun sınırı');
    });

    it('validates dailyGameLimit: rejects non-integer', () => {
      const result = normalizeCafeUpdatePayload({ dailyGameLimit: 5.5 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Günlük oyun sınırı');
    });

    it('accepts valid dailyGameLimit via snake_case alias', () => {
      const result = normalizeCafeUpdatePayload({ daily_game_limit: 10 });

      expect(result.ok).toBe(true);
      expect(result.value.dailyGameLimit).toBe(10);
    });

    it('validates dailyRewardWheel: rejects empty array', () => {
      const result = normalizeCafeUpdatePayload({ dailyRewardWheel: [] });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Reward wheel');
    });

    it('validates dailyRewardWheel: rejects more than 12 slices', () => {
      const slices = Array.from({ length: 13 }, () => ({ points: 10, weight: 1 }));
      const result = normalizeCafeUpdatePayload({ dailyRewardWheel: slices });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Reward wheel');
    });

    it('validates dailyRewardWheel: rejects slice points above 5000', () => {
      const result = normalizeCafeUpdatePayload({
        dailyRewardWheel: [{ points: 5001, weight: 1 }],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('5000');
    });

    it('validates dailyRewardWheel: rejects negative slice points', () => {
      const result = normalizeCafeUpdatePayload({
        dailyRewardWheel: [{ points: -1, weight: 1 }],
      });

      expect(result.ok).toBe(false);
    });

    it('validates dailyRewardWheel: rejects slice weight above 1000', () => {
      const result = normalizeCafeUpdatePayload({
        dailyRewardWheel: [{ points: 10, weight: 1001 }],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('1000');
    });

    it('validates dailyRewardWheel: rejects all-zero weights', () => {
      const result = normalizeCafeUpdatePayload({
        dailyRewardWheel: [
          { points: 10, weight: 0 },
          { points: 20, weight: 0 },
        ],
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('weight > 0');
    });

    it('accepts valid dailyRewardWheel and floors fractional values', () => {
      const result = normalizeCafeUpdatePayload({
        dailyRewardWheel: [
          { points: 10.7, weight: 5.3 },
          { points: 0, weight: 1 },
        ],
      });

      expect(result.ok).toBe(true);
      expect(result.value.dailyRewardWheel[0]).toEqual({ points: 10, weight: 5 });
      expect(result.value.dailyRewardWheel[1]).toEqual({ points: 0, weight: 1 });
    });

    it('validates dailyRewardWheel: rejects non-array', () => {
      const result = normalizeCafeUpdatePayload({ dailyRewardWheel: 'invalid' });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Reward wheel');
    });

    it('supports secondary_latitude snake_case alias in update', () => {
      const result = normalizeCafeUpdatePayload({
        secondary_latitude: 38.0,
        secondary_longitude: 30.0,
      });

      expect(result.ok).toBe(true);
      expect(result.value.secondaryLatitude).toBe(38.0);
      expect(result.value.secondaryLongitude).toBe(30.0);
    });
  });
});
