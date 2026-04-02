import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, supabase, signOutExplicitly } from '../src/lib/api';
import {
  DollarSign, Plus, ArrowRight, ArrowLeft, Trash2, Loader2,
  Briefcase, Zap, Coffee, Film, Shield, Home, Car, CreditCard,
  ShoppingBag, Music, Wifi, CheckCircle2, LogOut, Landmark, Banknote,
} from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
  userId?: string;
}

// ── Step indicators ──────────────────────────────────────────────────
const STEPS = [
  { label: 'Income', icon: DollarSign },
  { label: 'Commitments', icon: Zap },
  { label: 'Expenses', icon: ShoppingBag },
  { label: 'EMIs', icon: CreditCard },
  { label: 'Accounts', icon: Landmark },
];

// ── Subscription templates ───────────────────────────────────────────
const SUB_TEMPLATES = [
  { name: 'Netflix', category: 'Entertainment', amount: 499, icon: Film },
  { name: 'Spotify', category: 'Entertainment', amount: 119, icon: Music },
  { name: 'Gym', category: 'Health', amount: 2500, icon: Zap },
  { name: 'ChatGPT Plus', category: 'Productivity', amount: 1650, icon: Briefcase },
  { name: 'iCloud', category: 'Cloud', amount: 75, icon: Wifi },
  { name: 'YouTube Premium', category: 'Entertainment', amount: 149, icon: Film },
];

// ── Expense category suggestions ─────────────────────────────────────
const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Essentials', 'Health', 'Education', 'Other',
];

const PAYMENT_METHODS = ['UPI', 'Card', 'Cash'];

// ══════════════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════════════

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete, userId = 'unknown' }) => {
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(`onboarding_step_${userId}`);
    return saved ? parseInt(saved, 10) : 0;
  }); // 0=Income, 1=Subs, 2=Expenses, 3=EMIs, 4=Accounts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync step to localStorage
  React.useEffect(() => {
    localStorage.setItem(`onboarding_step_${userId}`, step.toString());
  }, [step, userId]);

  // ── Income state ───────────────────────────────────────────────────
  const [incomeSource, setIncomeSource] = useState('Salary');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency] = useState('monthly');

  // ── Subscriptions state ────────────────────────────────────────────
  const [subs, setSubs] = useState<Array<{
    name: string; category: string; amount: number; billing_cycle: string;
  }>>([]);
  const [customSubName, setCustomSubName] = useState('');
  const [customSubAmount, setCustomSubAmount] = useState('');
  const [customSubCategory, setCustomSubCategory] = useState('Entertainment');
  const [customSubCycle, setCustomSubCycle] = useState<'monthly' | 'yearly'>('monthly');

  // ── Expenses state ─────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Array<{
    name: string; amount: number; category: string; date: string; payment_method: string;
  }>>([]);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Food');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expPayment, setExpPayment] = useState('UPI');

  // ── EMI state ──────────────────────────────────────────────────────
  const [emis, setEmis] = useState<Array<{
    name: string; monthly_amount: number; due_date: string;
  }>>([]);
  const [emiName, setEmiName] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [emiDueDate, setEmiDueDate] = useState('');

  // ── Bank Accounts state ────────────────────────────────────────────
  const [banks, setBanks] = useState<Array<{
    bank_name: string; account_type: string; balance: number; last_four: string;
  }>>([]);
  const [bankName, setBankName] = useState('');
  const [bankType, setBankType] = useState('Savings');
  const [bankBalance, setBankBalance] = useState('');
  const [bankLastFour, setBankLastFour] = useState('');

  // ── Cash Wallet state ──────────────────────────────────────────────
  const [cashWalletBalance, setCashWalletBalance] = useState('');

  // ══════════════════════════════════════════════════════════════════
  // Handlers
  // ══════════════════════════════════════════════════════════════════

  const submitIncome = async () => {
    if (!incomeAmount || parseFloat(incomeAmount) <= 0) {
      setError('Please enter your monthly income');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post('/capital/income', {
        source: incomeSource,
        amount: parseFloat(incomeAmount),
        frequency: incomeFrequency,
      });
      setStep(1);
    } catch (err: any) {
      setError(err.message || 'Failed to save income');
    } finally {
      setLoading(false);
    }
  };

  const addTemplatedSub = (tmpl: typeof SUB_TEMPLATES[0]) => {
    if (subs.find(s => s.name === tmpl.name)) return;
    setSubs(prev => [...prev, {
      name: tmpl.name,
      category: tmpl.category,
      amount: tmpl.amount,
      billing_cycle: 'monthly',
    }]);
  };

  const toggleSubCycle = (idx: number) => {
    setSubs(prev => prev.map((s, i) => i === idx ? { ...s, billing_cycle: s.billing_cycle === 'monthly' ? 'yearly' : 'monthly' } : s));
  };

  const addCustomSub = () => {
    if (!customSubName || !customSubAmount) return;
    setSubs(prev => [...prev, {
      name: customSubName,
      category: customSubCategory,
      amount: parseFloat(customSubAmount),
      billing_cycle: customSubCycle,
    }]);
    setCustomSubName('');
    setCustomSubAmount('');
    setCustomSubCycle('monthly');
  };

  const removeSub = (idx: number) => {
    setSubs(prev => prev.filter((_, i) => i !== idx));
  };

  const submitSubs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Submit all subs in parallel
      await Promise.all(subs.map(s =>
        api.post('/subscriptions', {
          name: s.name,
          category: s.category,
          amount: s.amount,
          billing_cycle: s.billing_cycle,
          next_renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          auto_pay: true,
          status: 'active',
        })
      ));
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to save subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const addExpense = () => {
    if (!expName || !expAmount) return;
    setExpenses(prev => [...prev, {
      name: expName,
      amount: parseFloat(expAmount),
      category: expCategory,
      date: expDate,
      payment_method: expPayment.toLowerCase(),
    }]);
    setExpName('');
    setExpAmount('');
  };

  const removeExpense = (idx: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== idx));
  };

  const submitExpenses = async () => {
    if (expenses.length < 3) {
      setError('Please add at least 3 expenses to activate the behavior engine');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.all(expenses.map(e =>
        api.post('/expenses', {
          name: e.name,
          amount: e.amount,
          category: e.category,
          date: e.date,
          payment_method: e.payment_method,
        })
      ));
      setStep(3); // Go to EMIs
    } catch (err: any) {
      setError(err.message || 'Failed to save expenses');
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // EMI Handlers
  // ══════════════════════════════════════════════════════════════════

  const addEmi = () => {
    if (!emiName || !emiAmount) return;
    setEmis(prev => [...prev, {
      name: emiName,
      monthly_amount: parseFloat(emiAmount),
      due_date: emiDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    }]);
    setEmiName('');
    setEmiAmount('');
    setEmiDueDate('');
  };

  const removeEmi = (idx: number) => {
    setEmis(prev => prev.filter((_, i) => i !== idx));
  };

  const submitEmis = async () => {
    // EMIs are optional — skip just goes to banks
    setStep(4);
  };

  // ══════════════════════════════════════════════════════════════════
  // Bank Account Handlers
  // ══════════════════════════════════════════════════════════════════

  const addBank = () => {
    if (!bankName || !bankBalance || !bankLastFour) return;
    setBanks(prev => [...prev, {
      bank_name: bankName,
      account_type: bankType,
      balance: parseFloat(bankBalance),
      last_four: bankLastFour,
    }]);
    setBankName('');
    setBankBalance('');
    setBankLastFour('');
  };

  const removeBank = (idx: number) => {
    setBanks(prev => prev.filter((_, i) => i !== idx));
  };

  const submitBanks = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [];
      // Save bank accounts
      if (banks.length > 0) {
        promises.push(...banks.map(b =>
          api.post('/bank-accounts', {
            bank_name: b.bank_name,
            account_type: b.account_type,
            balance: b.balance,
            last_four: b.last_four,
          })
        ));
      }
      // Save cash wallet
      if (cashWalletBalance) {
        promises.push(
          api.post('/bank-accounts', {
            bank_name: 'Cash Wallet',
            account_type: 'Cash',
            balance: parseFloat(cashWalletBalance),
            last_four: 'CASH',
          })
        );
      }
      // Save EMIs (if user added any in step 3)
      if (emis.length > 0) {
        promises.push(...emis.map(e =>
          api.post('/commitments', {
            name: e.name,
            type: 'emi',
            amount: e.monthly_amount,
            frequency: 'monthly',
            due_date: e.due_date,
          })
        ));
      }
      if (promises.length > 0) await Promise.all(promises);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-[#0E1116] text-white px-5 py-8 overflow-y-auto relative">
      {/* Background glow */}
      <div className="absolute top-[-80px] left-[-60px] w-[250px] h-[250px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Sign out button — top right */}
      <button
        onClick={() => signOutExplicitly()}
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-medium"
      >
        <LogOut size={14} /> Sign out
      </button>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              i < step ? 'bg-green-500/20 text-green-400' :
              i === step ? 'bg-blue-600/20 text-blue-400 ring-2 ring-blue-500/30' :
              'bg-white/5 text-slate-500'
            }`}>
              {i < step ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-8 h-0.5 rounded ${i < step ? 'bg-green-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ═══════ STEP 0: INCOME ═══════ */}
        {step === 0 && (
          <motion.div
            key="income"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto"
          >
            <h2 className="text-2xl font-bold mb-2">What's your monthly income?</h2>
            <p className="text-slate-400 text-sm mb-8">
              This powers your surplus calculation — the foundation of capital discipline.
            </p>

            {/* Source selector */}
            <div className="flex gap-2 mb-6">
              {['Salary', 'Freelance', 'Business', 'Other'].map(src => (
                <button
                  key={src}
                  onClick={() => setIncomeSource(src)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    incomeSource === src
                      ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {src}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">₹</span>
              <input
                type="number"
                value={incomeAmount}
                onChange={e => setIncomeAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full pl-10 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-2xl font-bold text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
              />
            </div>

            <p className="text-xs text-slate-500 mb-8">
              Frequency: <span className="text-slate-300 font-medium">Monthly</span> (default)
            </p>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              onClick={submitIncome}
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <>Continue <ArrowRight size={20} /></>}
            </button>
          </motion.div>
        )}

        {/* ═══════ STEP 1: SUBSCRIPTIONS ═══════ */}
        {step === 1 && (
          <motion.div
            key="subs"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto"
          >
            <h2 className="text-2xl font-bold mb-2">Your recurring commitments</h2>
            <p className="text-slate-400 text-sm mb-6">
              Add subscriptions, memberships, or any recurring charges.
            </p>

            {/* Quick-add templates */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {SUB_TEMPLATES.map(tmpl => {
                const isAdded = subs.some(s => s.name === tmpl.name);
                return (
                  <button
                    key={tmpl.name}
                    onClick={() => addTemplatedSub(tmpl)}
                    disabled={isAdded}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs ${
                      isAdded
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <tmpl.icon size={18} />
                    <span className="font-medium">{tmpl.name}</span>
                    <span className="text-slate-500">₹{tmpl.amount}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom subscription */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-slate-400 mb-3">Or add custom</p>
              <div className="flex gap-2 mb-2">
                <input
                  value={customSubName}
                  onChange={e => setCustomSubName(e.target.value)}
                  placeholder="Name"
                  className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                />
                <input
                  type="number"
                  value={customSubAmount}
                  onChange={e => setCustomSubAmount(e.target.value)}
                  placeholder="₹ Amount"
                  className="w-28 px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={customSubCategory}
                  onChange={e => setCustomSubCategory(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/20 border border-white/10 rounded-xl text-sm text-white outline-none"
                >
                  {['Entertainment', 'Productivity', 'Health', 'Cloud', 'Shopping', 'Education', 'Other'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="flex bg-black/20 border border-white/10 rounded-xl p-0.5">
                  {(['monthly', 'yearly'] as const).map(c => (
                    <button key={c} onClick={() => setCustomSubCycle(c)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${customSubCycle === c ? 'bg-blue-600/30 text-blue-400' : 'text-slate-500'}`}>{c === 'monthly' ? 'M' : 'Y'}</button>
                  ))}
                </div>
                <button
                  onClick={addCustomSub}
                  className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-all"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Added list */}
            {subs.length > 0 && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold text-slate-400">Added ({subs.length})</p>
                {subs.map((s, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">₹{s.amount}</span>
                      <button onClick={() => toggleSubCycle(i)} className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${s.billing_cycle === 'yearly' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-400'}`}>
                        {s.billing_cycle === 'monthly' ? 'M' : 'Y'}
                      </button>
                      <button onClick={() => removeSub(i)} className="text-red-400/60 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-4 bg-white/5 rounded-2xl text-slate-400 font-medium active:scale-[0.97] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={submitSubs}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>{subs.length === 0 ? 'Skip for now' : 'Continue'} <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 2: EXPENSES ═══════ */}
        {step === 2 && (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto pb-8"
          >
            <h2 className="text-2xl font-bold mb-2">Add 3 recent expenses</h2>
            <p className="text-slate-400 text-sm mb-6">
              This activates your behavioral analysis engine.
            </p>

            {/* Expense form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-3">
              <input
                value={expName}
                onChange={e => setExpName(e.target.value)}
                placeholder="What did you spend on?"
                className="w-full px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-8 pr-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>
                <input
                  type="date"
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                  className="px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white outline-none"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value)}
                  className="flex-1 px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white outline-none"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  value={expPayment}
                  onChange={e => setExpPayment(e.target.value)}
                  className="px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white outline-none"
                >
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button
                onClick={addExpense}
                disabled={!expName || !expAmount}
                className="w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <Plus size={16} /> Add Expense
              </button>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((expenses.length / 3) * 100, 100)}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <span className={`text-xs font-bold ${expenses.length >= 3 ? 'text-green-400' : 'text-slate-500'}`}>
                {expenses.length}/3
              </span>
            </div>

            {/* Added expenses */}
            {expenses.length > 0 && (
              <div className="space-y-2 mb-6">
                {expenses.map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.category} • {e.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">₹{e.amount}</span>
                      <button onClick={() => removeExpense(i)} className="text-red-400/60 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-white/5 rounded-2xl text-slate-400 font-medium active:scale-[0.97] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={submitExpenses}
                disabled={loading || expenses.length < 3}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <>Activate Capital Engine <Zap size={20} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 3: EMIs ═══════ */}
        {step === 3 && (
          <motion.div
            key="emis"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto pb-8"
          >
            <h2 className="text-2xl font-bold mb-2">Any active EMIs?</h2>
            <p className="text-slate-400 text-sm mb-6">
              Add ongoing loan EMIs so we can factor them into your capital flow. Skip if none.
            </p>

            {/* EMI form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-3">
              <input
                value={emiName}
                onChange={e => setEmiName(e.target.value)}
                placeholder="e.g. Car Loan, Phone EMI"
                className="w-full px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    value={emiAmount}
                    onChange={e => setEmiAmount(e.target.value)}
                    placeholder="Monthly amount"
                    className="w-full pl-8 pr-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                  />
                </div>
                <input
                  type="date"
                  value={emiDueDate}
                  onChange={e => setEmiDueDate(e.target.value)}
                  placeholder="Due date"
                  className="px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white outline-none"
                />
              </div>
              <button
                onClick={addEmi}
                disabled={!emiName || !emiAmount}
                className="w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <Plus size={16} /> Add EMI
              </button>
            </div>

            {/* Added EMIs */}
            {emis.length > 0 && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold text-slate-400">Added ({emis.length})</p>
                {emis.map((e, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <CreditCard size={16} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.name}</p>
                        {e.due_date && <p className="text-xs text-slate-500">Due: {e.due_date}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">₹{e.monthly_amount.toLocaleString()}/mo</span>
                      <button onClick={() => removeEmi(i)} className="text-red-400/60 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-4 bg-white/5 rounded-2xl text-slate-400 font-medium active:scale-[0.97] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={submitEmis}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>{emis.length === 0 ? 'Skip for now' : 'Continue'} <ArrowRight size={20} /></>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ STEP 4: BANK ACCOUNTS + CASH WALLET ═══════ */}
        {step === 4 && (
          <motion.div
            key="banks"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="max-w-md mx-auto pb-8"
          >
            <h2 className="text-2xl font-bold mb-2">Link your accounts</h2>
            <p className="text-slate-400 text-sm mb-6">
              Add bank accounts and cash on hand to enable Linked Liquidity tracking.
            </p>

            {/* Cash Wallet */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Banknote size={16} className="text-amber-400" />
                <p className="text-xs font-semibold text-amber-400">Cash Wallet</p>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  value={cashWalletBalance}
                  onChange={e => setCashWalletBalance(e.target.value)}
                  placeholder="Cash on hand (optional)"
                  className="w-full pl-8 pr-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
            </div>

            {/* Bank form */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 space-y-3">
              <p className="text-xs font-semibold text-slate-400 mb-1">Bank Account</p>
              <input
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="Bank name (e.g. ICICI Bank)"
                className="w-full px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={bankType}
                  onChange={e => setBankType(e.target.value)}
                  className="flex-1 px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white outline-none"
                >
                  {['Savings', 'Current', 'Salary', 'FD'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  value={bankLastFour}
                  onChange={e => setBankLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Last 4 digits"
                  maxLength={4}
                  className="w-32 px-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  value={bankBalance}
                  onChange={e => setBankBalance(e.target.value)}
                  placeholder="Current balance"
                  className="w-full pl-8 pr-3 py-3 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
                />
              </div>
              <button
                onClick={addBank}
                disabled={!bankName || !bankBalance || !bankLastFour}
                className="w-full py-3 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <Plus size={16} /> Add Account
              </button>
            </div>

            {/* Added accounts */}
            {banks.length > 0 && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold text-slate-400">Linked ({banks.length})</p>
                {banks.map((b, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <Landmark size={16} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{b.bank_name}</p>
                        <p className="text-xs text-slate-500">{b.account_type} •••• {b.last_four}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">₹{b.balance.toLocaleString()}</span>
                      <button onClick={() => removeBank(i)} className="text-red-400/60 hover:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 mt-3">
                  <p className="text-xs text-emerald-400 font-semibold">Total Liquidity</p>
                  <p className="text-lg font-bold text-emerald-300">
                    ₹{(banks.reduce((sum, b) => sum + b.balance, 0) + (parseFloat(cashWalletBalance) || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-4 bg-white/5 rounded-2xl text-slate-400 font-medium active:scale-[0.97] transition-all"
              >
                <ArrowLeft size={20} />
              </button>
              <button
                onClick={submitBanks}
                disabled={loading}
                className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>{banks.length === 0 && !cashWalletBalance ? 'Skip & Finish' : 'Activate Capital Engine'} <Zap size={20} /></>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingScreen;
