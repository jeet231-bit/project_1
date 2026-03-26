import React, { useState, useEffect } from 'react';
import { AppProvider } from './store';
import { Home, RefreshCcw, Wallet, BarChart2, Users, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase, api, wasExplicitSignOut } from './src/lib/api';
import Dashboard from './screens/Dashboard';
import Subscriptions from './screens/Subscriptions';
import ExpenseList from './screens/ExpenseList';
import Insights from './screens/Insights';
import SettingsScreen from './screens/Settings';
import EMIScreen from './screens/EMIScreen';
import CategoryLogs from './screens/CategoryLogs';
import SubscriptionDetail from './screens/SubscriptionDetail';
import SplitScreen from './screens/SplitScreen';
import BudgetScreen from './screens/BudgetScreen';
import LoginScreen from './screens/LoginScreen';
import UpdatePasswordScreen from './screens/UpdatePasswordScreen';
import LandingScreen from './screens/LandingScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import InsightRevealScreen from './screens/InsightRevealScreen';
import Chatbot from './components/Chatbot';

// ── Flow stages ────────────────────────────────────────────────
// landing → login → signup → onboarding → insightReveal → app (main dashboard)
type FlowStage = 'loading' | 'landing' | 'login' | 'signup' | 'onboarding' | 'insightReveal' | 'app' | 'recovery';
type Screen = 'home' | 'subs' | 'expenses' | 'split' | 'insights' | 'settings' | 'emis' | 'categoryLogs' | 'subDetail' | 'budgets';

const App: React.FC = () => {
  const [stage, setStage] = useState<FlowStage>('loading');
  const [activeTab, setActiveTab] = useState<Screen>('home');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // ── Auth + onboarding check ──────────────────────────────────
  useEffect(() => {
    // Use onAuthStateChange as the SINGLE source of truth for auth state.
    // Do NOT call getSession() separately — it races with Supabase's
    // async session restoration from localStorage and can return null
    // before the session is loaded, causing false logouts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('DEBUG: Auth event:', event, !!s);

      if (event === 'INITIAL_SESSION') {
        // Fires once on init, after Supabase restores session from storage.
        // This is the RELIABLE way to check initial auth state.
        setSession(s);
        if (s) {
          checkOnboarding(s);
        } else {
          setStage('landing');
        }
      } else if (event === 'PASSWORD_RECOVERY') {
        setSession(s);
        setStage('recovery');
      } else if (event === 'SIGNED_IN' && s) {
        setSession(s);
        checkOnboarding(s);
      } else if (event === 'SIGNED_OUT') {
        // ONLY navigate to landing if the user explicitly pressed Sign Out.
        // Supabase can fire SIGNED_OUT from internal token refresh failures,
        // background-tab throttling, etc. — those must NOT kick the user out.
        if (wasExplicitSignOut()) {
          setSession(null);
          setStage('landing');
        } else {
          console.warn('DEBUG: Implicit SIGNED_OUT detected — ignoring (user did not request sign-out)');
        }
      } else if (event === 'TOKEN_REFRESHED' && s) {
        // Silently update session — do NOT change stage
        setSession(s);
      }
      // Ignore USER_UPDATED etc. — no stage change needed
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (s?: any, retries = 2) => {
    // Small delay to let Supabase session fully settle after sign-in/sign-up
    await new Promise(r => setTimeout(r, 300));

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await api.get('/onboarding/status');
        console.log('DEBUG: Onboarding status:', res);
        const isLocallyFinished = localStorage.getItem('onboarding_passed') === 'true';
        const activeLocalStep = localStorage.getItem('onboarding_step');

        if (isLocallyFinished) {
          setStage('app');
        } else if (activeLocalStep !== null && activeLocalStep !== '5') {
          // They are mid-onboarding locally
          setStage('onboarding');
        } else if (res.has_income && res.has_expenses) {
          // Returning user logging in on new device
          setStage('app');
        } else {
          setStage('onboarding');
        }
        return; // success — exit
      } catch (err) {
        console.warn(`DEBUG: Onboarding check attempt ${attempt + 1} failed:`, err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 500)); // wait before retry
        }
      }
    }

    // All retries exhausted — if we have a session, the user exists, so go to app
    // Only show onboarding if there's truly no session (shouldn't happen here)
    console.warn('DEBUG: Onboarding check failed after retries, defaulting to app');
    setStage('app');
  };

  // ── Scroll to top on screen change ────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    const el = document.getElementById('app-scroll-container');
    if (el) el.scrollTop = 0;
  }, [activeTab]);

  // ── Navigation helpers ───────────────────────────────────────
  const navigateToSubDetail = (id: string) => {
    setSelectedSubId(id);
    setActiveTab('subDetail');
  };

  const handleNavigate = (tab: string) => {
    setActiveTab(tab as Screen);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <Dashboard onNavigate={handleNavigate} />;
      case 'subs': return <Subscriptions onViewDetail={navigateToSubDetail} onNavigate={handleNavigate} />;
      case 'expenses': return <ExpenseList onNavigate={handleNavigate} />;
      case 'split': return <SplitScreen />;
      case 'insights': return <Insights onNavigate={handleNavigate} />;
      case 'settings': return <SettingsScreen />;
      case 'emis': return <EMIScreen onBack={() => setActiveTab('home')} />;
      case 'budgets': return <BudgetScreen onBack={() => setActiveTab('home')} />;
      case 'categoryLogs': return <CategoryLogs onBack={() => setActiveTab('home')} />;
      case 'subDetail': return <SubscriptionDetail subId={selectedSubId!} onBack={() => setActiveTab('subs')} />;
      default: return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'subs', icon: RefreshCcw, label: 'SubX' },
    { id: 'expenses', icon: Wallet, label: 'Spend' },
    { id: 'split', icon: Users, label: 'Split' },
    { id: 'insights', icon: BarChart2, label: 'Stats' },
  ];

  // ── Stage rendering ──────────────────────────────────────────

  // Loading
  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E1116]">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  // Landing page (no session)
  if (stage === 'landing') {
    return (
      <LandingScreen
        onGetStarted={() => setStage('signup')}
        onLogin={() => setStage('login')}
      />
    );
  }

  // Login
  if (stage === 'login') {
    return (
      <LoginScreen
        defaultMode="login"
        onBack={() => setStage('landing')}
      />
    );
  }

  // Signup
  if (stage === 'signup') {
    return (
      <LoginScreen
        defaultMode="signup"
        onBack={() => setStage('landing')}
      />
    );
  }

  // Password recovery
  if (stage === 'recovery') {
    return <UpdatePasswordScreen />;
  }

  // Onboarding (Income → Subs → Expenses)
  if (stage === 'onboarding') {
    return (
      <OnboardingScreen
        onComplete={() => {
          localStorage.setItem('onboarding_passed', 'true');
          setStage('insightReveal');
        }}
      />
    );
  }

  // Insight Reveal (Capital Engine Activation + WOW moment)
  if (stage === 'insightReveal') {
    return (
      <InsightRevealScreen
        onEnterDashboard={() => setStage('app')}
      />
    );
  }

  // ── Main App (authenticated + onboarded) ─────────────────────
  return (
    <>
      <AppProvider>
        <div className="flex flex-col min-h-screen max-w-md mx-auto relative bg-slate-50 dark:bg-premium-dark shadow-2xl shadow-slate-200 dark:shadow-none transition-colors">
          <main id="app-scroll-container" className="flex-1 pb-32 overflow-x-hidden overflow-y-auto hide-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {renderScreen()}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Floating Bottom Navigation */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-sm z-50">
            <nav className="bg-[#0f172a] dark:bg-premium-card rounded-[32px] border border-white/5 flex justify-around items-center py-4 px-4 shadow-2xl backdrop-blur-md">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex flex-col items-center justify-center transition-colors relative p-2 ${activeTab === item.id ? 'text-white' : 'text-slate-500'
                    }`}
                >
                  <div className={`${activeTab === item.id ? 'bg-white/10 p-2.5 rounded-2xl scale-110 shadow-inner' : ''} transition-all duration-200`}>
                    <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                  </div>
                  {activeTab === item.id && (
                    <motion.div layoutId="navDot" className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>
              ))}
              <button
                onClick={() => setActiveTab('settings')}
                className={`p-2 transition-colors ${activeTab === 'settings' ? 'text-white' : 'text-slate-500'}`}
              >
                <SettingsIcon size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
              </button>
            </nav>
          </div>
        </div>
        <Chatbot />
      </AppProvider>
    </>
  );
};

export default App;
