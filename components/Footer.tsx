/**
 * Footer — Riso Kantin redesign (PR #24).
 *
 * Three-column footer pinned at the bottom of public pages. Keeps the
 * KVKK link, social icons, and `data-testid="footer-version-pill"` so
 * BUILD_META smoke checks still work.
 */
import React from 'react';
import { Instagram, Twitter, Mail, Shield, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BUILD_META } from '../lib/buildMeta';

export const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="riso-kantin relative mt-8 border-t-2 border-carbon bg-paper-deep"
      role="contentinfo"
    >
      {/* Halftone strip across the footer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '5px 5px',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center border-2 border-carbon bg-riso-pink">
                <span className="font-riso-display text-lg font-bold text-carbon">CD</span>
              </div>
              <span className="font-riso-display text-3xl text-carbon">CafeDuo</span>
            </div>
            <p className="mt-3 font-riso-body text-sm leading-6 text-carbon-soft">
              Kafede bekleyen kullanıcıları eşleştirip oyun ve ödül döngüsüne bağlayan sosyal
              deneyim altyapısı.
            </p>
            <p className="mt-4 font-riso-mono text-[0.7rem] tracking-wider uppercase text-carbon-muted">
              © {year} tüm hakları saklıdır
            </p>
            <span
              className="mt-2 inline-block border-2 border-carbon bg-paper px-2 py-0.5 font-riso-mono text-[0.65rem] font-bold uppercase tracking-wider text-carbon"
              data-testid="footer-version-pill"
              title={
                BUILD_META.buildTime !== 'unknown'
                  ? `Build: ${BUILD_META.buildTime}`
                  : 'Build bilgisi yok'
              }
            >
              v-{BUILD_META.shortVersion}
            </span>
          </div>

          <div>
            <p className="font-riso-mono text-[0.7rem] font-bold tracking-wider uppercase text-carbon-soft">
              Yasal
            </p>
            <Link
              to="/gizlilik"
              className="riso-focus mt-3 inline-flex items-center gap-2 font-riso-body text-sm font-semibold text-carbon hover:text-riso-pink-deep transition-colors"
            >
              <Shield size={15} />
              Gizlilik Politikası &amp; KVKK
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div>
            <p className="font-riso-mono text-[0.7rem] font-bold tracking-wider uppercase text-carbon-soft mb-3">
              İletişim
            </p>
            <div className="flex items-center gap-2.5">
              <a
                href="https://instagram.com/cafeduotr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="riso-focus inline-flex h-10 w-10 items-center justify-center border-2 border-carbon bg-paper text-carbon hover:bg-riso-pink transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://x.com/cafeduotr"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
                className="riso-focus inline-flex h-10 w-10 items-center justify-center border-2 border-carbon bg-paper text-carbon hover:bg-riso-blue hover:text-paper transition-colors"
              >
                <Twitter size={18} />
              </a>
              <a
                href="mailto:cafeduotr@gmail.com"
                aria-label="E-posta"
                className="riso-focus inline-flex h-10 w-10 items-center justify-center border-2 border-carbon bg-paper text-carbon hover:bg-riso-mustard transition-colors"
              >
                <Mail size={18} />
              </a>
            </div>
            <a
              href="mailto:cafeduotr@gmail.com"
              className="riso-focus mt-3 inline-flex font-riso-body text-sm text-carbon-soft hover:text-riso-pink-deep transition-colors"
            >
              cafeduotr@gmail.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
