const {
  normalizeCafeCreatePayload,
  normalizeCafeUpdatePayload,
} = require('./cafeAdminValidation');

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
  });
});

