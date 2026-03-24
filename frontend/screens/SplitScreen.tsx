
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { 
  Plus, Users, ArrowUpRight, ArrowDownLeft, 
  ChevronRight, Search, Zap, HandCoins, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SplitScreen: React.FC = () => {
  const { friends, sharedExpenses, settleWithFriend, isSecureMode } = useApp();
  const [activeTab, setActiveTab] = useState<'balances' | 'activity'>('balances');
  React.useEffect(() => {
    // leftOffset is no longer needed since FABs are moved to headers
  }, []);

  const netBalance = useMemo(() => friends.reduce((acc, f) => acc + f.balance, 0), [friends]);
  
  const mask = (val: number) => isSecureMode ? "••••" : `₹${Math.abs(val).toLocaleString()}`;

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">Shared Capital</h1>
        <div className="flex gap-2">
          <button onClick={() => alert("Feature coming soon: Add Shared Expense")} className="w-10 h-10 bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition-all">
            <Plus size={18} />
          </button>
          <button onClick={() => alert("Feature coming soon: Invite Friend to Group")} className="w-10 h-10 bg-[#0f172a] dark:bg-premium-card border border-white/5 rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all">
            <UserPlus size={18} />
          </button>
        </div>
      </header>

      {/* Net Balance Card */}
      <div className={`p-8 rounded-[44px] shadow-2xl relative overflow-hidden transition-all ${netBalance >= 0 ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-rose-600 dark:bg-rose-700'} text-white`}>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Users size={120} />
        </div>
        <div className="relative z-10 space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60">
            {netBalance >= 0 ? 'You are owed' : 'You owe overall'}
          </p>
          <h2 className="text-5xl font-black tracking-tighter">{mask(netBalance)}</h2>
          <div className="pt-6 flex gap-4">
             <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Settle All</button>
             <button className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Add Group</button>
          </div>
        </div>
      </div>

      {/* View Toggles */}
      <div className="bg-white dark:bg-premium-card p-1 rounded-full flex border border-slate-100 dark:border-white/5">
        <button 
          onClick={() => setActiveTab('balances')}
          className={`flex-1 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'balances' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
        >
          Balances
        </button>
        <button 
          onClick={() => setActiveTab('activity')}
          className={`flex-1 py-3.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-[#0f172a] dark:bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}
        >
          Activity
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'balances' ? (
          <motion.div 
            key="balances"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {friends.map((friend) => (
              <div key={friend.id} className="bg-white dark:bg-premium-card p-6 rounded-[36px] border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between group hover:border-indigo-100 dark:hover:border-indigo-900 active:border-indigo-100 dark:active:border-indigo-900 transition-all active:scale-[0.98] cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-premium-dark rounded-[22px] flex items-center justify-center text-slate-400 dark:text-premium-muted font-black text-xl border border-slate-100 dark:border-white/5">
                    {friend.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-premium-text tracking-tight text-lg">{friend.name}</h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${friend.balance === 0 ? 'text-slate-300' : friend.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {friend.balance === 0 ? 'Settled Up' : friend.balance > 0 ? 'Owes you' : 'You owe'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${friend.balance === 0 ? 'text-slate-200 dark:text-premium-muted/20' : friend.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {mask(friend.balance)}
                  </p>
                  {friend.balance !== 0 && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); settleWithFriend(friend.id); }}
                      className="text-[9px] font-black uppercase text-indigo-500 mt-1"
                    >
                      Settle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="activity"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {sharedExpenses.map((exp, i) => (
              <motion.div 
                key={exp.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                whileTap={{ scale: 0.97, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
                transition={{ delay: i * 0.05 }} 
                className="bg-white dark:bg-premium-card p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex justify-between items-center group transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex gap-4 items-center">
                  <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-premium-dark flex items-center justify-center text-slate-400 dark:text-premium-muted/50 text-xl border border-slate-100 dark:border-white/5 shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 group-active:bg-indigo-50 dark:group-active:bg-indigo-500/10 group-active:text-indigo-600 transition-colors">
                    <HandCoins size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-premium-text leading-tight tracking-tight text-lg">{exp.description}</h4>
                    <p className="text-[10px] text-slate-400 dark:text-premium-muted/50 font-black uppercase tracking-widest mt-1">
                      {exp.paidBy === 'me' ? 'You paid' : 'A friend paid'} ₹{exp.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="font-black text-slate-900 dark:text-premium-text text-lg">₹{(exp.amount / (exp.involvedFriends.length + 1)).toFixed(0)}</p>
                   <p className="text-[10px] text-slate-400 dark:text-premium-muted font-bold uppercase tracking-widest mt-1">Your share</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Action Info */}
      <div className="bg-indigo-50 dark:bg-indigo-500/5 p-6 rounded-[36px] flex items-start gap-4 border border-indigo-100 dark:border-indigo-500/10 shadow-sm">
        <Zap className="text-indigo-600 shrink-0 mt-1" size={18} />
        <p className="text-[11px] font-medium text-indigo-900/60 dark:text-indigo-100/60 leading-relaxed">
          Capital sharing intelligence is enabled. We automatically calculate cross-friend settlements to minimize transaction steps.
        </p>
      </div>

    </div>
  );
};

export default SplitScreen;
