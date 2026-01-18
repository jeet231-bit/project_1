
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  Plus, User, ChevronUp, ArrowRight, Play, Zap, Calendar, Smartphone, ArrowLeft, Music, Ghost, ShieldCheck
} from 'lucide-react';
import { SubscriptionStatus, BillingCycle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface SubsProps {
  onViewDetail: (id: string) => void;
}

const SubSubscriptions: React.FC<SubsProps> = ({ onViewDetail }) => {
  const { subscriptions, renewSubscription, theme } = useApp();
  const [view, setView] = useState<'active' | 'cancelled'>('active');

  const filteredSubs = useMemo(() => subscriptions.filter(s => 
    view === 'active' ? s.status === SubscriptionStatus.ACTIVE : s.status === SubscriptionStatus.CANCELLED
  ), [subscriptions, view]);

  const totalRetained = useMemo(() => {
    return subscriptions
      .filter(s => s.status === SubscriptionStatus.CANCELLED)
      .reduce((acc, sub) => acc + (sub.billingCycle === BillingCycle.MONTHLY ? sub.amount * 12 : sub.amount), 0);
  }, [subscriptions]);

  const getSubIcon = (name: string, isHovered: boolean) => {
    const n = name.toLowerCase();
    const style = isHovered ? { color: 'white' } : { color: 'currentColor' };
    if (n.includes('netflix')) return <Play size={22} fill={isHovered ? "white" : "currentColor"} style={style} />;
    if (n.includes('adobe')) return <Zap size={22} fill={isHovered ? "white" : "currentColor"} style={style} />;
    if (n.includes('spotify')) return <Music size={22} fill={isHovered ? "white" : "currentColor"} style={style} />;
    if (n.includes('chatgpt')) return <Zap size={22} fill={isHovered ? "white" : "currentColor"} style={style} />;
    return <Zap size={22} fill={isHovered ? "white" : "currentColor"} style={style} />;
  };

  if (view === 'cancelled') {
    return (
      <div className="p-6 pt-10 space-y-8 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">Past Leaks</h1>
          <div className="flex gap-2">
            <button onClick={() => setView('active')} className="w-10 h-10 rounded-xl bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400"><ArrowLeft size={18} /></button>
          </div>
        </header>

        <div className="bg-emerald-600 dark:bg-emerald-700 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60 mb-2">Annually Retained</p>
          <h2 className="text-4xl font-black tracking-tighter">₹{totalRetained.toLocaleString()}</h2>
          <p className="text-[10px] opacity-70 mt-3 font-medium uppercase tracking-widest">Saved from cancelled services</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-widest px-2">Inactive Commitments</h3>
          
          {filteredSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white dark:bg-premium-card rounded-[40px] border border-slate-100 dark:border-white/5">
              <Ghost className="text-slate-200 dark:text-premium-muted/20" size={48} />
              <p className="text-xs font-bold text-slate-400 dark:text-premium-muted uppercase tracking-widest">No past leaks detected</p>
            </div>
          ) : (
            filteredSubs.map((sub) => (
              <motion.div 
                key={sub.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-premium-card p-6 rounded-[32px] border border-slate-100 dark:border-white/5 flex justify-between items-center group shadow-sm"
              >
                <div className="flex gap-5 items-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-premium-dark rounded-2xl flex items-center justify-center text-slate-300 dark:text-premium-muted/30">{getSubIcon(sub.name, false)}</div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-premium-text tracking-tight">{sub.name}</h4>
                    <p className="text-[10px] font-black text-slate-300 dark:text-premium-muted/30 uppercase tracking-widest">Terminated</p>
                  </div>
                </div>
                <button onClick={() => renewSubscription(sub.id)} className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] active:scale-95 transition-all">Reactivate</button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">SubX Portfolio</h1>
        <div className="flex gap-2">
          <div className="w-9 h-9 bg-white dark:bg-premium-card rounded-full border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400"><ChevronUp size={18} /></div>
          <div className="w-9 h-9 bg-[#0f172a] dark:bg-premium-card rounded-full flex items-center justify-center text-white"><User size={18} /></div>
        </div>
      </header>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em]">Live Portfolios</h3>
        <button 
          onClick={() => setView('cancelled')} 
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-1.5 border-b border-indigo-600/10 dark:border-indigo-400/10 pb-1 active:opacity-50 transition-all"
        >
          View Past Leaks <ArrowRight size={12} />
        </button>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredSubs.map((sub, idx) => {
            const [hover, setHover] = useState(false);
            return (
              <motion.div 
                key={sub.id} 
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
                onClick={() => onViewDetail(sub.id)}
                className="bg-white dark:bg-premium-card p-6 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer active:scale-95 group relative"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-premium-dark flex items-center justify-center text-slate-900 dark:text-premium-text text-xl border border-slate-100 dark:border-white/5 shrink-0 group-hover:bg-slate-900 dark:group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                      {getSubIcon(sub.name, hover)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-premium-text text-lg leading-tight tracking-tight">{sub.name}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub.subcategory || sub.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-900 dark:text-premium-text text-lg">₹{sub.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub.billingCycle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="px-4 py-2 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-premium-dark text-slate-500 dark:text-premium-muted/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:scale-[1.05] transition-all duration-200">
                    <Calendar size={12} className="text-slate-400" />
                    Renewed
                  </div>
                  <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-premium-dark text-slate-400 dark:text-premium-muted/50 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 hover:scale-[1.05] transition-all duration-200">
                    <ShieldCheck size={12} className={sub.autoPay ? "text-indigo-500" : "text-slate-300"} />
                    {sub.autoPay ? 'Auto' : 'Manual'}
                  </div>
                </div>

                {sub.usageScore !== undefined && sub.usageScore < 20 && (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-500 p-3 rounded-2xl flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Attention Leak: Low Usage Detected</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="fixed bottom-32 right-8 w-16 h-16 bg-[#0f172a] dark:bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 transition-colors">
        <Plus size={32} />
      </motion.button>
    </div>
  );
};

export default SubSubscriptions;
