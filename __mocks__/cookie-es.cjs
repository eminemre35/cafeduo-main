/**
 * cookie-es icin minimal CJS stub.
 *
 * react-router'in server-runtime/cookies.js'i (test ortaminda cagrilmayan
 * server tarafi) 'cookie-es' import eder. Paket ESM-only (.mjs) oldugu icin
 * jest'in CJS pipeline'inda yuklenemez; bu stub parse/serialize'i birebir
 * davranisla karsilar. Gercek davranis gerekirse: https://github.com/unjs/cookie-es
 */
'use strict';

function parse(input) {
  const out = {};
  if (!input) return out;
  for (const part of String(input).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    }
  }
  return out;
}

function serialize(name, value) {
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
}

module.exports = {
  parse,
  parseCookie: parse,
  serialize,
  serializeCookie: serialize,
  splitSetCookieString: (cookies) => (cookies ? String(cookies).split(',').filter(Boolean) : []),
  stringifyCookie: (name, value) => serialize(name, value),
  parseSetCookie: (input) => {
    const idx = String(input).indexOf('=');
    if (idx === -1) return { name: '', value: '' };
    return {
      name: String(input).slice(0, idx).trim(),
      value: String(input)
        .slice(idx + 1)
        .trim(),
    };
  },
};
