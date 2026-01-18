
import React, { useState } from 'react';
import { useApp } from '../store';
import { 
  Plus, User, Coffee, Car, ShoppingBag, Dumbbell, ChevronUp
} from 'lucide-react';
import { PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const ExpenseList: React.FC = () => {
  const { expenses, isSecureMode } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const getIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('food')) return <i className="fa-solid fa-mug-hot"></i>;
    if (c.includes('transport')) return <i className="fa-solid fa-car"></i>;
    if (c.includes('essentials')) return <i className="fa-solid fa-cart-shopping"></i>;
    if (c.includes('health')) return <i className="fa-solid fa-dumbbell"></i>;
    return <i className="fa-solid fa-bag-shopping"></i>;
  };

  const getSource = (method: string) => {
    if (method === PaymentMethod.UPI) return "HDFC Bank • 4242";
    if (method === PaymentMethod.CARD) return "ICICI Bank • 8821";
    return "CASH";
  };

  const mask = (val: number) => isSecureMode ? "••••" : `₹${val.toLocaleString()}`;

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">Daily Spend</h1>
        <div className="flex gap-2">
          <div className="w-9 h-9 bg-white dark:bg-premium-card rounded-full border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 rotate-0 active:scale-95 transition-all"><ChevronUp size={18} /></div>
          <div className="w-9 h-9 bg-[#0f172a] dark:bg-premium-card rounded-full border border-white/5 flex items-center justify-center text-white dark:text-premium-text"><User size={18} /></div>
        </div>
      </header>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em]">Expense Ledger</h3>
        <button onClick={() => setShowAdd(true)} className="bg-[#0f172a] dark:bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Plus size={22} /></button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {expenses.map((exp, i) => (
            <motion.div 
              key={exp.id} 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
              transition={{ delay: i * 0.05 }} 
              className="bg-white dark:bg-premium-card p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex justify-between items-center group transition-all cursor-pointer active:scale-[0.98]"
            >
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-premium-dark flex items-center justify-center text-slate-400 dark:text-premium-muted/50 text-xl border border-slate-100 dark:border-white/5 shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 transition-colors">
                  {getIcon(exp.category)}
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-premium-text leading-tight tracking-tight text-lg">{exp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 dark:text-premium-muted/50 font-black uppercase tracking-widest">{exp.category}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10"></div>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-widest">{getSource(exp.paymentMethod)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900 dark:text-premium-text text-lg">{mask(exp.amount)}</p>
                <p className="text-[10px] text-slate-400 dark:text-premium-muted font-bold uppercase tracking-widest">{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[100] flex items-end">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white dark:bg-premium-dark w-full rounded-t-[48px] p-10 pb-12 shadow-2xl border-t border-white/5">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-10"></div>
            <h2 className="text-3xl font-black mb-10 dark:text-premium-text tracking-tight text-center">New Entry</h2>
            <div className="space-y-6">
              <input className="w-full bg-slate-50 dark:bg-premium-card border-none rounded-3xl p-6 font-bold outline-none dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Merchant Name" />
              <input type="number" className="w-full bg-slate-50 dark:bg-premium-card border-none rounded-3xl p-6 font-black text-3xl outline-none dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="₹0.00" />
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-5 text-slate-400 dark:text-premium-muted font-black uppercase text-[10px] tracking-[0.2em] hover:text-rose-500 transition-colors">Discard</button>
              <button onClick={() => setShowAdd(false)} className="flex-[2] bg-[#0f172a] dark:bg-indigo-600 text-white py-6 rounded-[28px] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Post Transaction</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
