
import React, { useState } from 'react';
import { useApp } from '../store';
import { ChevronLeft, User, ArrowLeft, Zap, Music, Play, CircleAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  subId: string;
  onBack: () => void;
}

const SubscriptionDetail: React.FC<Props> = ({ subId, onBack }) => {
  const { subscriptions, cancelSubscription } = useApp();
  const sub = subscriptions.find(s => s.id === subId);
  
  const [remindersDay, setRemindersDay] = useState(3);
  const [autoPay, setAutoPay] = useState(sub?.autoPay || false);

  if (!sub) return null;

  const getSubIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('netflix')) return <Play size={44} fill="white" />;
    if (n.includes('spotify')) return <Music size={44} fill="white" />;
    return <Zap size={44} fill="white" />;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="p-6 pt-10 flex justify-between items-center bg-white dark:bg-zinc-900 border-b border-slate-50 dark:border-zinc-800">
        <h1 className="text-xl font-black text-slate-900 dark:text-zinc-50">Service Insight</h1>
        <div className="flex gap-2">
          <div className="w-9 h-9 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-400 rotate-90"><ChevronLeft size={18} /></div>
          <div className="w-9 h-9 bg-[#0f172a] dark:bg-zinc-100 rounded-full flex items-center justify-center text-white dark:text-zinc-900"><User size={18} /></div>
        </div>
      </div>

      <div className="p-8 space-y-10">
        <button onClick={onBack} className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.2em] flex items-center gap-1">
          <ArrowLeft size={12} /> BACK TO PORTFOLIO
        </button>

        <div className="flex flex-col items-center space-y-8">
          <div className="w-28 h-28 bg-[#0f172a] dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
             {getSubIcon(sub.name)}
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-[#0f172a] dark:text-zinc-50 tracking-tight">{sub.name}</h2>
            <div className="flex items-center justify-center gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub.category}</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Active Commitment</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-900 p-10 rounded-[48px] space-y-8">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Price</span>
            <span className="text-2xl font-black text-[#0f172a] dark:text-zinc-50">₹{sub.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cycle</span>
            <span className="text-sm font-black text-[#0f172a] dark:text-zinc-50 uppercase">{sub.billingCycle}</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Method</span>
            <span className="text-sm font-black text-[#0f172a] dark:text-zinc-50">{sub.paymentSource?.split('•')[0] || 'UPI Wallet'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Status</span>
            <button onClick={() => setAutoPay(!autoPay)} className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.1em] transition-all shadow-sm ${autoPay ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {autoPay ? 'Auto-pay Enabled' : 'Auto-pay Disabled'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-8 rounded-[44px] space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black text-[#0f172a] dark:text-zinc-50 uppercase tracking-[0.2em]">Smart Reminders</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">Alert me before renewal</p>
            </div>
            <div className="flex bg-slate-50 dark:bg-zinc-800 p-1.5 rounded-2xl">
              {[1, 3, 7].map(d => (
                <button 
                  key={d} 
                  onClick={() => setRemindersDay(d)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${remindersDay === d ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-[#fffbeb] dark:bg-amber-900/10 border border-[#fef3c7] dark:border-amber-900/30 p-8 rounded-[44px] space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600">
            <Zap size={18} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Behavioral Insight</span>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
            Last activity was <span className="underline decoration-amber-400">2024-05-19</span>. Your current usage score is <span className="font-bold">92%</span>. Service value is high.
          </p>
        </div>

        <button 
          onClick={() => { cancelSubscription(sub.id); onBack(); }}
          className="w-full bg-[#0f172a] dark:bg-zinc-100 text-white dark:text-[#0f172a] py-6 rounded-[32px] font-black text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-4 active:scale-95 transition-all shadow-xl"
        >
          <CircleAlert size={18} className="rotate-45" /> Cancel Commitment
        </button>
      </div>
    </div>
  );
};

export default SubscriptionDetail;
