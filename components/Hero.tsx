/**
 * Hero — Riso Kantin redesign (PR #24, landing extension).
 *
 * The first thing a visitor sees on cafeduotr.com. Same copy + handler
 * contract as the previous cyber-retro version (Hero.test.tsx assertions
 * preserved exactly); presentational layer rewritten for the printed-zine
 * aesthetic — cream paper canvas, halftone overlay, sticker-pinned mini
 * stats, double-shadow CTAs.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Timer, Trophy, Users } from 'lucide-react';
import { Button, Squiggle } from './ui';

interface HeroProps {
  onLogin: () => void;
  onRegister: () => void;
  isLoggedIn?: boolean;
  userRole?: string;
  isAdmin?: boolean;
}

export const Hero: React.FC<HeroProps> = ({
  onLogin,
  onRegister,
  isLoggedIn,
  userRole,
  isAdmin,
}) => {
  const navigate = useNavigate();

  const handlePanelClick = () => {
    if (isAdmin) navigate('/admin');
    else if (userRole === 'cafe_admin') navigate('/cafe-admin');
    else navigate('/dashboard');
  };

  return (
    <section
      id="home"
      aria-label="Ana bölüm"
      className="riso-kantin riso-kantin-app relative min-h-screen overflow-hidden bg-paper pt-32 pb-20 sm:pt-40 sm:pb-28"
    >
      {/* Halftone texture across the whole hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.06] mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '6px 6px',
        }}
      />

      {/* Floating riso shapes — sticker-pinned, decorative */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute left-[6%] top-[18%] h-16 w-16 bg-riso-pink rotate-[-12deg] border-2 border-carbon riso-shadow-blue-only opacity-90 hidden md:block" />
        <div className="absolute right-[8%] top-[24%] h-20 w-20 bg-riso-mustard rotate-[8deg] border-2 border-carbon riso-shadow-pink-only opacity-90 hidden md:block" />
        <div className="absolute left-[14%] bottom-[14%] h-12 w-28 bg-riso-blue rotate-[-3deg] border-2 border-carbon hidden lg:block" />
        <div className="absolute right-[12%] bottom-[8%] h-3 w-3 rounded-full bg-riso-pink" />
        <div className="absolute right-[18%] bottom-[20%] h-2 w-2 rounded-full bg-riso-blue" />
        <div className="absolute left-[40%] top-[10%] h-2 w-12 bg-carbon" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="mb-6 flex justify-center"
        >
          <span className="inline-flex items-center gap-2 border-2 border-carbon bg-paper px-3 py-1.5 font-riso-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-carbon riso-shadow-pink-only">
            <span className="h-2 w-2 rounded-full bg-riso-pink animate-pulse" />
            Gamer ruhunu al, kafeni seç, masanı doğrula
          </span>
        </motion.div>

        <motion.h1
          lang="tr"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
          className="text-center font-riso-display text-[2.6rem] sm:text-[3.8rem] lg:text-[5rem] leading-[0.95] tracking-tight text-carbon"
        >
          Kafede oyun oynamak artık{' '}
          <span className="relative inline-block">
            <span className="relative z-10 text-riso-pink-deep">
              efsane <span>kolay.</span>
            </span>
            <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-2.5">
              <Squiggle tone="blue" />
            </span>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="mx-auto mt-6 max-w-2xl text-center font-riso-body text-lg leading-relaxed text-carbon-soft sm:text-xl"
        >
          Kafeni seç, masanı doğrula ve rekabete katıl. Puan kazan, ödülleri topla, efsaneler
          arasında yerini al.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          {isLoggedIn ? (
            <Button
              tone="pink"
              size="lg"
              onClick={handlePanelClick}
              aria-label="Kontrol paneline git"
              trailingIcon={<ArrowRight size={18} />}
            >
              Panele Geç
            </Button>
          ) : (
            <>
              <Button
                tone="pink"
                size="lg"
                onClick={onRegister}
                aria-label="Kayıt ol ve oyuna başla"
                trailingIcon={<ArrowRight size={18} />}
              >
                CafeDuo&apos;ya Başla
              </Button>
              <Button
                tone="paper"
                size="lg"
                data-testid="hero-login-button"
                onClick={onLogin}
                aria-label="Oturum aç"
                leadingIcon={<Play size={17} />}
              >
                Oturum Aç
              </Button>
            </>
          )}
        </motion.div>

        {/* Mini stat strip — sticker-pinned tiles */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <StatTile
            icon={<Timer size={18} />}
            label="Hızlı eşleşme"
            value="< 60 sn"
            tone="pink"
            rotate={-1.5}
          />
          <StatTile
            icon={<Users size={18} />}
            label="Canlı masalar"
            value="3 oyun"
            tone="blue"
            rotate={1}
          />
          <StatTile
            icon={<Trophy size={18} />}
            label="Puan & ödül"
            value="Anlık"
            tone="mustard"
            rotate={-0.5}
          />
        </motion.div>
      </div>
    </section>
  );
};

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'pink' | 'blue' | 'mustard';
  rotate: number;
}

const TILE_TONE: Record<StatTileProps['tone'], string> = {
  pink: 'bg-riso-pink text-carbon',
  blue: 'bg-riso-blue text-paper',
  mustard: 'bg-riso-mustard text-carbon',
};

const StatTile: React.FC<StatTileProps> = ({ icon, label, value, tone, rotate }) => (
  <div
    style={{ transform: `rotate(${rotate}deg)` }}
    className={`${TILE_TONE[tone]} relative border-2 border-carbon p-4 riso-shadow-sm`}
  >
    <div className="flex items-center gap-3">
      <span className="inline-flex shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-riso-mono text-[0.65rem] uppercase tracking-[0.14em] opacity-80">
          {label}
        </p>
        <p className="font-riso-display text-xl leading-none">{value}</p>
      </div>
    </div>
  </div>
);
