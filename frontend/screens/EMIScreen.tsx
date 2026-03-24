
import React, { useState } from 'react';
import { useApp } from '../store';
import { ChevronLeft, Info, Calendar, CreditCard, ArrowRight, ShieldCheck, Plus, X, Landmark, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EMIScreenProps {
  onBack: () => void;
}

const EMIScreen: React.FC<EMIScreenProps> = ({ onBack }) => {
  const { emis, setEmis } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmi, setNewEmi] = useState({ name: '', monthlyAmount: '', dueDate: '' });

  const handleAddEmi = () => {
    if (!newEmi.name || !newEmi.monthlyAmount || !newEmi.dueDate) return;
    const emi = {
      id: Math.random().toString(36).substr(2, 9),
      name: newEmi.name,
      monthlyAmount: parseFloat(newEmi.monthlyAmount),
      dueDate: newEmi.dueDate,
    };
    setEmis([...emis, emi]);
    setNewEmi({ name: '', monthlyAmount: '', dueDate: '' });
    setShowAddForm(false);
  };

  const handleDeleteEmi = (id: string) => {
    setEmis(emis.filter(e => e.id !== id));
  };

  const totalMonthly = emis.reduce((acc, curr) => acc + curr.monthlyAmount, 0);
  const nextDue = emis.length > 0
    ? new Date(emis.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0].dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    : '—';

  return (
    <div className="p-6 pt-10 space-y-8 min-h-screen bg-slate-50 dark:bg-zinc-950 pb-32">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center shadow-sm text-slate-600 dark:text-zinc-400 active:scale-95 transition-all"><ChevronLeft size={20} /></button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">Debt Intelligence</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all hover:bg-indigo-700"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Summary Card */}
      <div className="bg-zinc-950 dark:bg-zinc-900 p-8 rounded-[40px] text-white shadow-2xl shadow-zinc-200 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={120} /></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-2">Total Monthly Obligations</p>
        <h2 className="text-4xl font-black tracking-tighter">₹{totalMonthly.toLocaleString()}</h2>
        <div className="mt-8 flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Active EMIs</p>
            <p className="text-xl font-black">{emis.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Next Due Date</p>
            <p className="text-xl font-black">{nextDue}</p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-indigo-50 dark:bg-indigo-500/10 rounded-[32px] flex items-center gap-4">
        <div className="bg-white dark:bg-zinc-800 p-2 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm"><Info size={18} /></div>
        <p className="text-[11px] text-indigo-900 dark:text-indigo-200 font-bold">We'll remind you 48h before every due date.</p>
      </div>

      {/* Add EMI Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-[32px] space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Add New EMI / Loan</p>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600 active:text-slate-600 transition-colors"><X size={16} /></button>
              </div>
              <div className="space-y-3">
                <input
                  placeholder="Loan Name (e.g., Home Loan — SBI)"
                  value={newEmi.name}
                  onChange={e => setNewEmi({ ...newEmi, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Monthly EMI (₹)"
                    type="number"
                    value={newEmi.monthlyAmount}
                    onChange={e => setNewEmi({ ...newEmi, monthlyAmount: e.target.value })}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                  <input
                    type="date"
                    value={newEmi.dueDate}
                    onChange={e => setNewEmi({ ...newEmi, dueDate: e.target.value })}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                </div>
              </div>
              <button
                onClick={handleAddEmi}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              >
                Add EMI
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loan Portfolio */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Loan Portfolio</h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1 active:scale-95 transition-all"
          >
            Add New EMI <Plus size={10}/>
          </button>
        </div>

        {/* Empty State */}
        {emis.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 p-10 rounded-[32px] border border-slate-100 dark:border-zinc-800 text-center space-y-4">
            <div className="flex justify-center gap-3">
              <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl text-slate-300 dark:text-zinc-600"><Landmark size={28} /></div>
              <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl text-slate-300 dark:text-zinc-600"><CreditCard size={28} /></div>
              <div className="bg-slate-50 dark:bg-zinc-800 p-4 rounded-2xl text-slate-300 dark:text-zinc-600"><Wallet size={28} /></div>
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 mb-1">No active EMIs or loans</h4>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium leading-relaxed">
                Track your home loans, car loans, credit card EMIs, and other fixed obligations.
                <br />We'll help you stay on top of every payment.
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
            >
              <Plus size={14} /> Add Your First EMI
            </button>
          </motion.div>
        )}

        {/* EMI Cards */}
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
               <button
                 onClick={() => handleDeleteEmi(emi.id)}
                 className="text-rose-500 text-[10px] font-black uppercase flex items-center gap-1 hover:text-rose-600 active:text-rose-600 transition-colors"
               >
                 Remove
               </button>
               <button className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase flex items-center gap-1">Statement <ArrowRight size={12}/></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EMIScreen;
