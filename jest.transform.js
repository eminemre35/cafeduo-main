/**
 * Jest transform for react-router (ESM-only package).
 *
 * react-router 8 ships ESM-only dist. To run it inside jest's CJS pipeline:
 *   1. strip `import.meta.hot` (only used for dev HMR; in tests it must be
 *      falsy, and `import.meta` cannot survive a CJS transform)
 *   2. delegate to ts-jest with `module: commonjs`
 */
const { default: tsJestModule } = require('ts-jest');

const tsJest = tsJestModule.createTransformer({
  tsconfig: {
    allowJs: true,
    module: 'commonjs',
    esModuleInterop: true,
    jsx: 'react-jsx',
  },
});

module.exports = {
  process(src, filename, config, options) {
    const patched = src.replace(/import\.meta\.hot/g, 'undefined');
    return tsJest.process(patched, filename, config, options);
  },
};
