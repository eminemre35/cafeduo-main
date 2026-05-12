/**
 * Navbar — Riso Kantin redesign (PR #24).
 *
 * Fixed top nav. Bordered paper bar with offset shadow + pinned at the top
 * with subtle backdrop blur over scrolled content. Brand mark is an
 * ink-bordered pink chip; menu items use the printed-zine type system.
 *
 * Handler signatures + data-testid attributes preserved (logout-button).
 */
import React, { useEffect, useState } from 'react';
import { Bell, Menu, X, Coffee, LogOut, ChevronRight, ShoppingCart, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { NAV_ITEMS } from '../constants';
import { BUILD_META } from '../lib/buildMeta';
import type { User } from '../types';

interface NavbarProps {
  isLoggedIn?: boolean;
  user?: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isLoggedIn = false, user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const scrollToSection = (id: string) => {
    setIsOpen(false);
    if (isLoggedIn) return;

    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <nav
        className="riso-kantin fixed left-1/2 top-4 z-[100] w-[96%] max-w-[1320px] -translate-x-1/2 transition-transform duration-300"
        role="navigation"
        aria-label="Ana navigasyon"
      >
        <div className="flex items-center justify-between gap-4 border-2 border-carbon bg-paper/95 backdrop-blur-md px-4 py-2.5 md:px-5 md:py-3 riso-shadow-sm">
          <div
            className="flex cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-85"
            onClick={() => {
              if (isLoggedIn) navigate('/dashboard');
              else scrollToSection('home');
            }}
            role="button"
            tabIndex={0}
            aria-label="Ana sayfa"
            onKeyDown={(event) =>
              event.key === 'Enter' &&
              (isLoggedIn ? navigate('/dashboard') : scrollToSection('home'))
            }
          >
            <div className="flex h-9 w-9 items-center justify-center border-2 border-carbon bg-riso-pink text-carbon">
              <Coffee size={18} strokeWidth={2.5} />
            </div>
            <span className="font-riso-display text-lg sm:text-xl font-bold text-carbon">
              Cafe<span className="text-riso-pink-deep">Duo</span>
              <span className="sr-only">CafeDuo</span>
            </span>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {!isLoggedIn ? (
              <>
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="riso-focus px-3 py-2 font-riso-body text-xs font-bold uppercase tracking-[0.1em] text-carbon-soft transition-colors hover:text-riso-pink-deep"
                  >
                    {item.label}
                  </button>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-2">
                {user && !isHomePage && (
                  <div className="flex items-center gap-2 border-2 border-carbon bg-riso-mustard px-3 py-1.5">
                    <Wallet size={14} className="text-carbon" />
                    <span className="font-riso-mono text-sm font-bold text-carbon">
                      {user.points}
                      <span className="ml-1 text-[0.65rem] uppercase tracking-wider opacity-80">
                        CP
                      </span>
                    </span>
                  </div>
                )}
                {!isHomePage && (
                  <button
                    onClick={() => navigate('/store')}
                    className="riso-focus flex items-center gap-2 border-2 border-carbon bg-paper px-3 py-1.5 font-riso-body text-sm font-semibold text-carbon transition-colors hover:bg-paper-deep"
                  >
                    <ShoppingCart size={16} />
                    <span className="hidden lg:inline">Mağaza</span>
                  </button>
                )}
                <button
                  onClick={onLogout}
                  data-testid="logout-button"
                  className="riso-focus riso-press flex items-center gap-2 border-2 border-carbon bg-riso-redox px-3 py-1.5 font-riso-body text-sm font-bold text-paper transition-all riso-shadow-sm"
                >
                  <LogOut size={16} />
                  <span className="hidden lg:inline">Çıkış</span>
                </button>
              </div>
            )}
            <span
              className="ml-2 hidden font-riso-mono text-[10px] uppercase tracking-widest text-carbon-muted lg:block"
              title={BUILD_META.buildTime !== 'unknown' ? `Build: ${BUILD_META.buildTime}` : ''}
            >
              V-{BUILD_META.shortVersion}
            </span>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
            aria-label={isOpen ? 'Menüyü kapat' : 'Menüyü aç'}
            className="riso-focus flex h-10 w-10 items-center justify-center border-2 border-carbon bg-paper text-carbon transition-colors hover:bg-paper-deep md:hidden"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="riso-kantin fixed left-4 right-4 top-20 z-[90] border-2 border-carbon bg-paper p-5 riso-shadow-md md:hidden"
            aria-hidden={false}
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-riso-display text-lg text-carbon">Menü</span>
                {!isLoggedIn && <Bell size={18} className="text-carbon-muted" />}
              </div>
              {!isLoggedIn ? (
                NAV_ITEMS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="riso-focus flex items-center justify-between border-b-2 border-paper-dim py-3 font-riso-body text-base font-semibold text-carbon transition-colors hover:text-riso-pink-deep"
                  >
                    {item.label}
                    <ChevronRight size={20} className="text-carbon-muted" />
                  </button>
                ))
              ) : (
                <>
                  {user && !isHomePage && (
                    <div className="flex items-center justify-between border-b-2 border-paper-dim py-3 font-riso-body text-base font-semibold text-carbon">
                      <span className="flex items-center gap-2">
                        <Wallet size={20} /> Cüzdan
                      </span>
                      <span className="font-riso-mono">{user.points} CP</span>
                    </div>
                  )}
                  {!isHomePage && (
                    <button
                      onClick={() => {
                        navigate('/store');
                        setIsOpen(false);
                      }}
                      className="riso-focus flex items-center justify-between border-b-2 border-paper-dim py-3 font-riso-body text-base font-semibold text-carbon transition-colors hover:text-riso-pink-deep"
                    >
                      <span>Mağaza</span>
                      <ShoppingCart size={20} className="text-carbon-muted" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onLogout?.();
                      setIsOpen(false);
                    }}
                    className="riso-focus riso-press mt-3 flex w-full items-center justify-center gap-3 border-2 border-carbon bg-riso-redox py-3 font-riso-body text-base font-bold text-paper riso-shadow-sm"
                  >
                    <LogOut size={20} /> Çıkış Yap
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
