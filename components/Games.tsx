/**
 * Games — Riso Kantin redesign (PR #25, landing).
 *
 * Landing-page "Kısa Tur Oyunları" feature section. Three featured games
 * + three highlight tiles. Test assertions (Games.test.tsx) all preserved.
 */
import React from 'react';
import { ArrowUpRight, Brain, Crown, Gauge, Sparkles, Swords, Timer } from 'lucide-react';
import { Card, Squiggle, RevealGroup, RevealItem, TiltCard } from './ui';

type GameTone = 'mustard' | 'blue' | 'pink';

interface GameCardData {
  title: string;
  subtitle: string;
  duration: string;
  mode: string;
  tone: GameTone;
  icon: React.ReactNode;
  badge: string;
  cta: string;
  rotate: number;
}

const games: GameCardData[] = [
  {
    title: 'Retro Satranç',
    subtitle: 'Hamleni temiz oyna, süreyi doğru yönet ve kısa maçtan puan çıkar.',
    duration: '3+2 / 5+0',
    mode: 'Strateji',
    tone: 'mustard',
    icon: <Crown size={18} strokeWidth={2.4} />,
    badge: 'Strateji',
    cta: 'Tahtaya geç',
    rotate: -1.5,
  },
  {
    title: 'Bilgi Sprinti',
    subtitle: 'Rastgele sorularda hız ve doğrulukla rakibini geride bırak.',
    duration: '45-60 sn',
    mode: 'Quiz modu',
    tone: 'blue',
    icon: <Brain size={18} strokeWidth={2.4} />,
    badge: 'Bilgi',
    cta: 'Sprinti aç',
    rotate: 1,
  },
  {
    title: 'Nişancı Düellosu',
    subtitle: 'Nişangahı merkezde tut, doğru anda ateş et ve isabet serisi yap.',
    duration: '60-90 sn',
    mode: 'Düello',
    tone: 'pink',
    icon: <Swords size={18} strokeWidth={2.4} />,
    badge: 'Aksiyon',
    cta: 'Düelloya başla',
    rotate: -0.5,
  },
];

const TONE_BG: Record<GameTone, string> = {
  mustard: 'bg-riso-mustard text-carbon',
  blue: 'bg-riso-blue text-paper',
  pink: 'bg-riso-pink text-carbon',
};

const GameCard: React.FC<GameCardData & { onClick?: () => void }> = ({
  title,
  subtitle,
  duration,
  mode,
  tone,
  icon,
  badge,
  cta,
  rotate,
  onClick,
}) => (
  <RevealItem
    as="article"
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={onClick ? (event) => event.key === 'Enter' && onClick() : undefined}
    aria-label={`${title} - ${cta}`}
    className="group cursor-pointer"
  >
    <TiltCard>
      <Card tone="paper" shadow="md" rotation={rotate}>
        <div
          className={`inline-flex items-center gap-2 border-2 border-carbon px-3 py-1 font-riso-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] ${TONE_BG[tone]}`}
        >
          {icon}
          <span>{badge}</span>
        </div>

        <h3 className="mt-5 font-riso-display text-2xl text-carbon">{title}</h3>
        <p className="mt-2 font-riso-body text-sm leading-6 text-carbon-soft">{subtitle}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 border-t-2 border-paper-dim pt-4 font-riso-body text-sm">
          <div>
            <p className="font-riso-mono text-[0.65rem] uppercase tracking-[0.14em] text-carbon-muted">
              Süre
            </p>
            <p className="mt-0.5 font-riso-mono font-bold text-carbon">{duration}</p>
          </div>
          <div className="text-right">
            <p className="font-riso-mono text-[0.65rem] uppercase tracking-[0.14em] text-carbon-muted">
              Mod
            </p>
            <p className="mt-0.5 font-bold text-carbon">{mode}</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1.5 font-riso-body text-sm font-bold text-riso-pink-deep transition-transform group-hover:translate-x-1">
          <span>{cta}</span>
          <ArrowUpRight
            size={14}
            strokeWidth={2.5}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </div>
      </Card>
    </TiltCard>
  </RevealItem>
);

interface HighlightProps {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: GameTone;
}

const Highlight: React.FC<HighlightProps> = ({ icon, title, text, tone }) => (
  <RevealItem className="flex items-start gap-3 border-2 border-carbon bg-paper-deep p-4">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center border-2 border-carbon ${TONE_BG[tone]}`}
    >
      {icon}
    </div>
    <div className="min-w-0">
      <p className="font-riso-display text-base text-carbon">{title}</p>
      <p className="mt-0.5 font-riso-body text-xs leading-5 text-carbon-soft">{text}</p>
    </div>
  </RevealItem>
);

export const Games: React.FC<{ onPlayClick?: () => void }> = ({ onPlayClick }) => {
  return (
    <section
      id="games"
      className="riso-kantin relative overflow-hidden bg-paper-deep py-20 sm:py-28"
      aria-label="Oyunlar"
    >
      {/* Halftone overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '5px 5px',
        }}
      />

      {/* Decorative riso shapes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-[8%] h-3 w-12 bg-riso-mustard rotate-[-6deg] hidden md:block" />
        <div className="absolute right-[6%] top-[14%] h-4 w-4 rounded-full bg-riso-pink hidden md:block" />
        <div className="absolute left-[8%] bottom-[10%] h-2 w-2 rounded-full bg-riso-blue" />
        <div className="absolute right-[4%] bottom-[18%] h-3 w-3 bg-carbon" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <p className="mb-3 inline-block font-riso-mono text-xs font-bold uppercase tracking-[0.18em] text-carbon-soft">
            // Kısa Tur Oyunları
          </p>
          <h2
            data-testid="games-main-heading"
            className="font-riso-display text-3xl leading-tight text-carbon md:text-5xl"
          >
            Bekleme dakikalarını oyuna çeviren{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-riso-pink-deep">kısa tur kütüphanesi.</span>
              <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-2.5">
                <Squiggle tone="mustard" />
              </span>
            </span>
          </h2>
          <p className="mt-4 font-riso-body text-base leading-7 text-carbon-soft sm:text-lg">
            Her oyun hızlı başlar, kısa sürer ve puan ekonomisine bağlanır.
          </p>
        </div>

        <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {games.map((game) => (
            <GameCard key={game.title} {...game} onClick={onPlayClick} />
          ))}
        </RevealGroup>

        <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-3" stagger={0.06}>
          <Highlight
            icon={<Timer size={18} strokeWidth={2.4} />}
            title="Beklerken Oyna"
            text="Kafedeki boş zamanı aktif oyuna dönüştür."
            tone="blue"
          />
          <Highlight
            icon={<Sparkles size={18} strokeWidth={2.4} />}
            title="Anlık Kazanç"
            text="Her tur sonucu cüzdana net şekilde işlenir."
            tone="pink"
          />
          <Highlight
            icon={<Gauge size={18} strokeWidth={2.4} />}
            title="Kafe Bağı"
            text="Sadakat döngüsü oyunla görünür hale gelir."
            tone="mustard"
          />
        </RevealGroup>
      </div>
    </section>
  );
};
