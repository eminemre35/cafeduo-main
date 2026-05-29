/**
 * About — Riso Kantin redesign (PR #24).
 *
 * "Why CafeDuo" section with 4 value pillars + 2 side cards. data-testid
 * 'about-main-heading' preserved.
 */
import React from 'react';
import { Building2, Gauge, Server, ShieldCheck, Users } from 'lucide-react';
import { Card, Squiggle, Reveal, RevealGroup, RevealItem } from './ui';

interface Pillar {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: 'pink' | 'blue' | 'mustard' | 'paper-deep';
}

const pillars: Pillar[] = [
  {
    icon: <Server size={20} strokeWidth={2.4} />,
    title: 'Anlık Eşleşme',
    text: 'Aynı kafedeki oyuncuları düşük gecikmeyle ortak oyuna taşır.',
    tone: 'pink',
  },
  {
    icon: <Gauge size={20} strokeWidth={2.4} />,
    title: 'Kısa Tur Dinamiği',
    text: 'Dakikalar içinde başlayıp biten oyunlarla akışı hafif tutar.',
    tone: 'blue',
  },
  {
    icon: <ShieldCheck size={20} strokeWidth={2.4} />,
    title: 'Güvenli Giriş',
    text: 'Rol, oturum ve masa kontrolleriyle kontrollü erişim sunar.',
    tone: 'paper-deep',
  },
  {
    icon: <Users size={20} strokeWidth={2.4} />,
    title: 'Ödül Döngüsü',
    text: 'Maç puanı, kupon ve mağaza akışını tek ekonomide birleştirir.',
    tone: 'mustard',
  },
];

const TONE_BG: Record<Pillar['tone'], string> = {
  pink: 'bg-riso-pink text-carbon',
  blue: 'bg-riso-blue text-paper',
  mustard: 'bg-riso-mustard text-carbon',
  'paper-deep': 'bg-paper-deep text-carbon',
};

export const About: React.FC = () => {
  return (
    <section id="about" className="riso-kantin bg-paper py-20 sm:py-28" aria-label="Hakkımızda">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Card tone="paper" shadow="md" className="p-7 md:p-9">
              <p className="mb-3 font-riso-mono text-xs font-bold uppercase tracking-[0.18em] text-carbon-soft">
                // Neden CafeDuo?
              </p>
              <h2
                data-testid="about-main-heading"
                className="font-riso-display text-3xl leading-tight text-carbon md:text-5xl"
              >
                Bekleyen kullanıcıyı{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-riso-pink-deep">aktif oyuncuya</span>
                  <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-2.5">
                    <Squiggle tone="mustard" />
                  </span>
                </span>{' '}
                çeviren sosyal oyun altyapısı.
              </h2>
              <p className="mt-5 font-riso-body text-base leading-8 text-carbon-soft sm:text-lg">
                CafeDuo, kafedeki bekleme anını eşleşmeli bir deneyime dönüştürür. Kullanıcı zamanı
                keyifli geçirir; kafe de masadaki etkileşimi, tekrar ziyareti ve ödül döngüsünü
                güçlendirir.
              </p>

              <RevealGroup className="mt-8 grid gap-3 sm:grid-cols-2" stagger={0.06}>
                {pillars.map((pillar) => (
                  <RevealItem
                    key={pillar.title}
                    as="article"
                    hover
                    className="border-2 border-carbon bg-paper p-4 transition-colors hover:bg-paper-deep"
                  >
                    <div
                      className={`inline-flex h-10 w-10 items-center justify-center border-2 border-carbon ${TONE_BG[pillar.tone]}`}
                    >
                      {pillar.icon}
                    </div>
                    <h3 className="mt-3 font-riso-display text-lg text-carbon">{pillar.title}</h3>
                    <p className="mt-1 font-riso-body text-sm leading-6 text-carbon-soft">
                      {pillar.text}
                    </p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </Card>
          </Reveal>

          <Reveal delay={0.1} className="flex flex-col gap-4 lg:col-span-5">
            <Card tone="mustard" shadow="md" rotation={1}>
              <div className="inline-flex items-center gap-2 font-riso-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-carbon">
                <Building2 size={14} />
                Değer özeti
              </div>
              <h3 className="mt-3 font-riso-display text-2xl text-carbon">
                Kullanıcı + kafe için net kazanım
              </h3>
              <p className="mt-2 font-riso-body text-sm leading-6 text-carbon">
                Oyuncu bekleme süresini değerlendirir; kafe etkileşim, sadakat ve tekrar ziyaret
                motivasyonu kazanır.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {[
                  { v: '3', l: 'Oyun' },
                  { v: '<60 sn', l: 'Tur' },
                  { v: 'Anlık', l: 'Puan' },
                ].map((s) => (
                  <div key={s.l} className="border-2 border-carbon bg-paper p-3">
                    <p className="font-riso-display text-xl text-carbon">{s.v}</p>
                    <p className="font-riso-mono text-[0.6rem] uppercase tracking-wider text-carbon-muted">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card tone="paper" shadow="sm" rotation={-0.5}>
              <p className="font-riso-mono text-[0.65rem] font-bold uppercase tracking-[0.16em] text-carbon-soft">
                Kazanım başlıkları
              </p>
              <ul className="mt-3 space-y-2 font-riso-body text-sm leading-6 text-carbon-soft">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-riso-pink" />
                  Canlı eşleşme ve skor güncellemesi
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-riso-blue" />
                  Kısa tur, yüksek tekrar oynanış döngüsü
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-riso-mustard" />
                  Ödül ekonomisiyle kafe sadakati
                </li>
              </ul>
            </Card>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
