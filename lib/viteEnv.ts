/**
 * Safe accessor for Vite's `import.meta.env` that degrades gracefully outside
 * of a Vite build (e.g. Jest test runtime, where `import.meta` is unparseable
 * in CommonJS-emitted modules).
 *
 * Centralizing this access lets the rest of the codebase avoid one-off
 * `new Function('return import.meta.env...')` shims that were scattered across
 * `lib/api.ts`, `lib/buildMeta.ts`, and `lib/socket.ts`. The single `Function`
 * constructor call below is the only `no-new-func` exception in the codebase.
 */

type ViteEnv = Readonly<Record<string, string | undefined>>;

let cached: ViteEnv | null = null;

const readImportMetaEnv = (): ViteEnv => {
  try {
    // We must wrap `import.meta` access in a Function constructor: ts-jest's
    // CommonJS emit cannot parse `import.meta` directly, so a static reference
    // would crash every test that transitively imports this module.
    // eslint-disable-next-line no-new-func
    const env = new Function(
      'try { return import.meta && import.meta.env ? import.meta.env : {}; } catch { return {}; }'
    )();
    return (env ?? {}) as ViteEnv;
  } catch {
    return {} as ViteEnv;
  }
};

export const getViteEnv = (): ViteEnv => {
  if (cached === null) {
    cached = readImportMetaEnv();
  }
  return cached;
};

export const getViteEnvVar = (name: string): string => {
  const value = getViteEnv()[name];
  return typeof value === 'string' ? value : '';
};

/** For tests only — resets the cache so a remock can take effect. */
export const __resetViteEnvCache = () => {
  cached = null;
};
