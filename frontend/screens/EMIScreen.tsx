
import React from 'react';
import { useApp } from '../store';
import { ChevronLeft, Info, Calendar, CreditCard, ArrowRight, ShieldCheck, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface EMIScreenProps {
  onBack: () => void;
}

const EMIScreen: React.FC<EMIScreenProps> = ({ onBack }) => {
  const { emis } = useApp();

  return (
    <div className="p-6 pt-10 space-y-8 min-h-screen bg-slate-50 dark:bg-zinc-950 pb-32">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center shadow-sm text-slate-600 dark:text-zinc-400 active:scale-95 transition-all"><ChevronLeft size={20} /></button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">Debt Intelligence</h1>
        </div>
        <button className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all">
          <Plus size={20} />
        </button>
      </header>

      <div className="bg-zinc-950 dark:bg-zinc-900 p-8 rounded-[40px] text-white shadow-2xl shadow-zinc-200 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={120} /></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-2">Total Monthly Obligations</p>
        <h2 className="text-4xl font-black tracking-tighter">₹{emis.reduce((acc, curr) => acc + curr.monthlyAmount, 0).toLocaleString()}</h2>
        <div className="mt-8 flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Active EMIs</p>
            <p className="text-xl font-black">{emis.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Next Due Date</p>
            <p className="text-xl font-black">Nov 05</p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-[32px] flex items-center gap-4">
        <div className="bg-white dark:bg-zinc-800 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm"><Info size={18} /></div>
        <p className="text-[11px] text-indigo-900 dark:text-indigo-200 font-bold">We’ll remind you 48h before every due date.</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Loan Portfolio</h3>
          <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1">Add New EMI <Plus size={10}/></button>
        </div>
        {emis.map((emi, idx) => (
          <motion.div key={emi.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} className="bg-white dark:bg-zinc-900 p-6 rounded-[32px] border border-slate-100 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800 p-3 rounded-2xl text-slate-600 dark:text-zinc-400"><CreditCard size={20} /></div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-zinc-100 text-sm tracking-tight">{emi.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Due on {new Date(emi.dueDate).getDate()}th</p>
                </div>
              </div>
              <p className="font-black text-slate-900 dark:text-zinc-50">₹{emi.monthlyAmount.toLocaleString()}</p>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-slate-50 dark:border-zinc-800">
               <span className="text-[10px] font-bold text-slate-400 uppercase">12 / 24 Paid</span>
               <button className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase flex items-center gap-1">Statement <ArrowRight size={12}/></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EMIScreen;
