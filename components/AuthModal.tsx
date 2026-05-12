import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertTriangle,
  Briefcase,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { RetroButton } from './RetroButton';
import { User as UserType } from '../types';
import { api } from '../lib/api';
import { PAU_DEPARTMENTS } from '../constants';
import { useToast } from '../contexts/ToastContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode: 'login' | 'register';
  onLoginSuccess: (user: UserType) => void;
}

// Validation rules
const VALIDATION = {
  username: {
    min: 3,
    max: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: 'Kullanıcı adı 3-20 karakter, sadece harf, rakam ve alt çizgi içerebilir',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Geçerli bir e-posta adresi girin',
  },
  password: {
    min: 6,
    max: 50,
    message: 'Şifre en az 6 karakter olmalıdır',
  },
};

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

interface AuthLikeError {
  code?: string;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState(initialMode);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Toast hook
  const toast = useToast();

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    setMode(initialMode);
    resetForm();
  }, [initialMode, isOpen]);

  const resetForm = () => {
    setError('');
    setForgotMessage('');
    setIsForgotPasswordMode(false);
    setFieldErrors({});
    setTouched({});
    setHasSubmitted(false);
    setUsername('');
    setEmail('');
    setPassword('');
    setDepartment('');
    setShowPassword(false);
  };

  // Real-time validation
  const validateField = (field: keyof FieldErrors, value: string): string | undefined => {
    switch (field) {
      case 'username':
        if (mode !== 'register') return undefined;
        if (!value) return 'Kullanıcı adı gereklidir';
        if (value.length < VALIDATION.username.min)
          return `En az ${VALIDATION.username.min} karakter`;
        if (value.length > VALIDATION.username.max)
          return `En fazla ${VALIDATION.username.max} karakter`;
        if (!VALIDATION.username.pattern.test(value)) return 'Sadece harf, rakam ve alt çizgi';
        return undefined;
      case 'email':
        if (!value) return 'E-posta adresi gereklidir';
        if (!VALIDATION.email.pattern.test(value)) return VALIDATION.email.message;
        return undefined;
      case 'password':
        if (!value) return 'Şifre gereklidir';
        if (value.length < VALIDATION.password.min) return VALIDATION.password.message;
        return undefined;
      default:
        return undefined;
    }
  };

  const handleBlur = (field: keyof FieldErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = field === 'username' ? username : field === 'email' ? email : password;
    const error = validateField(field, value);
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof FieldErrors, value: string) => {
    switch (field) {
      case 'username':
        setUsername(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
    }
    // Clear error when user types
    if (touched[field]) {
      const error = validateField(field, value);
      setFieldErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (isForgotPasswordMode) {
      errors.email = validateField('email', email);
    } else {
      if (mode === 'register') {
        errors.username = validateField('username', username);
      }
      errors.email = validateField('email', email);
      errors.password = validateField('password', password);
    }

    // Remove undefined errors
    const cleanErrors: FieldErrors = {};
    Object.entries(errors).forEach(([key, value]) => {
      if (value) cleanErrors[key as keyof FieldErrors] = value;
    });

    setFieldErrors(cleanErrors);
    setTouched(
      isForgotPasswordMode ? { email: true } : { username: true, email: true, password: true }
    );

    return Object.keys(cleanErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setHasSubmitted(true);

    // Validate all fields
    if (!validateForm()) {
      toast.error('Lütfen form hatalarını düzeltin');
      return;
    }

    setIsLoading(true);

    try {
      if (isForgotPasswordMode) {
        const response = await api.auth.forgotPassword(email);
        setForgotMessage(response.message);
        toast.success(response.message);
      } else if (mode === 'register') {
        const user = await api.auth.register(username, email, password);
        onLoginSuccess(user);
      } else {
        const user = await api.auth.login(email, password);
        onLoginSuccess(user);
      }
    } catch (err: unknown) {
      console.error('Auth error:', err);
      let errorMessage = 'Bir hata oluştu.';
      const authErr = (typeof err === 'object' && err !== null ? err : {}) as AuthLikeError;
      const errCode = String(authErr.code || '');

      // Legacy Firebase error code mapping (kept for backward compatibility with tests)
      // Current backend returns error messages directly via authErr.message
      if (errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found') {
        errorMessage = 'E-posta veya şifre hatalı.';
      } else if (errCode === 'auth/email-already-in-use') {
        errorMessage = 'Bu e-posta zaten kullanımda.';
      } else if (errCode === 'auth/weak-password') {
        errorMessage = 'Şifre çok zayıf, en az 6 karakter olmalı.';
      } else if (errCode === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta adresi.';
      } else if (authErr.message) {
        errorMessage = authErr.message;
      }

      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setIsForgotPasswordMode(false);
    setForgotMessage('');
    setError('');
    setFieldErrors({});
    setTouched({});
    setHasSubmitted(false);
  };

  /** Riso Kantin: ink-bordered paper input with focus ring. No neon glow. */
  const inputBaseClass =
    'w-full min-h-12 bg-paper-deep border-2 text-carbon font-riso-body text-base leading-6 outline-none transition-all duration-150 placeholder:text-carbon-muted pl-11 pr-12 cursor-text focus:bg-paper focus:ring-2 focus:ring-offset-2 focus:ring-offset-paper';
  const inputBorderClass = 'border-carbon focus:ring-riso-blue';
  const inputErrorClass = 'border-riso-redox focus:ring-riso-redox';
  const iconBaseClass =
    'absolute left-4 top-1/2 -translate-y-1/2 text-carbon-muted pointer-events-none transition-colors group-focus-within:text-carbon group-[.is-error]:text-riso-redox z-10';

  if (!isOpen) return null;

  const title = isForgotPasswordMode
    ? 'Şifremi Unuttum'
    : mode === 'login'
      ? 'Giriş Yap'
      : 'Kayıt Ol';
  const subtitle = isForgotPasswordMode
    ? 'E-posta adresine sıfırlama bağlantısı gönderilir.'
    : mode === 'login'
      ? 'Hesabına giriş yap, kafede oyna.'
      : 'CafeDuo ailesine katıl, ilk puanını kazan.';

  return (
    <AnimatePresence>
      <motion.div
        className="cd-auth-layer fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop — soft ink wash */}
        <motion.div
          className="absolute inset-0 bg-carbon/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Modal Container */}
        <div className="riso-kantin relative w-full max-w-[480px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100vh-2rem)]">
          <motion.div
            className="relative w-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100vh-2rem)] bg-paper border-2 border-carbon riso-shadow-md overflow-hidden flex flex-col"
            initial={{ y: 24, opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Decorative riso confetti corner — printed-zine flair */}
            <div
              aria-hidden="true"
              className="absolute top-3 right-16 h-2 w-12 bg-riso-mustard rotate-[-4deg] pointer-events-none hidden sm:block"
            />
            <div
              aria-hidden="true"
              className="absolute top-7 right-24 h-2 w-6 bg-riso-pink rotate-[6deg] pointer-events-none hidden sm:block"
            />

            {/* Header */}
            <div className="px-5 md:px-7 pt-5 md:pt-6 pb-3 flex justify-between items-start border-b-2 border-carbon shrink-0 bg-paper">
              <div className="min-w-0">
                <p className="font-riso-mono text-[10px] tracking-[0.22em] uppercase text-carbon-muted font-bold mb-1">
                  CafeDuo // Auth
                </p>
                <h2 className="font-riso-display text-carbon text-2xl md:text-3xl uppercase tracking-[0.06em]">
                  {title}
                </h2>
                <p className="font-riso-body text-sm text-carbon-soft mt-1">{subtitle}</p>
              </div>
              <button
                onClick={onClose}
                aria-label="Kapat"
                className="riso-focus shrink-0 w-9 h-9 border-2 border-carbon bg-paper text-carbon hover:bg-riso-redox hover:text-paper flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 md:p-7 flex-1 overflow-y-auto overscroll-contain flex flex-col gap-5">
              {/* Mode switch — ink-bordered tab pair (hidden in forgot mode) */}
              {!isForgotPasswordMode && (
                <div className="flex border-2 border-carbon">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`flex-1 h-11 font-riso-display text-sm sm:text-base uppercase tracking-[0.1em] transition-all ${
                      mode === 'login'
                        ? 'bg-riso-pink text-carbon font-bold'
                        : 'bg-paper text-carbon-muted hover:bg-paper-deep'
                    }`}
                  >
                    Giriş Yap
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`flex-1 h-11 font-riso-display text-sm sm:text-base uppercase tracking-[0.1em] transition-all border-l-2 border-carbon ${
                      mode === 'register'
                        ? 'bg-riso-pink text-carbon font-bold'
                        : 'bg-paper text-carbon-muted hover:bg-paper-deep'
                    }`}
                  >
                    Kayıt Ol
                  </button>
                </div>
              )}

              {error && (
                <div className="bg-riso-redox/15 border-2 border-carbon border-l-[6px] border-l-riso-redox text-carbon px-4 py-3 font-riso-body text-sm flex items-center gap-3">
                  <AlertTriangle size={18} className="shrink-0 text-riso-redox" />
                  <span>{error}</span>
                </div>
              )}
              {forgotMessage && (
                <div className="bg-riso-blue/15 border-2 border-carbon border-l-[6px] border-l-riso-blue text-carbon px-4 py-3 font-riso-body text-sm">
                  {forgotMessage}
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === 'register' && !isForgotPasswordMode && (
                  <>
                    <div
                      className={`relative group ${
                        fieldErrors.username && touched.username ? 'is-error' : ''
                      }`}
                    >
                      <User className={iconBaseClass} size={18} />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => handleChange('username', e.target.value)}
                        onBlur={() => handleBlur('username')}
                        placeholder="Kullanıcı adı"
                        className={`${inputBaseClass} ${
                          fieldErrors.username && touched.username
                            ? inputErrorClass
                            : inputBorderClass
                        }`}
                      />
                      {!fieldErrors.username && touched.username && username && (
                        <Check
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-riso-spring"
                          size={18}
                        />
                      )}
                    </div>
                    {fieldErrors.username && touched.username && (
                      <p className="text-riso-redox text-xs flex items-center gap-1 font-riso-body">
                        <AlertTriangle size={12} /> {fieldErrors.username}
                      </p>
                    )}

                    <div className="relative group">
                      <Briefcase className={iconBaseClass} size={18} />
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className={`${inputBaseClass} ${inputBorderClass} appearance-none cursor-pointer pr-10`}
                      >
                        <option value="">Bölüm seçiniz (isteğe bağlı)</option>
                        {PAU_DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-carbon-muted"
                      />
                    </div>
                  </>
                )}

                <div
                  className={`relative group ${
                    fieldErrors.email && touched.email ? 'is-error' : ''
                  }`}
                >
                  <Mail className={iconBaseClass} size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    onBlur={() => handleBlur('email')}
                    placeholder="E-posta"
                    data-testid="auth-email-input"
                    className={`${inputBaseClass} ${
                      fieldErrors.email && touched.email ? inputErrorClass : inputBorderClass
                    }`}
                  />
                  {!fieldErrors.email && touched.email && email && (
                    <Check
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-riso-spring"
                      size={18}
                    />
                  )}
                </div>
                {fieldErrors.email && touched.email && (
                  <p className="text-riso-redox text-xs flex items-center gap-1 font-riso-body">
                    <AlertTriangle size={12} /> {fieldErrors.email}
                  </p>
                )}

                {!isForgotPasswordMode && (
                  <>
                    <div
                      className={`relative group ${
                        fieldErrors.password && touched.password ? 'is-error' : ''
                      }`}
                    >
                      <Lock className={iconBaseClass} size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        onBlur={() => handleBlur('password')}
                        placeholder="Şifre"
                        data-testid="auth-password-input"
                        className={`${inputBaseClass} ${
                          fieldErrors.password && touched.password
                            ? inputErrorClass
                            : inputBorderClass
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-muted hover:text-carbon transition-colors"
                        aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {fieldErrors.password && touched.password && (
                      <p className="text-riso-redox text-xs flex items-center gap-1 font-riso-body">
                        <AlertTriangle size={12} /> {fieldErrors.password}
                      </p>
                    )}
                  </>
                )}

                {mode === 'login' && !isForgotPasswordMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPasswordMode(true);
                      setError('');
                      setForgotMessage('');
                    }}
                    className="text-sm font-riso-body text-carbon hover:text-riso-pink-deep underline decoration-2 decoration-carbon hover:decoration-riso-pink-deep underline-offset-4 transition-colors block text-right w-full"
                  >
                    Şifremi unuttum
                  </button>
                )}

                <RetroButton
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  data-testid="auth-submit-button"
                  className="w-full mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-carbon border-t-transparent rounded-full animate-spin" />
                      {isForgotPasswordMode
                        ? 'Bağlantı gönderiliyor...'
                        : mode === 'login'
                          ? 'Giriş yapılıyor...'
                          : 'Kayıt yapılıyor...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isForgotPasswordMode
                        ? 'Sıfırlama Bağlantısı Gönder'
                        : mode === 'login'
                          ? 'Giriş Yap'
                          : 'Kayıt Ol'}
                      <ArrowRight size={17} />
                    </span>
                  )}
                </RetroButton>
              </form>

              <div className="space-y-2 text-center">
                {mode === 'login' && !isForgotPasswordMode && (
                  <p className="text-sm font-riso-body text-carbon-soft">
                    Hesabınız yok mu?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('register')}
                      className="text-riso-pink-deep hover:text-carbon font-bold underline decoration-2 underline-offset-4"
                    >
                      Kayıt olun
                    </button>
                  </p>
                )}
                {mode === 'register' && !isForgotPasswordMode && (
                  <p className="text-sm font-riso-body text-carbon-soft">
                    Zaten hesabınız var mı?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-riso-pink-deep hover:text-carbon font-bold underline decoration-2 underline-offset-4"
                    >
                      Giriş yapın
                    </button>
                  </p>
                )}
                {mode === 'login' && isForgotPasswordMode && (
                  <p className="text-sm font-riso-body text-carbon-soft">
                    Şifrenizi hatırladınız mı?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPasswordMode(false);
                        setError('');
                      }}
                      className="text-riso-pink-deep hover:text-carbon font-bold underline decoration-2 underline-offset-4"
                    >
                      Giriş ekranına dön
                    </button>
                  </p>
                )}
                <p className="text-[11px] text-carbon-muted font-riso-mono uppercase tracking-wider">
                  Giriş sonrası rolünüze göre yönlendirilirsiniz.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
