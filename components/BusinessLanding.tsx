/**
 * BusinessLanding — /kafeler route (PR feat/business-landing).
 *
 * Cafe-owner facing landing page used in pilot outreach.
 * Same Riso Kantin design system as Hero.tsx; copy shifts from
 * "student fun" to "owner ROI" (returning customer, no-show recovery,
 * social proof, free pilot offer).
 *
 * Pilot CTA = WhatsApp deep-link + mailto fallback. No backend needed.
 * NOTE: Replace WHATSAPP_NUMBER and CONTACT_EMAIL below with real values
 * before launch (or move to import.meta.env when ready).
 */
import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Clock,
  Coffee,
  Gift,
  MessageCircle,
  Repeat,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Button, Squiggle } from './ui';

// TODO: değiştir — kendi WhatsApp numaran (uluslararası format, + ve boşluksuz)
const WHATSAPP_NUMBER = '905555555555';
const WHATSAPP_PREFILL = encodeURIComponent(
  'Selam, cafeduotr.com pilot programı için yazıyorum. Kafem hakkında konuşabilir miyiz?'
);
const CONTACT_EMAIL = 'pilot@cafeduotr.com';

const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_PREFILL}`;
const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=Pilot%20Ba%C5%9Fvuru&body=Kafemin%20ad%C4%B1%3A%20%0AKonum%3A%20%0AInstagram%3A%20%0A`;

export const BusinessLanding: React.FC = () => {
  return (
    <div className="riso-kantin riso-kantin-app bg-paper">
      <HeroSection />
      <HowItWorksOwner />
      <ValueProps />
      <PricingSection />
      <FaqSection />
      <ClosingCta />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────
const HeroSection: React.FC = () => (
  <section
    aria-label="Kafe sahipleri için ana bölüm"
    className="relative min-h-[80vh] overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0 opacity-[0.06] mix-blend-multiply"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
        backgroundSize: '6px 6px',
      }}
    />

    {/* Decorative sticker shapes */}
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0">
      <div className="absolute left-[6%] top-[18%] h-16 w-16 bg-riso-mustard rotate-[-8deg] border-2 border-carbon riso-shadow-pink-only opacity-90 hidden md:block" />
      <div className="absolute right-[8%] top-[24%] h-20 w-20 bg-riso-pink rotate-[6deg] border-2 border-carbon riso-shadow-blue-only opacity-90 hidden md:block" />
      <div className="absolute left-[12%] bottom-[12%] h-12 w-28 bg-riso-blue rotate-[-2deg] border-2 border-carbon hidden lg:block" />
    </div>

    <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex justify-center"
      >
        <span className="inline-flex items-center gap-2 border-2 border-carbon bg-paper px-3 py-1.5 font-riso-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-carbon riso-shadow-pink-only">
          <span className="h-2 w-2 rounded-full bg-riso-pink animate-pulse" />
          Kafe sahipleri için · İlk 2 kafeye 1 ay ücretsiz
        </span>
      </motion.div>

      <motion.h1
        lang="tr"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="text-center font-riso-display text-[2.4rem] sm:text-[3.6rem] lg:text-[4.6rem] leading-[0.95] tracking-tight text-carbon"
      >
        Üniversiteli müşteri{' '}
        <span className="relative inline-block">
          <span className="relative z-10 text-riso-pink-deep">geri gelsin</span>
          <span aria-hidden="true" className="absolute -bottom-1 left-0 right-0 h-2.5">
            <Squiggle tone="blue" />
          </span>
        </span>
        , masada kalsın, paylaşsın.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.18 }}
        className="mx-auto mt-6 max-w-2xl text-center font-riso-body text-lg leading-relaxed text-carbon-soft sm:text-xl"
      >
        Müşterileriniz masada mini oyunlar oynar, puan kazanır, sizin koyduğunuz ödülleri alır.
        Kurulum 30 dakika. İlk ay ücretsiz. Sözleşme yok.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
      >
        <Button
          tone="pink"
          size="lg"
          onClick={() => window.open(whatsappHref, '_blank', 'noopener,noreferrer')}
          aria-label="WhatsApp ile pilot başvuru"
          trailingIcon={<ArrowRight size={18} />}
        >
          Pilot Başvur — WhatsApp
        </Button>
        <Button
          tone="paper"
          size="lg"
          onClick={() => {
            const el = document.getElementById('nasil-calisir');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label="Nasıl çalıştığını gör"
          leadingIcon={<Coffee size={17} />}
        >
          Nasıl Çalışır?
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <Stat icon={<Clock size={18} />} label="Kurulum" value="30 dk" tone="pink" rotate={-1.5} />
        <Stat icon={<Gift size={18} />} label="Pilot" value="1 ay ücretsiz" tone="blue" rotate={1} />
        <Stat icon={<Repeat size={18} />} label="Sözleşme" value="İstediğin an iptal" tone="mustard" rotate={-0.5} />
      </motion.div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// How It Works — owner POV
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '01',
    title: 'Kafenizi tanıtın',
    body: 'Konum, masa sayısı ve 3 ödül seçeneği girin. Setup\'ı bizzat birlikte yapıyoruz.',
    tone: 'pink' as const,
  },
  {
    n: '02',
    title: 'Müşteriler oynar',
    body: 'Masadan QR ile giriş yaparlar, 5 dakikalık oyunlar oynarlar, puan biriktirirler.',
    tone: 'blue' as const,
  },
  {
    n: '03',
    title: 'Sizin ödülünüzü alırlar',
    body: 'Puanlarını kahve, indirim veya tatlı kuponuna çevirirler. Kupon QR ile kasada gösterilir.',
    tone: 'mustard' as const,
  },
];

const HowItWorksOwner: React.FC = () => (
  <section
    id="nasil-calisir"
    aria-label="Nasıl çalışır"
    className="relative border-t-2 border-carbon bg-paper py-20 sm:py-28"
  >
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-12 text-center">
        <p className="font-riso-mono text-xs uppercase tracking-[0.18em] text-carbon-soft">
          Sizin için
        </p>
        <h2 className="mt-2 font-riso-display text-[2.2rem] sm:text-[3rem] leading-tight text-carbon">
          3 adımda kafede yeni bir tat
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`relative border-2 border-carbon bg-paper p-6 riso-shadow-sm`}
          >
            <span
              className={`absolute -top-3 -left-3 inline-flex h-12 w-12 items-center justify-center border-2 border-carbon font-riso-display text-lg ${
                s.tone === 'pink'
                  ? 'bg-riso-pink text-carbon'
                  : s.tone === 'blue'
                    ? 'bg-riso-blue text-paper'
                    : 'bg-riso-mustard text-carbon'
              }`}
            >
              {s.n}
            </span>
            <h3 className="mt-4 font-riso-display text-xl text-carbon">{s.title}</h3>
            <p className="mt-3 font-riso-body text-base leading-relaxed text-carbon-soft">
              {s.body}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Value props — what's in it for the cafe
// ─────────────────────────────────────────────────────────────────────────────
const BENEFITS = [
  {
    icon: <Repeat size={22} />,
    title: 'Geri dönen müşteri',
    body: 'Puan biriktiren öğrenci, ödülünü kullanmaya geri gelir. Sadakat kartı doğal hâliyle çalışır.',
  },
  {
    icon: <TrendingUp size={22} />,
    title: 'Ortalama harcama artışı',
    body: 'Masada daha uzun kalan müşteri daha çok sipariş verir. Oyun = 15-30 dk ek oturma.',
  },
  {
    icon: <Users size={22} />,
    title: 'Yeni müşteri',
    body: 'Liderlik tablosu ve "arkadaşı yen" mekaniği = öğrenciler arkadaşlarını kafenize çağırır.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Sosyal medyada görünürlük',
    body: 'Kazanılan ödüller doğal Instagram içeriği üretir. Etiketleme + lokasyon paylaşımı bedava.',
  },
];

const ValueProps: React.FC = () => (
  <section
    aria-label="Faydalar"
    className="relative border-t-2 border-carbon bg-riso-pink-soft py-20 sm:py-28"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-0 opacity-[0.08] mix-blend-multiply"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
        backgroundSize: '6px 6px',
      }}
    />
    <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-12 text-center">
        <p className="font-riso-mono text-xs uppercase tracking-[0.18em] text-carbon-soft">
          Cafeduo ile
        </p>
        <h2 className="mt-2 font-riso-display text-[2.2rem] sm:text-[3rem] leading-tight text-carbon">
          Kafenize ne katar?
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {BENEFITS.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            className="flex items-start gap-4 border-2 border-carbon bg-paper p-5 riso-shadow-sm"
          >
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center border-2 border-carbon bg-riso-mustard text-carbon">
              {b.icon}
            </span>
            <div>
              <h3 className="font-riso-display text-lg text-carbon">{b.title}</h3>
              <p className="mt-1 font-riso-body text-base leading-relaxed text-carbon-soft">
                {b.body}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────────────────────────────────────
const PricingSection: React.FC = () => (
  <section
    aria-label="Fiyatlandırma"
    className="relative border-t-2 border-carbon bg-paper py-20 sm:py-28"
  >
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-12 text-center">
        <p className="font-riso-mono text-xs uppercase tracking-[0.18em] text-carbon-soft">
          Şeffaf fiyat
        </p>
        <h2 className="mt-2 font-riso-display text-[2.2rem] sm:text-[3rem] leading-tight text-carbon">
          Önce deneyin, sonra konuşalım
        </h2>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
        {/* Pilot */}
        <div className="relative border-2 border-carbon bg-riso-mustard p-6 riso-shadow-sm">
          <span className="absolute -top-3 left-4 inline-block border-2 border-carbon bg-paper px-2 py-0.5 font-riso-mono text-[0.65rem] uppercase tracking-[0.14em] text-carbon">
            İlk 2 kafe
          </span>
          <h3 className="mt-2 font-riso-display text-2xl text-carbon">Pilot</h3>
          <p className="mt-1 font-riso-display text-5xl text-carbon">₺0</p>
          <p className="font-riso-body text-sm text-carbon-soft">1 ay tamamen ücretsiz</p>
          <ul className="mt-5 space-y-2 font-riso-body text-sm text-carbon">
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> Tüm özellikler açık
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> Birlikte setup
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> WhatsApp destek
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> Vaka çalışması karşılığı
            </li>
          </ul>
        </div>

        {/* Pro */}
        <div className="relative border-2 border-carbon bg-paper p-6 riso-shadow-sm">
          <h3 className="mt-2 font-riso-display text-2xl text-carbon">Pro</h3>
          <p className="mt-1 font-riso-display text-5xl text-carbon">
            ₺800
            <span className="font-riso-body text-base text-carbon-soft"> /ay</span>
          </p>
          <p className="font-riso-body text-sm text-carbon-soft">
            Yıllık ₺6.400 (2 ay hediye)
          </p>
          <ul className="mt-5 space-y-2 font-riso-body text-sm text-carbon">
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> Sınırsız müşteri & oyun
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> Kafe paneli + analitik
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> Kupon ve çark yönetimi
            </li>
            <li className="flex items-start gap-2">
              <Check size={16} className="mt-0.5 shrink-0" /> İstediğin an iptal
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-8 text-center font-riso-body text-sm text-carbon-soft">
        3+ şubeli kafelere özel teklif —{' '}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-riso-pink decoration-2 underline-offset-2"
        >
          WhatsApp&apos;tan yazın
        </a>
        .
      </p>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'Müşteri telefonuna uygulama yüklemek zorunda mı?',
    a: 'Hayır. CafeDuo bir PWA — tarayıcıdan anında açılır. İsteyen ana ekrana ekleyebilir.',
  },
  {
    q: 'Pilot bittiğinde ne olur?',
    a: 'Memnunsanız Pro plana geçersiniz. Memnun değilseniz hesabınız kapanır, hiçbir şey ödemezsiniz.',
  },
  {
    q: 'KVKK uyumu var mı?',
    a: 'Evet. Konum izni KVKK uyumlu açıklama ile alınır, kullanıcı verisi minimum tutulur. Detay: /gizlilik',
  },
  {
    q: 'Kuponlar nasıl kullanılır?',
    a: 'Müşteri kazandığı kuponu CafeDuo uygulamasında gösterir, siz kasada QR ile onaylarsınız. Sahtekarlık koruması var.',
  },
  {
    q: 'Setup ne kadar sürer?',
    a: 'Ortalama 30 dakika. Sizinle birlikte yapıyoruz: kafe bilgisi, masa PIN\'leri, 3 ödül seçeneği.',
  },
];

const FaqSection: React.FC = () => (
  <section
    aria-label="Sıkça sorulan sorular"
    className="relative border-t-2 border-carbon bg-paper py-20 sm:py-28"
  >
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <div className="mb-10 text-center">
        <p className="font-riso-mono text-xs uppercase tracking-[0.18em] text-carbon-soft">
          SSS
        </p>
        <h2 className="mt-2 font-riso-display text-[2rem] sm:text-[2.6rem] leading-tight text-carbon">
          Hemen aklınıza gelenler
        </h2>
      </div>

      <div className="divide-y-2 divide-carbon border-2 border-carbon bg-paper riso-shadow-sm">
        {FAQS.map((f, i) => (
          <details key={i} className="group p-5">
            <summary className="cursor-pointer list-none font-riso-display text-lg text-carbon flex items-start justify-between gap-4">
              <span>{f.q}</span>
              <span className="font-riso-mono text-sm text-carbon-soft transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 font-riso-body text-base leading-relaxed text-carbon-soft">
              {f.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────────────────────
// Closing CTA
// ─────────────────────────────────────────────────────────────────────────────
const ClosingCta: React.FC = () => (
  <section
    aria-label="Son çağrı"
    className="relative border-t-2 border-carbon bg-riso-blue py-20 sm:py-28 text-paper"
  >
    <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
      <h2 className="font-riso-display text-[2.2rem] sm:text-[3rem] leading-tight">
        İlk 2 kafeden biri olun.
      </h2>
      <p className="mx-auto mt-4 max-w-xl font-riso-body text-lg leading-relaxed opacity-95">
        1 ay tamamen ücretsiz. 20 dakikalık geri bildirim + isim kullanım izni karşılığında.
        Setup&apos;ı birlikte yapıyoruz.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border-2 border-carbon bg-riso-pink px-5 py-3 font-riso-display text-base text-carbon riso-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
        >
          <MessageCircle size={18} /> WhatsApp ile başvur
        </a>
        <a
          href={mailtoHref}
          className="inline-flex items-center gap-2 border-2 border-carbon bg-paper px-5 py-3 font-riso-display text-base text-carbon riso-shadow-sm hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
        >
          E-posta gönder
        </a>
      </div>

      <p className="mt-6 font-riso-mono text-xs uppercase tracking-[0.14em] opacity-80">
        Cevap genelde 1 saatte gelir.
      </p>
    </div>
  </section>
);

export default BusinessLanding;
