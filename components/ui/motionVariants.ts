/**
 * Riso Kantin — paylaşılan framer-motion variant'ları.
 * Pazarlama sayfalarındaki scroll-reveal + stagger için tek kaynak.
 * Saf veri (test-nötr); animasyon/erişilebilirlik mantığı Reveal.tsx içinde.
 */
import type { Variants } from 'framer-motion';

/** Tekil blok girişi — mevcut Riso değerleriyle hizalı (y, easeOut). */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

/** Parent: çocukları sırayla tetikler (elle delay:index*N hesabının yerini alır). */
export const staggerContainer = (stagger = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

/** staggerContainer altındaki çocuklar. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

/** prefers-reduced-motion: sadece kısa opacity, hareket yok. */
export const reducedFade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
};

/** Sonuç kartı girişi — damga vurulmuş hissi (hafif scale + yukarı kayma). */
export const popIn: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

/** Hover/tap mikro-etkileşim — Riso "shift" (hafif yukarı kayma). */
export const hoverShift = {
  whileHover: { y: -3, transition: { duration: 0.15, ease: 'easeOut' } },
  whileTap: { y: 0, scale: 0.99 },
} as const;
