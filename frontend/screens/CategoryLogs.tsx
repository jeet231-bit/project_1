
import React from 'react';
import { useApp } from '../store';
import { ChevronLeft, PieChart, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { SubscriptionStatus, BillingCycle } from '../types';

interface Props {
  onBack: () => void;
}

const CategoryLogs: React.FC<Props> = ({ onBack }) => {
  const { expenses, subscriptions } = useApp();

  const categories = React.useMemo(() => {
    const map: Record<string, { total: number, count: number, subItems: string[] }> = {};
    expenses.forEach(e => {
      if (!map[e.category]) map[e.category] = { total: 0, count: 0, subItems: [] };
      map[e.category].total += e.amount;
      map[e.category].count += 1;
      map[e.category].subItems.push(e.name);
    });
    subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).forEach(s => {
      if (!map[s.category]) map[s.category] = { total: 0, count: 0, subItems: [] };
      const amt = s.billingCycle === BillingCycle.MONTHLY ? s.amount : s.amount / 12;
      map[s.category].total += amt;
      map[s.category].count += 1;
      map[s.category].subItems.push(s.name);
    });
    return Object.entries(map).sort((a, b) => b[1].total - a[1].total);
  }, [expenses, subscriptions]);

  return (
    <div className="p-6 pt-10 space-y-8 min-h-screen bg-slate-50 dark:bg-zinc-950 pb-32">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center shadow-sm text-slate-600 dark:text-zinc-400"><ChevronLeft size={20} /></button>
        <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">Portfolio Logs</h1>
      </header>

      <div className="space-y-6">
        {categories.map(([cat, data], idx) => (
          <motion.div key={cat} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-2xl text-indigo-600 dark:text-indigo-400"><PieChart size={18} /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-zinc-50 uppercase text-xs tracking-widest">{cat}</h3>
                  <p className="text-[10px] text-slate-400 font-bold">{data.count} Commitments</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900 dark:text-zinc-50">₹{Math.round(data.total).toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Est. Monthly</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {data.subItems.slice(0, 4).map((item, i) => (
                <span key={i} className="px-3 py-1 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full text-[9px] font-bold uppercase tracking-widest">{item}</span>
              ))}
              {data.subItems.length > 4 && <span className="text-[9px] font-bold text-indigo-500 py-1">+{data.subItems.length - 4} more</span>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CategoryLogs;
