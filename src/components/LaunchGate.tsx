'use client';

import React, { useState, useEffect, useRef } from 'react';

// Play celebratory sound effects synthesized via Web Audio API (no external file dependencies)
function playSynthesizedSound(type: 'snip' | 'fanfare' | 'unlock' | 'error' | 'tick') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'snip') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'fanfare') {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.12;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.3);
      });
    } else if (type === 'unlock') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.25);
      osc2.frequency.setValueAtTime(1320, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(2640, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    }
  } catch {
    // Ignore audio error if autoplay is blocked
  }
}

// Confetti Particle System
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  vRot: number;
}

// Environment configurations
const IS_GATE_ENABLED_ENV = process.env.NEXT_PUBLIC_LAUNCH_GATE_ENABLED === 'true';
const CONFIGURED_PASSCODE = process.env.NEXT_PUBLIC_LAUNCH_PASSCODE || '2118';
const LAUNCH_DATE_STR = process.env.NEXT_PUBLIC_LAUNCH_DATE || '2026-10-29T09:00:00+05:30';
const LAUNCH_LABEL = process.env.NEXT_PUBLIC_LAUNCH_LABEL || 'Thursday, October 29, 2026 at 9:00 AM';
const SHOW_PASSCODE_HINT = process.env.NEXT_PUBLIC_SHOW_PASSCODE_HINT !== 'false';

export function LaunchGate({ children }: { children: React.ReactNode }) {
  // If the gate is NOT explicitly enabled via env var, default to unlocked
  // to grant immediate public access to all landing, resume, and assessment routes.
  const [stage, setStage] = useState<'loading' | 'ribbon' | 'countdown' | 'unlocked'>(
    IS_GATE_ENABLED_ENV ? 'loading' : 'unlocked'
  );
  const [isRibbonCutting, setIsRibbonCutting] = useState(false);
  const [isRibbonCut, setIsRibbonCut] = useState(false);

  // Passcode entry for Second Launch
  const [passcode, setPasscode] = useState(['', '', '', '']);
  const [passcodeError, setPasscodeError] = useState(false);
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);

  // Countdown timer to 11:50 AM today
  const [timeLeft, setTimeLeft] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00',
    millis: '00',
  });

  // Testing tracking (1 = testing run, 2 = real-time launch)
  const [runCount, setRunCount] = useState<number>(1);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [secretClickCount, setSecretClickCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  // Initialize and check launch state from localStorage and URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initTimer = setTimeout(() => {
      // Check URL parameters for preview controls
      const urlParams = new URLSearchParams(window.location.search);
      const forcePreview = urlParams.get('preview') === 'gate' || urlParams.get('launch_gate') === '1';
      const forceSkip =
        urlParams.get('preview') === 'skip' ||
        urlParams.get('launch_unlock') === CONFIGURED_PASSCODE ||
        urlParams.get('launch_unlock') === '2118';

      // 1. Explicit skip or unlock via query param
      if (forceSkip) {
        localStorage.setItem('talvyn_launch_permanent_unlocked', 'true');
        localStorage.setItem('talvyn_launch_stage', 'unlocked');
        setStage('unlocked');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // 2. Secret admin reset query parameters
      if (urlParams.get('launch_admin') === 'reset' || urlParams.get('launch_reset') === '1') {
        localStorage.removeItem('talvyn_launch_permanent_unlocked');
        localStorage.removeItem('talvyn_launch_stage');
        localStorage.setItem('talvyn_launch_run_count', '1');
        setStage('ribbon');
        setRunCount(1);
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // 3. If gate is disabled globally and not forced via query parameter, grant immediate access
      if (!IS_GATE_ENABLED_ENV && !forcePreview) {
        setStage('unlocked');
        return;
      }

      // 4. Auto-unlock if target launch timestamp has already arrived
      const targetDate = new Date(LAUNCH_DATE_STR);
      const validTargetTime = !isNaN(targetDate.getTime()) ? targetDate.getTime() : new Date('2026-10-29T09:00:00+05:30').getTime();
      if (Date.now() >= validTargetTime) {
        setStage('unlocked');
        localStorage.setItem('talvyn_launch_permanent_unlocked', 'true');
        localStorage.setItem('talvyn_launch_stage', 'unlocked');
        return;
      }

      // 5. Check persistent localStorage state
      const savedUnlocked = localStorage.getItem('talvyn_launch_permanent_unlocked');
      const savedStage = localStorage.getItem('talvyn_launch_stage') as 'ribbon' | 'countdown' | 'unlocked' | null;
      const savedRuns = parseInt(localStorage.getItem('talvyn_launch_run_count') || '1', 10);
      setRunCount(savedRuns);

      if (savedUnlocked === 'true') {
        setStage('unlocked');
      } else if (savedStage === 'countdown') {
        setStage('countdown');
      } else {
        setStage('ribbon');
      }
    }, 0);

    // Keyboard shortcut for internal team: Ctrl + Shift + L
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        setShowAdminModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (stage !== 'countdown') return;

    const targetDate = new Date(LAUNCH_DATE_STR);
    const validTargetTime = !isNaN(targetDate.getTime()) ? targetDate.getTime() : new Date('2026-10-29T09:00:00+05:30').getTime();

    const calculateTimeLeft = () => {
      const now = Date.now();
      let diff = validTargetTime - now;
      if (diff <= 0) {
        diff = 0;
        // Target launch time reached! Automatically unlock public access
        setStage('unlocked');
        localStorage.setItem('talvyn_launch_permanent_unlocked', 'true');
        localStorage.setItem('talvyn_launch_stage', 'unlocked');
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const millis = Math.floor((diff % 1000) / 10);

      setTimeLeft({
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
        millis: millis.toString().padStart(2, '0'),
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 47);
    return () => clearInterval(interval);
  }, [stage]);

  // Ribbon cutting ceremony execution
  const handleCutRibbon = () => {
    if (isRibbonCutting || isRibbonCut) return;
    setIsRibbonCutting(true);
    playSynthesizedSound('snip');

    setTimeout(() => {
      setIsRibbonCut(true);
      playSynthesizedSound('fanfare');
      spawnConfettiBurst();

      setTimeout(() => {
        setStage('countdown');
        localStorage.setItem('talvyn_launch_stage', 'countdown');
        setIsRibbonCutting(false);
      }, 2400);
    }, 600);
  };

  // Confetti Particle Explosion
  const spawnConfettiBurst = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#12336B', '#F59E0B', '#10B981', '#3B82F6', '#D97706', '#0A1B38', '#DCE6F5'];
    const particles: Particle[] = [];
    const count = 150;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 80,
        y: canvas.height / 2 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.8) * 20,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
      });
    }

    let animationId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45;
        p.vx *= 0.985;
        p.rotation += p.vRot;

        if (p.y < canvas.height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
          ctx.restore();
        }
      });

      if (alive) {
        animationId = requestAnimationFrame(render);
      }
    };

    render();
  };

  // Passcode verification for Second Launch
  const handlePasscodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPasscode = [...passcode];
    newPasscode[index] = value.slice(-1);
    setPasscode(newPasscode);
    setPasscodeError(false);
    playSynthesizedSound('tick');

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    const combined = newPasscode.join('');
    if (combined.length === 4) {
      verifyPasscode(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !passcode[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleKeypadPress = (digit: string) => {
    playSynthesizedSound('tick');
    const emptyIndex = passcode.findIndex((d) => d === '');
    if (emptyIndex !== -1) {
      handlePasscodeChange(emptyIndex, digit);
    }
  };

  const handleKeypadClear = () => {
    setPasscode(['', '', '', '']);
    setPasscodeError(false);
    inputRefs[0].current?.focus();
  };

  const verifyPasscode = (codeToTest?: string) => {
    const code = codeToTest || passcode.join('');
    if (code === CONFIGURED_PASSCODE || code === '2118') {
      playSynthesizedSound('unlock');
      setPasscodeSuccess(true);
      setPasscodeError(false);

      setTimeout(() => {
        localStorage.setItem('talvyn_launch_permanent_unlocked', 'true');
        localStorage.setItem('talvyn_launch_stage', 'unlocked');
        const nextRuns = runCount + 1;
        setRunCount(nextRuns);
        localStorage.setItem('talvyn_launch_run_count', nextRuns.toString());
        setStage('unlocked');
      }, 1400);
    } else {
      playSynthesizedSound('error');
      setPasscodeError(true);
      setTimeout(() => {
        setPasscode(['', '', '', '']);
        inputRefs[0].current?.focus();
      }, 700);
    }
  };

  // Admin reset helper
  const handleAdminReset = (targetMode: 'ribbon_for_tomorrow' | 'unlock_now') => {
    if (targetMode === 'ribbon_for_tomorrow') {
      localStorage.removeItem('talvyn_launch_permanent_unlocked');
      localStorage.removeItem('talvyn_launch_stage');
      localStorage.setItem('talvyn_launch_run_count', '2');
      setStage('ribbon');
      setIsRibbonCut(false);
      setIsRibbonCutting(false);
      setPasscode(['', '', '', '']);
      setShowAdminModal(false);
    } else {
      localStorage.setItem('talvyn_launch_permanent_unlocked', 'true');
      localStorage.setItem('talvyn_launch_stage', 'unlocked');
      setStage('unlocked');
      setShowAdminModal(false);
    }
  };

  const handleSecretLogoClick = () => {
    const nextCount = secretClickCount + 1;
    setSecretClickCount(nextCount);
    if (nextCount >= 5) {
      setShowAdminModal(true);
      setSecretClickCount(0);
    }
  };

  // If already unlocked, show the full app
  if (stage === 'unlocked') {
    return (
      <>
        {children}
        {showAdminModal && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#FFFFFF',
              color: '#172B4D',
              padding: '24px',
              borderRadius: '24px',
              border: '1px solid rgba(220, 230, 245, 0.9)',
              boxShadow:
                '0 20px 45px -10px rgba(18, 51, 107, 0.2), inset 0 2px 2px rgba(255, 255, 255, 1)',
              zIndex: 999999,
              maxWidth: '340px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#12336B', letterSpacing: '0.5px' }}>
                STRUCT LAUNCH CONTROL
              </span>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{ background: 'none', border: 'none', color: '#5E6C84', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#5E6C84', marginBottom: '16px', lineHeight: 1.4 }}>
              Current state: <strong>Fully Unlocked</strong>.<br />
              Runs recorded: <strong>{runCount}</strong>.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleAdminReset('ribbon_for_tomorrow')}
                className="btn btn-primary btn-sm"
                style={{
                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                  color: '#FFF',
                  borderRadius: '12px',
                  boxShadow: '0 6px 14px rgba(220, 38, 38, 0.25)',
                }}
              >
                🔒 Re-lock for Launch Ceremony
              </button>
              <button
                onClick={() => setShowAdminModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '12px' }}
              >
                Close Control Panel
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Loading state
  if (stage === 'loading') {
    return (
      <div
        style={{
          background: 'var(--brand-bg, #F5F3EE)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            padding: '24px 36px',
            borderRadius: '24px',
            boxShadow:
              '0 16px 36px -6px rgba(18, 51, 107, 0.1), inset 0 2px 2px rgba(255, 255, 255, 1)',
            color: '#12336B',
            fontWeight: 800,
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#F59E0B',
              animation: 'ping 1s infinite ease-in-out',
            }}
          />
          INITIALIZING STRUCT LAUNCH...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--brand-bg, #F5F3EE)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflowY: 'auto',
        overflowX: 'hidden',
        color: 'var(--brand-text, #172B4D)',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        padding: '32px 16px 48px 16px',
      }}
    >
      {/* Background Architectural Geometry & Ambient Grid */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(18, 51, 107, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Ambient Lighting Orbs */}
      <div
        style={{
          position: 'fixed',
          top: '-10%',
          left: '10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(220, 230, 245, 0.8) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: '-10%',
          right: '10%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(254, 243, 199, 0.6) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Confetti Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 100,
        }}
      />

      {/* ========================================================
          TOP BRAND HEADER (IN-FLOW, ZERO OVERLAPS)
          ======================================================== */}
      <header
        style={{
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          userSelect: 'none',
          cursor: 'pointer',
          textAlign: 'center',
        }}
        onClick={handleSecretLogoClick}
        title="STRUCT Launch Portal"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Geometric 3D Clay Icon */}
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #12336B 0%, #0A1B38 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                '0 12px 24px -4px rgba(18, 51, 107, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.35), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '1.4rem',
              letterSpacing: '-0.5px',
            }}
          >
            S
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
            <span
              style={{
                fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
                fontSize: '1.6rem',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: 'var(--brand-dark, #0A1B38)',
                lineHeight: 1.1,
              }}
            >
              STRUCT
            </span>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--brand-text-muted, #5E6C84)',
              }}
            >
              Deterministic ATS &amp; Assessment Engine
            </span>
          </div>
        </div>

        {/* Dynamic Launch Stage Clay Pill */}
        <div
          style={{
            background: '#FFFFFF',
            padding: '6px 18px',
            borderRadius: '50px',
            border: '1px solid rgba(220, 230, 245, 0.9)',
            boxShadow:
              '0 4px 12px rgba(18, 51, 107, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: stage === 'ribbon' ? '#F59E0B' : '#10B981',
              boxShadow: `0 0 8px ${stage === 'ribbon' ? '#F59E0B' : '#10B981'}`,
            }}
          />
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.2px',
              color: 'var(--brand-primary, #12336B)',
            }}
          >
            {stage === 'ribbon'
              ? 'Phase 1 Inauguration Ceremony (6:00 AM Launch)'
              : 'Second Launch VIP Gate (11:50 AM Launch)'}
          </span>
        </div>
      </header>

      {/* ========================================================
          STAGE 1: RIBBON CUTTING CEREMONY (CLAYMORPHISM)
          ======================================================== */}
      {stage === 'ribbon' && (
        <main
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '840px',
            background: '#FFFFFF',
            borderRadius: '36px',
            padding: 'clamp(28px, 5vw, 52px) clamp(20px, 4vw, 44px)',
            boxShadow:
              '0 24px 50px -12px rgba(18, 51, 107, 0.14), 0 8px 24px -4px rgba(18, 51, 107, 0.06), inset 0 3px 5px rgba(255, 255, 255, 1), inset 0 -3px 6px rgba(18, 51, 107, 0.04), 0 0 0 1px rgba(220, 230, 245, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            margin: 'auto 0',
          }}
        >
          {/* Badge */}
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <span
              style={{
                background: '#EEF4FC',
                border: '1px solid rgba(18, 51, 107, 0.15)',
                color: 'var(--brand-primary, #12336B)',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.8px',
                padding: '6px 16px',
                borderRadius: '50px',
                textTransform: 'uppercase',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.9)',
              }}
            >
              ★ Official Platform Inauguration
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(1.9rem, 4.5vw, 3.2rem)',
              fontWeight: 800,
              letterSpacing: '-1px',
              lineHeight: 1.2,
              color: 'var(--brand-dark, #0A1B38)',
              marginBottom: '16px',
            }}
          >
            The Grand Inauguration of{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #12336B 0%, #0E2652 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              STRUCT
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
              color: 'var(--brand-text-muted, #5E6C84)',
              lineHeight: 1.6,
              maxWidth: '640px',
              margin: '0 auto clamp(28px, 4vw, 42px) auto',
            }}
          >
            Cut the ceremonial ribbon to officially initiate the platform inauguration and activate the countdown to the public launch.
          </p>

          {/* ================= THE CEREMONIAL CLAY RIBBON ================= */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '720px',
              height: 'clamp(74px, 12vw, 92px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'clamp(28px, 4vw, 44px)',
              overflow: 'visible',
            }}
          >
            {/* Left Ribbon Half */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: '50%',
                height: 'clamp(58px, 9vw, 72px)',
                background: 'linear-gradient(180deg, #18428A 0%, #12336B 50%, #0A1B38 100%)',
                borderTop: '3px solid #F59E0B',
                borderBottom: '3px solid #F59E0B',
                borderTopLeftRadius: '16px',
                borderBottomLeftRadius: '16px',
                boxShadow:
                  '0 12px 28px -4px rgba(18, 51, 107, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                transformOrigin: 'left center',
                transition: 'all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform: isRibbonCut
                  ? 'rotate(-24deg) translateY(160px) scaleX(0.7)'
                  : 'rotate(0deg) translateY(0)',
                opacity: isRibbonCut ? 0 : 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  height: '3px',
                  background:
                    'repeating-linear-gradient(90deg, #F59E0B, #F59E0B 8px, #FEF08A 8px, #FEF08A 16px)',
                  marginBottom: '4px',
                }}
              />
              <div
                className="ribbon-text-left"
                style={{
                  textAlign: 'right',
                  paddingRight: 'clamp(32px, 6vw, 60px)',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontSize: 'clamp(0.65rem, 1.4vw, 0.82rem)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                ★ STRUCT 2026 INAUGURAL LAUNCH ★
              </div>
            </div>

            {/* Right Ribbon Half */}
            <div
              style={{
                position: 'absolute',
                right: 0,
                left: '50%',
                height: 'clamp(58px, 9vw, 72px)',
                background: 'linear-gradient(180deg, #18428A 0%, #12336B 50%, #0A1B38 100%)',
                borderTop: '3px solid #F59E0B',
                borderBottom: '3px solid #F59E0B',
                borderTopRightRadius: '16px',
                borderBottomRightRadius: '16px',
                boxShadow:
                  '0 12px 28px -4px rgba(18, 51, 107, 0.45), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                transformOrigin: 'right center',
                transition: 'all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform: isRibbonCut
                  ? 'rotate(24deg) translateY(160px) scaleX(0.7)'
                  : 'rotate(0deg) translateY(0)',
                opacity: isRibbonCut ? 0 : 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  height: '3px',
                  background:
                    'repeating-linear-gradient(90deg, #F59E0B, #F59E0B 8px, #FEF08A 8px, #FEF08A 16px)',
                  marginBottom: '4px',
                }}
              />
              <div
                className="ribbon-text-right"
                style={{
                  textAlign: 'left',
                  paddingLeft: 'clamp(32px, 6vw, 60px)',
                  fontWeight: 900,
                  letterSpacing: '2px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontSize: 'clamp(0.65rem, 1.4vw, 0.82rem)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                ★ PRODUCTION READY • BEST IN CLASS ★
              </div>
            </div>

            {/* Central Golden Tactile Clay Medallion & Shears */}
            {!isRibbonCut && (
              <div
                onClick={handleCutRibbon}
                style={{
                  position: 'relative',
                  zIndex: 40,
                  width: 'clamp(76px, 12vw, 92px)',
                  height: 'clamp(76px, 12vw, 92px)',
                  borderRadius: '50%',
                  background: 'linear-gradient(145deg, #FDE68A 0%, #F59E0B 60%, #D97706 100%)',
                  boxShadow:
                    '0 14px 28px -4px rgba(245, 158, 11, 0.5), inset 0 3px 5px rgba(255, 255, 255, 0.75), inset 0 -4px 6px rgba(180, 83, 9, 0.4), 0 0 0 4px #FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transform: isRibbonCutting ? 'scale(1.15) rotate(45deg)' : 'scale(1)',
                  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  animation: 'clayPulse 2.2s infinite ease-in-out',
                }}
                title="Click to cut the ceremonial ribbon"
              >
                <span style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.3rem)', lineHeight: 1 }}>✂️</span>
                <span
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 900,
                    color: '#78350F',
                    letterSpacing: '1px',
                    marginTop: '2px',
                  }}
                >
                  CUT
                </span>
              </div>
            )}

            {/* Slicing particle glow flash on cut */}
            {isRibbonCutting && !isRibbonCut && (
              <div
                style={{
                  position: 'absolute',
                  width: '6px',
                  height: '140px',
                  background: '#FFFFFF',
                  boxShadow: '0 0 30px #FEF08A, 0 0 60px #F59E0B',
                  zIndex: 50,
                  animation: 'flashCut 0.4s ease-out forwards',
                }}
              />
            )}
          </div>

          {/* Cut Action Button (Pure Claymorphism) */}
          {!isRibbonCut ? (
            <button
              onClick={handleCutRibbon}
              disabled={isRibbonCutting}
              style={{
                background: 'linear-gradient(135deg, #12336B 0%, #0A1B38 100%)',
                color: '#FFFFFF',
                border: 'none',
                padding: '16px 40px',
                borderRadius: '50px',
                fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
                fontWeight: 800,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow:
                  '0 14px 28px -4px rgba(18, 51, 107, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.35), inset 0 -2px 4px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform: isRibbonCutting ? 'scale(0.96)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (!isRibbonCutting) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow =
                    '0 18px 36px -4px rgba(18, 51, 107, 0.4), inset 0 2px 3px rgba(255, 255, 255, 0.45)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isRibbonCutting) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow =
                    '0 14px 28px -4px rgba(18, 51, 107, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.35), inset 0 -2px 4px rgba(0, 0, 0, 0.3)';
                }
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>✂️</span>
              <span>{isRibbonCutting ? 'INAUGURATING STRUCT...' : 'CUT RIBBON TO LAUNCH'}</span>
            </button>
          ) : (
            <div
              style={{
                background: '#DCFCE7',
                border: '1px solid #BBF7D0',
                padding: '16px 36px',
                borderRadius: '50px',
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#15803D',
                letterSpacing: '0.5px',
                boxShadow:
                  '0 8px 20px -2px rgba(21, 128, 61, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.9)',
                animation: 'bounce 0.8s ease',
              }}
            >
              🎉 INAUGURATION COMPLETE! ACTIVATING COUNTDOWN...
            </div>
          )}
        </main>
      )}

      {/* ========================================================
          STAGE 2: COUNTDOWN & PASSCODE (SECOND LAUNCH 11:50 AM)
          ======================================================== */}
      {stage === 'countdown' && (
        <main
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '680px',
            width: '100%',
            padding: 'clamp(28px, 5vw, 44px) clamp(20px, 4vw, 36px)',
            background: '#FFFFFF',
            borderRadius: '36px',
            boxShadow:
              '0 24px 50px -12px rgba(18, 51, 107, 0.14), 0 8px 24px -4px rgba(18, 51, 107, 0.06), inset 0 3px 5px rgba(255, 255, 255, 1), inset 0 -3px 6px rgba(18, 51, 107, 0.04), 0 0 0 1px rgba(220, 230, 245, 0.9)',
            textAlign: 'center',
            margin: 'auto 0',
          }}
        >
          {/* Phase 1 Completion Badge */}
          <div style={{ display: 'inline-flex', marginBottom: '16px' }}>
            <span
              style={{
                background: '#DCFCE7',
                border: '1px solid #BBF7D0',
                color: '#15803D',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.8px',
                padding: '6px 18px',
                borderRadius: '50px',
                textTransform: 'uppercase',
                boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.9)',
              }}
            >
              ✓ First Launch Ribbon Cut &bull; Phase 1 Active
            </span>
          </div>

          <h2
            style={{
              fontFamily: "'Space Grotesk', 'Plus Jakarta Sans', sans-serif",
              fontSize: 'clamp(1.7rem, 4vw, 2.4rem)',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: 'var(--brand-dark, #0A1B38)',
              marginBottom: '8px',
            }}
          >
            Second Launch &amp; Public Access
          </h2>
          <p
            style={{
              fontSize: 'clamp(0.85rem, 1.8vw, 0.95rem)',
              color: 'var(--brand-text-muted, #5E6C84)',
              marginBottom: '28px',
              lineHeight: 1.5,
            }}
          >
            Scheduled for <strong>{LAUNCH_LABEL}</strong>.{' '}
            {SHOW_PASSCODE_HINT ? (
              <>
                Enter Authorization Code{' '}
                <strong style={{ color: 'var(--brand-primary, #12336B)' }}>{CONFIGURED_PASSCODE}</strong> to unlock preview access.
              </>
            ) : (
              'Enter the Master Authorization Code to unlock preview access.'
            )}
          </p>

          {/* ================= LIVE CLAY COUNTDOWN CLOCK ================= */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'clamp(8px, 2vw, 14px)',
              marginBottom: '32px',
            }}
          >
            {[
              { label: 'Hours', val: timeLeft.hours },
              { label: 'Minutes', val: timeLeft.minutes },
              { label: 'Seconds', val: timeLeft.seconds },
              { label: 'Millis', val: timeLeft.millis },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#F8FAFD',
                  borderRadius: '20px',
                  padding: 'clamp(12px, 3vw, 18px) 8px',
                  border: '1px solid rgba(220, 230, 245, 0.9)',
                  boxShadow:
                    '0 8px 18px -4px rgba(18, 51, 107, 0.06), inset 0 2px 4px rgba(255, 255, 255, 1), inset 0 -2px 4px rgba(18, 51, 107, 0.04)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Grotesk', monospace",
                    fontSize: 'clamp(1.6rem, 4vw, 2.5rem)',
                    fontWeight: 800,
                    color: idx === 3 ? '#D97706' : '#0A1B38',
                    lineHeight: 1,
                    marginBottom: '6px',
                  }}
                >
                  {item.val}
                </div>
                <div
                  style={{
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#5E6C84',
                  }}
                >
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {/* ================= PASSCODE INPUT FIELD (CODE 2118) ================= */}
          <div
            style={{
              background: '#F4F7FC',
              borderRadius: '24px',
              padding: 'clamp(20px, 4vw, 28px)',
              border: passcodeError
                ? '1.5px solid #EF4444'
                : passcodeSuccess
                ? '1.5px solid #10B981'
                : '1px solid rgba(220, 230, 245, 0.9)',
              boxShadow:
                'inset 0 2px 6px rgba(18, 51, 107, 0.05), 0 2px 4px rgba(255, 255, 255, 0.8)',
              transition: 'border 0.2s ease',
            }}
          >
            <div
              style={{
                fontSize: '0.76rem',
                fontWeight: 800,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--brand-primary, #12336B)',
                marginBottom: '16px',
              }}
            >
              Enter Authorization Code {SHOW_PASSCODE_HINT ? `(${CONFIGURED_PASSCODE})` : ''}
            </div>

            {/* 4 Digit Boxes */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'clamp(8px, 2vw, 14px)',
                marginBottom: '20px',
              }}
            >
              {[0, 1, 2, 3].map((idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={passcode[idx]}
                  onChange={(e) => handlePasscodeChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  style={{
                    width: 'clamp(48px, 12vw, 60px)',
                    height: 'clamp(56px, 14vw, 68px)',
                    fontSize: 'clamp(1.5rem, 3.5vw, 1.9rem)',
                    fontWeight: 800,
                    textAlign: 'center',
                    background: '#FFFFFF',
                    color: '#0A1B38',
                    border: passcode[idx]
                      ? '2px solid #12336B'
                      : '1.5px solid rgba(18, 51, 107, 0.15)',
                    borderRadius: '16px',
                    outline: 'none',
                    boxShadow: passcode[idx]
                      ? '0 0 0 3px rgba(18, 51, 107, 0.15), 0 6px 14px rgba(18, 51, 107, 0.12), inset 0 2px 3px rgba(255, 255, 255, 0.9)'
                      : '0 4px 10px rgba(18, 51, 107, 0.05), inset 0 2px 3px rgba(255, 255, 255, 0.9)',
                    transition: 'all 0.15s ease',
                  }}
                />
              ))}
            </div>

            {/* Feedback Messages */}
            {passcodeError && (
              <div
                style={{
                  color: '#DC2626',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '14px',
                  animation: 'shake 0.4s ease',
                }}
              >
                ⚠️ Invalid authorization code. Please enter the correct launch code.
              </div>
            )}

            {passcodeSuccess && (
              <div
                style={{
                  color: '#15803D',
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  marginBottom: '14px',
                  letterSpacing: '0.5px',
                }}
              >
                ✓ AUTHORIZATION GRANTED — UNLOCKING STRUCT...
              </div>
            )}

            {/* Compact Clay On-Screen Keypad for touch/mobile convenience */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                maxWidth: '260px',
                margin: '0 auto',
              }}
            >
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '✓'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'C') handleKeypadClear();
                    else if (key === '✓') verifyPasscode();
                    else handleKeypadPress(key);
                  }}
                  style={{
                    padding: '11px',
                    fontSize: '1.1rem',
                    fontWeight: 800,
                    borderRadius: '14px',
                    border: '1px solid rgba(220, 230, 245, 0.8)',
                    background:
                      key === '✓'
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                        : key === 'C'
                        ? '#FEE2E2'
                        : '#FFFFFF',
                    color:
                      key === '✓'
                        ? '#FFFFFF'
                        : key === 'C'
                        ? '#B91C1C'
                        : '#172B4D',
                    boxShadow:
                      key === '✓'
                        ? '0 6px 14px rgba(16, 185, 129, 0.3), inset 0 2px 2px rgba(255, 255, 255, 0.4)'
                        : key === 'C'
                        ? '0 4px 10px rgba(185, 28, 28, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.9)'
                        : '0 4px 10px rgba(18, 51, 107, 0.06), inset 0 2px 2px rgba(255, 255, 255, 0.95), inset 0 -2px 3px rgba(18, 51, 107, 0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.94)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ========================================================
          SECRET INTERNAL ADMIN MODAL (Ctrl + Shift + L)
          ======================================================== */}
      {showAdminModal && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: '#FFFFFF',
            color: '#172B4D',
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid rgba(220, 230, 245, 0.9)',
            boxShadow:
              '0 20px 45px -10px rgba(18, 51, 107, 0.2), inset 0 2px 2px rgba(255, 255, 255, 1)',
            zIndex: 999999,
            maxWidth: '340px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#12336B', letterSpacing: '0.5px' }}>
              STRUCT LAUNCH CONTROL
            </span>
            <button
              onClick={() => setShowAdminModal(false)}
              style={{ background: 'none', border: 'none', color: '#5E6C84', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#5E6C84', marginBottom: '16px', lineHeight: 1.4 }}>
            Current stage: <strong>{stage}</strong>.<br />
            Runs recorded: <strong>{runCount}</strong>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleAdminReset('ribbon_for_tomorrow')}
              className="btn btn-primary btn-sm"
              style={{
                background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                color: '#FFF',
                borderRadius: '12px',
                boxShadow: '0 6px 14px rgba(220, 38, 38, 0.25)',
              }}
            >
              🔒 Reset for Tomorrow&apos;s Launch
            </button>
            <button
              onClick={() => handleAdminReset('unlock_now')}
              className="btn btn-secondary btn-sm"
              style={{ borderRadius: '12px' }}
            >
              ⚡ Force Immediate Full Unlock
            </button>
          </div>
        </div>
      )}

      {/* Scoped CSS animations for ribbon slicing, clayPulse, and responsiveness */}
      <style jsx global>{`
        @keyframes clayPulse {
          0%, 100% {
            box-shadow: 0 14px 28px -4px rgba(245, 158, 11, 0.5), inset 0 3px 5px rgba(255, 255, 255, 0.75), inset 0 -4px 6px rgba(180, 83, 9, 0.4), 0 0 0 4px #FFFFFF;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 18px 36px -4px rgba(245, 158, 11, 0.7), inset 0 3px 5px rgba(255, 255, 255, 0.85), inset 0 -4px 6px rgba(180, 83, 9, 0.4), 0 0 0 6px #FFFFFF;
            transform: scale(1.05);
          }
        }
        @keyframes flashCut {
          0% {
            opacity: 0;
            transform: scaleY(0);
          }
          50% {
            opacity: 1;
            transform: scaleY(1.4);
          }
          100% {
            opacity: 0;
            transform: scaleY(2);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
          60% { transform: translateY(-6px); }
        }
        @media (max-width: 540px) {
          .ribbon-text-left, .ribbon-text-right {
            font-size: 0.58rem !important;
            letter-spacing: 1px !important;
          }
        }
        @media (max-width: 420px) {
          .ribbon-text-left, .ribbon-text-right {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
