/**
 * framer-motion global mock — test ortamında animasyonsuz çalıştırır.
 * motion.X için Proxy kullanarak tüm HTML element'lerini destekler.
 */
const React = require('react');

const FRAMER_PROPS = new Set([
  'initial',
  'animate',
  'exit',
  'transition',
  'variants',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileDrag',
  'whileInView',
  'layout',
  'layoutId',
  'drag',
  'dragConstraints',
  'dragElastic',
  'onAnimationStart',
  'onAnimationComplete',
  'onDragStart',
  'onDragEnd',
  'onHoverStart',
  'onHoverEnd',
  'onTapStart',
  'onTap',
  'onTapCancel',
  'transformTemplate',
  'custom',
]);

const makeMotionComponent = (tag) =>
  React.forwardRef(({ children, ...props }, ref) => {
    const filtered = {};
    for (const key of Object.keys(props)) {
      if (!FRAMER_PROPS.has(key)) filtered[key] = props[key];
    }
    return React.createElement(tag, { ...filtered, ref }, children);
  });

// Component kimliği render'lar arasında SABİT kalmalı — her erişimde yeni
// component üretmek React'in alt ağacı remount edip state silmesine yol açar
// (App.integration'daki 5 test bu yüzden kırılmıştı).
const motionComponentCache = new Map();
const motionProxy = new Proxy(
  {},
  {
    get: (_target, prop) => {
      if (!motionComponentCache.has(prop)) {
        motionComponentCache.set(prop, makeMotionComponent(prop));
      }
      return motionComponentCache.get(prop);
    },
  }
);

module.exports = {
  motion: motionProxy,
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
  useMotionValue: (initial) => ({ get: () => initial, set: jest.fn() }),
  useTransform: () => ({ get: jest.fn() }),
  useSpring: (val) =>
    typeof val === 'object' && val !== null && typeof val.get === 'function'
      ? val
      : { get: () => val, set: jest.fn() },
  useReducedMotion: () => false,
  useScroll: () => ({ scrollY: { get: () => 0 }, scrollX: { get: () => 0 } }),
  useVelocity: () => ({ get: () => 0 }),
  useInView: () => false,
  useDragControls: () => ({}),
  useAnimationControls: () => ({ start: jest.fn(), stop: jest.fn(), set: jest.fn() }),
  usePresence: () => [true, jest.fn()],
  useIsPresent: () => true,
  LayoutGroup: ({ children }) => children,
  LazyMotion: ({ children }) => children,
  domAnimation: {},
  domMax: {},
  m: motionProxy,
};
