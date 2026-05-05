import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { AuthView } from './views/AuthView';
import {
  clearSupabaseLocalSession,
  isSupabaseEnabled,
  supabase,
  supabaseConfigurationMessage,
} from './lib/supabase';
import { Layout } from './components/Layout';
import { DashboardView } from './views/DashboardView';
import { PolicyReaderView } from './views/PolicyReaderView';
import { ClaimWizardView } from './views/ClaimWizardView';
import { ClaimTrackerView } from './views/ClaimTrackerView';
import { ProfileView } from './views/ProfileView';

export default function App() {
  const { currentTab, theme, session, isAuthenticated, setSession, hydrateUserData } = useStore();
  /** Avoid showing login UI until the first getSession() finishes (prevents a one-frame “logged out” flash). */
  const [supabaseAuthReady, setSupabaseAuthReady] = useState(!isSupabaseEnabled);

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    let mounted = true;
    // Check active sessions and set the user.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) setSession(session);
      } catch (error) {
        // Recover from stale local auth state/locks in dev.
        clearSupabaseLocalSession();
        await supabase.auth.signOut({ scope: 'local' });
        if (mounted) setSession(null);
        console.warn('Supabase session recovery applied.', error);
      } finally {
        if (mounted) setSupabaseAuthReady(true);
      }
    })();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setSession]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    void hydrateUserData(userId);
  }, [session?.user?.id, hydrateUserData]);

  if (isSupabaseEnabled && !supabaseAuthReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-muted">
        <p className="text-sm font-medium">Signing you in…</p>
      </div>
    );
  }

  if (supabaseConfigurationMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center text-slate-200">
        <h1 className="max-w-md text-lg font-semibold text-white">Sign-in is misconfigured</h1>
        <p className="max-w-lg text-sm text-slate-400">{supabaseConfigurationMessage}</p>
        <p className="max-w-lg text-xs text-slate-500">
          Copy <code className="text-slate-300">.env.example</code> to <code className="text-slate-300">.env</code>
          , set real Supabase values, then restart <code className="text-slate-300">npm run dev</code>.
        </p>
      </div>
    );
  }

  if (isSupabaseEnabled && !isAuthenticated) {
    return (
      <>
        <AuthView />
        <Toaster position="top-center" />
      </>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return <DashboardView />;
      case 'policy':
        return <PolicyReaderView />;
      case 'claims':
        return <ClaimWizardView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <Layout>
      {renderContent()}
      <Toaster position="top-right" />
    </Layout>
  );
}
