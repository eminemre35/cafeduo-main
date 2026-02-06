import { normalizeApiBaseUrl } from './api';
import { normalizeBaseUrl } from './socket';

describe('URL normalization helpers', () => {
  it('normalizes API base URL with https for host-only value', () => {
    expect(normalizeApiBaseUrl('cafeduo-api.onrender.com')).toBe('https://cafeduo-api.onrender.com');
  });

  it('normalizes API base URL with http for localhost', () => {
    expect(normalizeApiBaseUrl('localhost:3001')).toBe('http://localhost:3001');
  });

  it('strips /api suffix for relative URL values', () => {
    expect(normalizeApiBaseUrl('/api')).toBe('');
  });

  it('normalizes socket URL and strips trailing /api', () => {
    expect(normalizeBaseUrl('https://api.example.com/api')).toBe('https://api.example.com');
  });
});
