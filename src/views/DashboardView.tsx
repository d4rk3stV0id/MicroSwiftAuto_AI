import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BookOpen, ShieldCheck, Activity, ClipboardList, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AnimatedCard, GlassCard, StatusBadge } from '../components/UI';
import { AnimatedCounter } from '../components/SpecialUI';
import { STAGGER_CONTAINER, STAGGER_ITEM } from '../constants';
import { cn } from '../lib/utils';

/**
 * Generate hospital-like plus symbols on a grid to avoid overlapping.
 * Uses a 7×5 grid with jitter so symbols are well-distributed.
 */
const GRID_COLS = 7;
const GRID_ROWS = 5;
const PLUS_SYMBOLS = Array.from({ length: GRID_COLS * GRID_ROWS }, (_, i) => {
  const col = i % GRID_COLS;
  const row = Math.floor(i / GRID_COLS);
  const cellW = 94 / GRID_COLS;
  const cellH = 80 / GRID_ROWS;
  return {
    id: i,
    baseTop: 5 + row * cellH + Math.random() * cellH * 0.7,
    baseLeft: 3 + col * cellW + Math.random() * cellW * 0.7,
    size: 14 + Math.random() * 30,
    baseOpacity: 0.10 + Math.random() * 0.18,
    rotation: Math.random() * 45 - 22.5,
    driftFactor: 0.4 + Math.random() * 0.8,
  };
});

export const DashboardView = () => {
  const { user, claims, activePolicy, notifications, setCurrentTab, markNotificationRead, markAllNotificationsRead } = useStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Mouse position state for interactive plus symbols
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  // Smoothed (delayed) mouse position for drift effect
  const [smoothMouse, setSmoothMouse] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close notification popup when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  // Track mouse position globally so plus symbols react even outside the hero
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Smooth lerp towards actual mouse position (creates delay effect)
  useEffect(() => {
    let raf: number;
    const tick = () => {
      setSmoothMouse((prev) => {
        const target = mousePos || { x: 0.5, y: 0.5 };
        return {
          x: prev.x + (target.x - prev.x) * 0.06,
          y: prev.y + (target.y - prev.y) * 0.06,
        };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mousePos]);

  /** Compute per-symbol style based on smoothed mouse */
  const getPlusStyle = (ps: (typeof PLUS_SYMBOLS)[0]) => {
    const driftX = (smoothMouse.x - 0.5) * 60 * ps.driftFactor;
    const driftY = (smoothMouse.y - 0.5) * 40 * ps.driftFactor;

    // Scale up symbols close to the mouse
    let scaleFactor = 1;
    let opacityBoost = 0;
    if (mousePos) {
      const dx = mousePos.x * 100 - ps.baseLeft;
      const dy = mousePos.y * 100 - ps.baseTop;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Within ~30% radius, scale up
      if (dist < 30) {
        const proximity = 1 - dist / 30;
        scaleFactor = 1 + proximity * 0.8;
        opacityBoost = proximity * 0.15;
      }
    }

    return {
      top: `${ps.baseTop}%`,
      left: `${ps.baseLeft}%`,
      width: ps.size * scaleFactor,
      height: ps.size * scaleFactor,
      opacity: Math.min(ps.baseOpacity + opacityBoost, 0.45),
      transform: `translate(${driftX}px, ${driftY}px) rotate(${ps.rotation}deg)`,
      transition: 'width 0.4s ease, height 0.4s ease, opacity 0.4s ease',
    };
  };

  const actions = [
    {
      id: 'policy',
      label: 'My Policy & Ask AI',
      icon: BookOpen,
      desc: 'View coverage, chat with ClaimSaathi',
      color: 'bg-primary/10 text-primary',
      tab: 'policy',
      pricingBadge: 'Free feature',
      pricingBadgeVariant: 'free' as const,
    },
    {
      id: 'file',
      label: 'File a Claim',
      icon: ShieldCheck,
      desc: 'Start a new insurance claim',
      color: 'bg-accent/10 text-accent',
      tab: 'claims',
      pricingBadge: 'Paid · ₹100',
      pricingBadgeVariant: 'paid' as const,
    },
    {
      id: 'track',
      label: 'My Claims',
      icon: ClipboardList,
      desc: 'View & track all your claims',
      color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/20 dark:text-indigo-200',
      tab: 'profile',
      subAction: 'policies',
    },
  ];

  const handleActionClick = (action: typeof actions[0]) => {
    if (action.id === 'track') {
      // Navigate to profile and open the claims sub-page (reuse "My Policies" pattern)
      setCurrentTab('profile');
      return;
    }
    setCurrentTab(action.tab as 'home' | 'policy' | 'claims' | 'profile');
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-background">
      {/* Hero — full width, web-aligned */}
      <div
        ref={heroRef}
        className="relative overflow-hidden bg-gradient-to-br from-navy to-navy-light px-6 py-10 lg:px-12 lg:py-14"
      >
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-primary opacity-20 blur-[80px]" />

        {/* Hospital-like plus symbols — interactive, parallax, proximity scale */}
        {PLUS_SYMBOLS.map((ps) => (
          <Plus
            key={ps.id}
            className="absolute pointer-events-none text-white"
            style={getPlusStyle(ps)}
            strokeWidth={2.5}
          />
        ))}

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-xl space-y-2">
            <div className="mb-8 flex items-center gap-3">
              <img src="/logo.png" alt="ClaimSaathi" className="h-24 w-auto object-contain drop-shadow-md brightness-0 invert" />
            </div>
            <h2 className="text-3xl font-display font-bold tracking-tight text-white lg:text-4xl">
              Namaste, {user?.name?.split(' ')[0] || 'User'} 👋
            </h2>
            <p className="text-base text-white/70">Welcome to your insurance dashboard.</p>
          </div>

          <div className="w-full max-w-lg shrink-0 lg:max-w-md">
            <GlassCard className="border-white/20 shadow-elevated lg:p-8">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {activePolicy ? (
                    <>
                      <span className="inline-block rounded-full bg-success px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Active policy
                      </span>
                      <h3 className="mt-3 font-display text-xl font-bold text-white">{activePolicy.name}</h3>
                      <p className="mt-1 text-xs text-white/60">Insurer: {activePolicy.insurer}</p>
                    </>
                  ) : (
                    <>
                      <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Action needed
                      </span>
                      <h3 className="mt-3 font-display text-xl font-bold text-white">No policy linked</h3>
                      <p className="mt-1 text-xs text-white/60">Add a policy to unlock features</p>
                    </>
                  )}
                </div>
                <div className="hidden items-center gap-3 sm:flex">
                  {/* Notification bell — popup on click, badge only when unread */}
                  <div className="relative" ref={notifRef}>
                    <button
                      type="button"
                      className="relative text-white/70 transition-colors hover:text-white"
                      aria-label="Notifications"
                      onClick={() => setShowNotifications((v) => !v)}
                    >
                      <Bell size={22} />
                      {unreadCount > 0 && (
                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-navy bg-accent" />
                      )}
                    </button>

                    {/* Notification popup */}
                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.18 }}
                          className="absolute right-0 top-9 z-50 w-80 rounded-xl border border-white/15 bg-white shadow-elevated dark:bg-navy-light dark:border-white/10"
                        >
                          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/10">
                            <h4 className="text-sm font-bold text-text-main dark:text-white">Notifications</h4>
                            {unreadCount > 0 && (
                              <button
                                type="button"
                                onClick={() => markAllNotificationsRead()}
                                className="text-[11px] font-semibold text-primary hover:underline"
                              >
                                Mark all read
                              </button>
                            )}
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <Bell size={28} className="mb-2 text-gray-300 dark:text-slate-500" />
                                <p className="text-xs font-medium text-text-muted">No notifications yet</p>
                              </div>
                            ) : (
                              notifications.map((n) => (
                                <button
                                  key={n.id}
                                  type="button"
                                  onClick={() => markNotificationRead(n.id)}
                                  className={cn(
                                    'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5',
                                    !n.read && 'bg-primary/5 dark:bg-primary/10',
                                  )}
                                >
                                  <p className="text-sm font-semibold text-text-main dark:text-white">{n.title}</p>
                                  <p className="mt-0.5 text-xs text-text-muted">{n.message}</p>
                                  <p className="mt-1 text-[10px] text-text-muted">{n.time}</p>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* User avatar — click goes to profile */}
                  <button
                    type="button"
                    onClick={() => setCurrentTab('profile')}
                    className="h-11 w-11 overflow-hidden rounded-full border-2 border-primary shadow-lg cursor-pointer"
                    aria-label="Go to profile"
                  >
                    <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`}
                      alt=""
                      className="h-full w-full bg-white"
                    />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Total coverage</p>
                <div className="mt-1 font-display text-3xl font-bold text-primary-light lg:text-4xl">
                  {activePolicy ? (
                    <AnimatedCounter from={0} to={activePolicy.coverageAmount || 0} prefix="₹" />
                  ) : (
                    '₹0'
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Main — web grid: primary column + sidebar */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-12 lg:py-14">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_min(400px,34%)] lg:gap-16">
          <div className="space-y-6">
            <h2 className="font-display text-xl font-bold text-text-main">What would you like to do?</h2>
            <motion.div
              variants={STAGGER_CONTAINER}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <AnimatedCard
                    key={action.id}
                    className="flex flex-col gap-4 rounded-lg p-6 shadow-card"
                    onClick={() => handleActionClick(action)}
                  >
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl text-xl', action.color)}>
                      <Icon size={24} />
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-display text-[15px] font-bold text-text-main">{action.label}</h4>
                      <p className="text-sm leading-relaxed text-text-muted">{action.desc}</p>
                      {'pricingBadge' in action && action.pricingBadge && (
                        <div className="pt-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1',
                              action.pricingBadgeVariant === 'free'
                                ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-400/15 dark:text-emerald-300'
                                : 'bg-amber-500/10 text-amber-900 ring-amber-500/20 dark:bg-amber-400/15 dark:text-amber-100',
                            )}
                          >
                            {action.pricingBadge}
                          </span>
                        </div>
                      )}
                    </div>
                  </AnimatedCard>
                );
              })}
            </motion.div>
          </div>

          <aside className="space-y-4 lg:pt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-text-main">Recent activity</h3>
              <button type="button" className="text-sm font-bold text-primary hover:underline">
                View all
              </button>
            </div>
            <div className="rounded-xl bg-surface p-6 shadow-card lg:p-8">
              {claims.length > 0 ? (
                <motion.div variants={STAGGER_CONTAINER} initial="initial" animate="animate" className="space-y-6">
                  {claims.map((claim, idx) => (
                    <motion.div
                      key={claim.id}
                      variants={STAGGER_ITEM}
                      className={cn(
                        'relative flex items-center gap-5',
                        idx < claims.length - 1 && 'border-b border-gray-100 pb-6 dark:border-white/5',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl',
                          claim.status === 'Approved' ? 'bg-green-100 text-success' : 'bg-amber-100 text-warning',
                        )}
                      >
                        {claim.status === 'Approved' ? '✓' : '⏳'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-text-main">{claim.title}</h4>
                        <p className="mt-0.5 text-[11px] text-text-muted">Hospital • {claim.date}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="mb-1 text-sm font-bold text-text-main">₹{claim.amount.toLocaleString()}</p>
                        <StatusBadge status={claim.status} />
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center text-text-muted">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10">
                    <BookOpen size={32} className="text-gray-400 dark:text-slate-300" />
                  </div>
                  <p className="text-sm font-medium">No recent activity</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
