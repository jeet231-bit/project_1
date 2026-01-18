
import React, { useState } from 'react';
import { AppProvider } from './store';
import { Home, RefreshCcw, Wallet, BarChart2, Users, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './screens/Dashboard';
import Subscriptions from './screens/Subscriptions';
import ExpenseList from './screens/ExpenseList';
import Insights from './screens/Insights';
import SettingsScreen from './screens/Settings';
import EMIScreen from './screens/EMIScreen';
import CategoryLogs from './screens/CategoryLogs';
import SubscriptionDetail from './screens/SubscriptionDetail';
import SplitScreen from './screens/SplitScreen';

type Screen = 'home' | 'subs' | 'expenses' | 'split' | 'insights' | 'settings' | 'emis' | 'categoryLogs' | 'subDetail';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Screen>('home');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const navigateToSubDetail = (id: string) => {
    setSelectedSubId(id);
    setActiveTab('subDetail');
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'home': return <Dashboard onNavigate={(tab: any) => setActiveTab(tab)} />;
      case 'subs': return <Subscriptions onViewDetail={navigateToSubDetail} />;
      case 'expenses': return <ExpenseList />;
      case 'split': return <SplitScreen />;
      case 'insights': return <Insights />;
      case 'settings': return <SettingsScreen />;
      case 'emis': return <EMIScreen onBack={() => setActiveTab('home')} />;
      case 'categoryLogs': return <CategoryLogs onBack={() => setActiveTab('home')} />;
      case 'subDetail': return <SubscriptionDetail subId={selectedSubId!} onBack={() => setActiveTab('subs')} />;
      default: return <Dashboard onNavigate={(tab: any) => setActiveTab(tab)} />;
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'subs', icon: RefreshCcw, label: 'SubX' },
    { id: 'expenses', icon: Wallet, label: 'Spend' },
    { id: 'split', icon: Users, label: 'Split' },
    { id: 'insights', icon: BarChart2, label: 'Stats' },
  ];

  return (
    <>
      <AppProvider>
        <div className="flex flex-col min-h-screen max-w-md mx-auto relative bg-slate-50 dark:bg-premium-dark shadow-2xl shadow-slate-200 dark:shadow-none transition-colors">
          <main className="flex-1 pb-32 overflow-x-hidden overflow-y-auto hide-scrollbar">
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
                  className={`flex flex-col items-center justify-center transition-all duration-300 relative p-2 ${
                    activeTab === item.id ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  <div className={`${activeTab === item.id ? 'bg-white/10 p-2.5 rounded-2xl scale-110 shadow-inner' : ''} transition-all`}>
                    <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                  </div>
                  {activeTab === item.id && (
                    <motion.div layoutId="navDot" className="absolute -bottom-1 w-1 h-1 bg-white rounded-full" />
                  )}
                </button>
              ))}
              {/* Quick access to settings via small icon if needed, or put in Home */}
              <button 
                onClick={() => setActiveTab('settings')}
                className={`p-2 transition-all ${activeTab === 'settings' ? 'text-white' : 'text-slate-500'}`}
              >
                <SettingsIcon size={20} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
              </button>
            </nav>
          </div>
        </div>
      </AppProvider>
    </>
  );
};

export default App;
