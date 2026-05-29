/**
 * HowItWorks — Riso Kantin redesign (PR #24).
 *
 * Three-step "register → check-in → match" flow on the landing page.
 * data-testid 'flow-main-heading' + 'how-step-{id}' preserved.
 */
import React from 'react';
import { ChevronRight, Coffee, Trophy, UserPlus } from 'lucide-react';
import { Card, Squiggle, RevealGroup, RevealItem, TiltCard } from './ui';

interface Step {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  hint: string;
  tone: 'pink' | 'mustard' | 'blue';
  rotate: number;
}

const steps: Step[] = [
  {
    id: '01',
    icon: <UserPlus size={22} strokeWidth={2.4} />,
    title: 'Hesabını aç',
    description: 'Kısa profilini tamamla ve CafeDuo oyuncu kimliğini hazır hale getir.',
    hint: '20 sn',
    tone: 'pink',
    rotate: -1.5,
  },
  {
    id: '02',
    icon: <Coffee size={22} strokeWidth={2.4} />,
    title: 'Kafeye bağlan',
    description: 'Kafeni ve masanı seç, aynı ortamdaki oyuncularla lobiye gir.',
    hint: '15 sn',
    tone: 'blue',
    rotate: 1.5,
  },
  {
    id: '03',
    icon: <Trophy size={22} strokeWidth={2.4} />,
    title: 'Eşleş ve kazan',
    description: 'Kısa turu tamamla, puanını cüzdana işle ve ödül hedefine yaklaş.',
    hint: '45 sn',
    tone: 'mustard',
    rotate: -0.5,
  },
];

const TILE_BG: Record<Step['tone'], string> = {
  pink: 'bg-riso-pink text-carbon',
  mustard: 'bg-riso-mustard text-carbon',
  blue: 'bg-riso-blue text-paper',
};

export const HowItWorks: React.FC = () => (
  <section
    id="features"
    className="riso-kantin bg-paper-deep py-20 sm:py-28"
    aria-label="Nasıl çalışır"
  >
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto mb-12 max-w-3xl text-center">
        <p className="mb-3 inline-block font-riso-mono text-xs font-bold uppercase tracking-[0.18em] text-carbon-soft">
          // Nasıl çalışır
        </p>
        <h2
          data-testid="flow-main-heading"
          className="font-riso-display text-3xl leading-tight text-carbon md:text-5xl"
        >
          3 adımda{' '}
          <span className="relative inline-block">
            <span className="relative z-10 text-riso-pink-deep">eşleş, oyna,</span>
            <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-2.5">
              <Squiggle tone="blue" />
            </span>
          </span>{' '}
          ödüle yaklaş.
        </h2>
        <p className="mt-4 font-riso-body text-base leading-7 text-carbon-soft sm:text-lg">
          Kullanıcı aynı deneyimi takip eder: bağlanır, eşleşir, oynar ve puanını görür.
        </p>
      </div>

      <RevealGroup className="grid grid-cols-1 gap-6 md:grid-cols-3" stagger={0.1}>
        {steps.map((step, index) => (
          <RevealItem
            key={step.id}
            as="article"
            data-testid={`how-step-${step.id}`}
            className="relative"
          >
            <TiltCard>
              <Card tone="paper" shadow="md" rotation={step.rotate}>
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center border-2 border-carbon ${TILE_BG[step.tone]}`}
                  >
                    {step.icon}
                  </div>
                  <span className="font-riso-display text-5xl leading-none text-paper-dim">
                    {step.id}
                  </span>
                </div>

                <h3 className="mt-5 font-riso-display text-2xl text-carbon">{step.title}</h3>
                <p className="mt-2 font-riso-body text-sm leading-6 text-carbon-soft">
                  {step.description}
                </p>

                <div className="mt-6 inline-flex items-center gap-2 border-2 border-carbon bg-paper-deep px-3 py-1.5">
                  <span className="font-riso-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-carbon-muted">
                    Ortalama
                  </span>
                  <span className="font-riso-mono font-bold text-carbon">{step.hint}</span>
                </div>
              </Card>
            </TiltCard>

            {index < steps.length - 1 && (
              <div className="absolute -right-4 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center border-2 border-carbon bg-riso-pink md:flex">
                <ChevronRight size={16} strokeWidth={3} className="text-carbon" />
              </div>
            )}
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  </section>
);
