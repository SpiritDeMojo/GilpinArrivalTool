import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useUser } from '../contexts/UserProvider';
import { Department, UserLocation } from '../types';

/* ── Floating Particle Background ── */
function GoldParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number; da: number }[] = [];
    const COUNT = 40;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.4 - 0.1,
        r: Math.random() * 2.5 + 0.5,
        a: Math.random(),
        da: (Math.random() - 0.5) * 0.008,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.da;
        if (p.a > 1) p.da = -Math.abs(p.da);
        if (p.a < 0.1) p.da = Math.abs(p.da);
        if (p.y < -10) { p.y = window.innerHeight + 10; p.x = Math.random() * window.innerWidth; }
        if (p.x < -10) p.x = window.innerWidth + 10;
        if (p.x > window.innerWidth + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(191, 155, 96, ${p.a * 0.5})`;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        g.addColorStop(0, `rgba(191, 155, 96, ${p.a * 0.15})`);
        g.addColorStop(1, 'rgba(191, 155, 96, 0)');
        ctx.fillStyle = g;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

/* ── Animation Variants ── */
const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.92, filter: 'blur(12px)' },
  visible: {
    opacity: 1, y: 0, scale: 1, filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
  },
};

const logoVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5, rotate: -20 },
  visible: {
    opacity: 1, scale: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 15, delay: 0.5 },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.7 } },
};

const subtitleVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.85 } },
};

const formVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delay: 1.0, duration: 0.5, staggerChildren: 0.1 } },
};

const fieldVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const deptCardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: 1.2 + i * 0.12, type: 'spring', stiffness: 300, damping: 20 },
  }),
};

const buttonVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { delay: 1.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const errorVariants: Variants = {
  hidden: { opacity: 0, x: 0 },
  visible: { opacity: 1, x: 0 },
  shake: {
    x: [0, -10, 10, -6, 6, -2, 2, 0],
    transition: { duration: 0.5 },
  },
};

export default function LoginScreen() {
  const { setUserName, setDepartment, setLocation } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('gilpin_auth') === 'true');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordShakeKey, setPasswordShakeKey] = useState(0);
  const [name, setName] = useState('');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Gilpin1') {
      sessionStorage.setItem('gilpin_auth', 'true');
      setIsAuthenticated(true);
      setPasswordError('');
    } else {
      setPasswordError('Incorrect password');
      setPasswordShakeKey(k => k + 1);
    }
  }, [password]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Please enter at least 2 characters');
      setShakeKey(k => k + 1);
      return;
    }
    if (trimmed.length > 30) {
      setError('Name must be 30 characters or less');
      setShakeKey(k => k + 1);
      return;
    }
    if (!selectedDept) {
      setError('Please select your department');
      setShakeKey(k => k + 1);
      return;
    }
    if (!selectedLocation) {
      setError('Please select your location');
      setShakeKey(k => k + 1);
      return;
    }
    setIsSubmitting(true);
    // Brief animation before navigating
    setTimeout(() => {
      setLocation(selectedLocation);
      setDepartment(selectedDept);
      setUserName(trimmed);
    }, 400);
  }, [name, selectedDept, selectedLocation, setUserName, setDepartment, setLocation]);

  const departments: { code: Department; label: string; icon: string; desc: string }[] = [
    { code: 'HK', label: 'Housekeeping', icon: '🧹', desc: 'Room cleaning & prep' },
    { code: 'MAIN', label: 'Maintenance', icon: '🔧', desc: 'Repairs & upkeep' },
    { code: 'REC', label: 'Front of House', icon: '🛎️', desc: 'Full access — all departments' },
  ];

  const locations: { code: UserLocation; label: string; icon: string; desc: string }[] = [
    { code: 'main', label: 'Gilpin Hotel', icon: '🏛️', desc: 'Main Hotel — 30 rooms' },
    { code: 'lake', label: 'Lake House', icon: '🏡', desc: 'Lake House — 8 rooms' },
  ];

  return (
    <div className="login-screen">
      {/* Floating gold particles */}
      <GoldParticles />

      {/* Ambient gradient orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />

      {/* Password Gate */}
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <motion.div
            key="password-gate"
            className="login-card"
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)', transition: { duration: 0.3 } }}
          >
            <div className="login-header">
              <motion.div
                className="login-logo"
                variants={logoVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.1, rotate: 5, transition: { type: 'spring', stiffness: 300 } }}
              >
                🔒
              </motion.div>
              <motion.h1 className="login-title" variants={titleVariants} initial="hidden" animate="visible">
                Gilpin Hotel
              </motion.h1>
              <motion.p className="login-subtitle" variants={subtitleVariants} initial="hidden" animate="visible">
                Staff Access
              </motion.p>
            </div>

            <motion.form
              onSubmit={handlePasswordSubmit}
              className="login-form"
              variants={formVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.label htmlFor="login-password" className="login-label" variants={fieldVariants}>
                Enter access code
              </motion.label>
              <motion.div variants={fieldVariants}>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Access code..."
                  className="login-input"
                  autoFocus
                  autoComplete="off"
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {passwordError && (
                  <motion.p
                    key={passwordShakeKey}
                    className="login-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="shake"
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    {passwordError}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="login-button"
                disabled={!password.trim()}
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 12px 30px rgba(191, 155, 96, 0.4)',
                  transition: { type: 'spring', stiffness: 400 },
                }}
                whileTap={{ scale: 0.97 }}
              >
                Unlock
              </motion.button>
            </motion.form>

            <motion.p
              className="login-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.5 }}
            >
              Contact management for access credentials.
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="login-form"
            className="login-card"
            variants={cardVariants}
            initial="hidden"
            animate={isSubmitting ? { opacity: 0, scale: 1.05, filter: 'blur(8px)', transition: { duration: 0.4 } } : "visible"}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)', transition: { duration: 0.3 } }}
          >
            <div className="login-header">
              <motion.div
                className="login-logo"
                variants={logoVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ scale: 1.1, rotate: 5, transition: { type: 'spring', stiffness: 300 } }}
              >
                🏨
              </motion.div>
              <motion.h1 className="login-title" variants={titleVariants} initial="hidden" animate="visible">
                Gilpin Hotel
              </motion.h1>
              <motion.p className="login-subtitle" variants={subtitleVariants} initial="hidden" animate="visible">
                Arrival Management Tool
              </motion.p>
            </div>

            <motion.form
              onSubmit={handleSubmit}
              className="login-form"
              variants={formVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.label htmlFor="login-name" className="login-label" variants={fieldVariants}>
                Enter your name
              </motion.label>
              <motion.div variants={fieldVariants}>
                <input
                  id="login-name"
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="e.g. Sarah, Tom..."
                  className="login-input"
                  autoFocus
                  autoComplete="off"
                  maxLength={30}
                />
              </motion.div>

              <motion.label className="login-label" style={{ marginTop: '0.5rem' }} variants={fieldVariants}>
                Select your department
              </motion.label>
              <div className="login-dept-grid">
                {departments.map((d, i) => (
                  <motion.button
                    key={d.code}
                    type="button"
                    className={`login-dept-card ${selectedDept === d.code ? 'login-dept-card--active' : ''}`}
                    onClick={() => { setSelectedDept(d.code); setError(''); }}
                    custom={i}
                    variants={deptCardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.06, y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className="login-dept-icon"
                      animate={selectedDept === d.code ? { scale: [1, 1.3, 1], transition: { duration: 0.4 } } : {}}
                    >
                      {d.icon}
                    </motion.span>
                    <span className="login-dept-name">{d.label}</span>
                    <span className="login-dept-desc">{d.desc}</span>
                  </motion.button>
                ))}
              </div>

              <motion.label className="login-label" style={{ marginTop: '0.5rem' }} variants={fieldVariants}>
                Your location
              </motion.label>
              <div className="login-dept-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {locations.map((loc, i) => (
                  <motion.button
                    key={loc.code}
                    type="button"
                    className={`login-dept-card ${selectedLocation === loc.code ? 'login-dept-card--active' : ''}`}
                    onClick={() => { setSelectedLocation(loc.code); setError(''); }}
                    custom={i}
                    variants={deptCardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.06, y: -4, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.span
                      className="login-dept-icon"
                      animate={selectedLocation === loc.code ? { scale: [1, 1.3, 1], transition: { duration: 0.4 } } : {}}
                    >
                      {loc.icon}
                    </motion.span>
                    <span className="login-dept-name">{loc.label}</span>
                    <span className="login-dept-desc">{loc.desc}</span>
                  </motion.button>
                ))}
              </div>

              {/* Error with shake animation */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key={shakeKey}
                    className="login-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="shake"
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                className="login-button"
                disabled={name.trim().length < 2 || !selectedDept || !selectedLocation || isSubmitting}
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                whileHover={!isSubmitting ? {
                  scale: 1.02,
                  boxShadow: '0 12px 30px rgba(191, 155, 96, 0.4)',
                  transition: { type: 'spring', stiffness: 400 },
                } : {}}
                whileTap={!isSubmitting ? { scale: 0.97 } : {}}
              >
                {isSubmitting ? (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="login-button-loading"
                  >
                    <span className="login-spinner" /> Signing in...
                  </motion.span>
                ) : (
                  `Sign In as ${selectedDept ? departments.find(d => d.code === selectedDept)?.label : '...'}`
                )}
              </motion.button>
            </motion.form>

            <motion.p
              className="login-footer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.5 }}
            >
              Your name and department control what you see and track.
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .login-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          font-family: 'Inter', -apple-system, sans-serif;
          overflow: hidden;
        }

        /* Ambient gradient orbs */
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }
        .login-orb-1 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(191, 155, 96, 0.15), transparent 70%);
          top: -100px;
          right: -100px;
          animation: orbFloat1 8s ease-in-out infinite;
        }
        .login-orb-2 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.08), transparent 70%);
          bottom: -80px;
          left: -80px;
          animation: orbFloat2 10s ease-in-out infinite;
        }
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-30px, 20px); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -25px); }
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          margin: 1rem;
          padding: 2.5rem 2rem;
          background: rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(191, 155, 96, 0.25);
          border-radius: 24px;
          box-shadow:
            0 25px 60px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .login-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-logo {
          font-size: 3.5rem;
          margin-bottom: 0.5rem;
          filter: drop-shadow(0 4px 12px rgba(191, 155, 96, 0.4));
          display: inline-block;
          cursor: pointer;
        }

        .login-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #bf9b60;
          margin: 0;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #bf9b60, #e8c885, #bf9b60);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: titleShimmer 4s ease-in-out infinite;
        }
        @keyframes titleShimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 200% center; }
        }

        .login-subtitle {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.45);
          margin: 0.25rem 0 0 0;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 500;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .login-label {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
          font-weight: 500;
        }

        .login-input {
          width: 100%;
          padding: 0.875rem 1rem;
          font-size: 1rem;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          border: 1.5px solid rgba(191, 155, 96, 0.2);
          border-radius: 14px;
          outline: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
        }

        .login-input:focus {
          border-color: #bf9b60;
          background: rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 0 4px rgba(191, 155, 96, 0.12), 0 8px 24px rgba(191, 155, 96, 0.08);
          transform: translateY(-1px);
        }

        .login-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }

        /* Department selector grid */
        .login-dept-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }

        .login-dept-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1.5px solid rgba(191, 155, 96, 0.12);
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
          color: rgba(255, 255, 255, 0.55);
          position: relative;
          overflow: hidden;
        }

        .login-dept-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(circle at 50% 120%, rgba(191, 155, 96, 0.15), transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .login-dept-card:hover::before {
          opacity: 1;
        }

        .login-dept-card--active {
          background: rgba(191, 155, 96, 0.15) !important;
          border-color:rgb(191, 155, 96) !important;
          color: #fff !important;
          box-shadow: 0 0 0 3px rgba(191, 155, 96, 0.15), 0 8px 24px rgba(191, 155, 96, 0.2);
        }

        .login-dept-card--active::before {
          opacity: 1;
        }

        .login-dept-icon {
          font-size: 1.8rem;
          display: inline-block;
        }

        .login-dept-name {
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .login-dept-desc {
          font-size: 0.6rem;
          opacity: 0.6;
          text-align: center;
          line-height: 1.2;
        }

        .login-error {
          color: #ff6b6b;
          font-size: 0.8rem;
          margin: 0;
          font-weight: 500;
        }

        .login-button {
          width: 100%;
          padding: 0.95rem;
          margin-top: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          color: #1a1a2e;
          background: linear-gradient(135deg, #bf9b60, #d4af72, #e8c885);
          background-size: 200% auto;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          letter-spacing: 0.5px;
          position: relative;
          overflow: hidden;
        }

        .login-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transition: left 0.5s;
        }
        .login-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .login-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .login-button-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .login-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(26, 26, 46, 0.3);
          border-top-color: #1a1a2e;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.3);
          margin: 1.5rem 0 0 0;
          line-height: 1.4;
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .login-orb { animation: none; }
          .login-title { animation: none; }
          .login-button::before { transition: none; }
        }
      `}</style>
    </div >
  );
}
