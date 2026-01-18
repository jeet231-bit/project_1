
import React, { useMemo, useState } from 'react';
import { useApp } from '../store';
import { 
  TrendingUp, ChevronRight, Calendar, Info,
  Sun, Moon, Target, Check, Edit2, Plus, ArrowRight, Building2,
  Sparkles, Send, Loader2, CreditCard, Eye, EyeOff, ArrowUpRight, PieChart,
  LineChart as LineIcon, Zap
} from 'lucide-react';
import { SubscriptionStatus, BillingCycle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, Tooltip, AreaChart, Area } from 'recharts';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  onNavigate: (tab: 'home' | 'subs' | 'expenses' | 'insights' | 'settings' | 'emis' | 'categoryLogs') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { userName, theme, setTheme, isSecureMode, toggleSecureMode, subscriptions, expenses, emis, goals, bankAccounts, updateGoal } = useApp();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalVal, setNewGoalVal] = useState('');
  const [velocityFilter, setVelocityFilter] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [showExplainer, setShowExplainer] = useState<string | null>(null);

  const [lexQuery, setLexQuery] = useState('');
  const [lexResponse, setLexResponse] = useState<string | null>(null);
  const [isLexLoading, setIsLexLoading] = useState(false);

  const stats = useMemo(() => {
    const activeSubs = subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE);
    const monthlySubSpend = activeSubs.reduce((acc, sub) => acc + (sub.billingCycle === BillingCycle.MONTHLY ? sub.amount : sub.amount / 12), 0);
    const monthlyEMISpend = emis.reduce((acc, emi) => acc + emi.monthlyAmount, 0);
    
    const now = new Date();
    const monthlyExpenseSpend = expenses.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((acc, exp) => acc + exp.amount, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const weeklyExpenseSpend = expenses.filter(e => new Date(e.date) >= sevenDaysAgo).reduce((acc, exp) => acc + exp.amount, 0);

    return { 
      totalMonthlySpend: monthlySubSpend + monthlyEMISpend + monthlyExpenseSpend, 
      monthlyEMISpend,
      monthlySubSpend,
      weeklyExpenseSpend
    };
  }, [subscriptions, emis, expenses]);

  const categorySummary = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    subscriptions.filter(s => s.status === SubscriptionStatus.ACTIVE).forEach(s => {
      const amt = s.billingCycle === BillingCycle.MONTHLY ? s.amount : s.amount / 12;
      map[s.category] = (map[s.category] || 0) + amt;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [expenses, subscriptions]);

  const velocityData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map((day, idx) => ({ name: day, value: [120, 180, 150, 450, 800, 350, 420][idx] }));
  }, []);

  // Growth projection for Wealth Accelerator
  const projectionData = [
    { year: 0, val: 12500 },
    { year: 1, val: 14200 },
    { year: 2, val: 18500 },
    { year: 3, val: 24000 },
    { year: 4, val: 32000 },
    { year: 5, val: 45000 },
  ];

  const handleUpdateGoal = (id: string) => {
    const val = parseFloat(newGoalVal);
    if (!isNaN(val)) updateGoal(id, val);
    setIsEditingGoal(false);
  };

  const mask = (val: string | number) => isSecureMode ? "••••" : `₹${val.toLocaleString()}`;

  const handleLexQuery = async () => {
    if (!lexQuery.trim()) return;
    setIsLexLoading(true);
    setLexResponse(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptContext = `You are Lex, a professional and friendly financial strategist for Aryan. Current Spend: ₹${stats.totalMonthlySpend}. Analyze the question and provide a human, action-oriented summary. Q: ${lexQuery}`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: promptContext });
      setLexResponse(response.text);
    } catch (e) { setLexResponse("I encountered an error. Please try again, Aditya."); }
    finally { setIsLexLoading(false); }
  };

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen">
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-premium-text tracking-tight flex items-center gap-2">Hello, Aditya <span className="text-2xl">👋</span></h1>
          <p className="text-sm font-medium text-slate-400 dark:text-premium-muted">Your financial pulse is steady today.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleSecureMode} className="w-11 h-11 rounded-2xl bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 flex items-center justify-center shadow-sm text-slate-600 dark:text-premium-muted active:scale-95 transition-all">
            {isSecureMode ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="w-11 h-11 rounded-2xl bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 flex items-center justify-center shadow-sm text-slate-600 dark:text-premium-muted active:scale-95 transition-all">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Linked Liquidity Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-slate-900 dark:text-premium-text font-black text-[10px] uppercase tracking-[0.2em]">Linked Liquidity</h3>
            <button onClick={() => setShowExplainer('liquidity')}><Info size={10} className="text-slate-400" /></button>
          </div>
          <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-bold cursor-pointer hover:opacity-70">+ Connect</span>
        </div>
        
        <AnimatePresence>
          {showExplainer === 'liquidity' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-indigo-50/50 dark:bg-indigo-500/5 p-4 rounded-2xl mb-4">
              <p className="text-[10px] font-medium text-indigo-900/60 dark:text-indigo-300/60 leading-relaxed">
                Liquidity represents cash readily available across your linked cards and accounts to cover projected outflows.
              </p>
              <button onClick={() => setShowExplainer(null)} className="text-[9px] font-bold text-indigo-600 mt-2 uppercase tracking-widest">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
          {bankAccounts.concat([{ id: 'b3', bankName: 'UPI Wallet', balance: 1250, lastFour: 'Wallet', accountType: 'Digital' } as any]).map((acc, i) => (
            <div key={acc.id} className="min-w-[170px] bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 p-5 rounded-[2.5rem] card-glow flex flex-col justify-between h-36 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all shrink-0 active:scale-95">
              <div className="flex justify-between items-start">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs ${i % 2 === 0 ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  {i % 2 === 0 ? <CreditCard size={16} /> : <Building2 size={16} />}
                </div>
                <span className="text-slate-300 dark:text-premium-muted/30 text-[10px] font-bold">{acc.lastFour === 'Wallet' ? 'Wallet' : `•••• ${acc.lastFour}`}</span>
              </div>
              <div>
                <p className="text-slate-400 dark:text-premium-muted/50 text-[9px] font-black uppercase tracking-widest leading-none mb-1">{acc.bankName}</p>
                <p className="text-xl font-black text-slate-900 dark:text-premium-text tracking-tight">{mask(acc.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Goal Section */}
      <section className="bg-indigo-600 dark:bg-indigo-700 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
        {goals.map(goal => (
          <div key={goal.id} className="space-y-6 relative z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-indigo-200" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-100">Savings Target</span>
              </div>
              <button onClick={() => { if (isEditingGoal) handleUpdateGoal(goal.id); else { setIsEditingGoal(true); setNewGoalVal(goal.targetAmount.toString()); } }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                {isEditingGoal ? <Check size={18} /> : <Edit2 size={16} />}
              </button>
            </div>
            {isEditingGoal ? (
              <input autoFocus className="bg-transparent text-5xl font-black outline-none w-full border-b border-white/20 pb-1" value={newGoalVal} onChange={(e) => setNewGoalVal(e.target.value)} onBlur={() => handleUpdateGoal(goal.id)} />
            ) : (
              <div className="text-5xl font-black tracking-tighter">{mask(goal.targetAmount)}</div>
            )}
            <div className="space-y-2">
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <motion.div className="bg-white h-full" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (goal.currentProgress / goal.targetAmount) * 100)}%` }} transition={{ duration: 1, ease: "easeOut" }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-indigo-100/60 uppercase">Progress</span>
                <span className="text-[10px] font-black">{Math.round((goal.currentProgress / goal.targetAmount) * 100)}% achieved</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Portfolio Outflow Metrics Card */}
      <section className="bg-[#0f172a] dark:bg-premium-card p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-slate-300 dark:shadow-none transition-all hover:scale-[1.01]">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 dark:text-premium-muted text-[10px] font-black uppercase tracking-[0.2em] mb-1">Portfolio Outflow</p>
              <h3 className="text-4xl font-black tracking-tighter">{mask(Math.round(stats.monthlySubSpend))}</h3>
              <p className="text-indigo-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Monthly Commitment</p>
            </div>
            <div className="bg-indigo-500/20 p-4 rounded-[28px] border border-white/5 text-indigo-400">
              <TrendingUp size={24} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
            <div>
              <p className="text-slate-500 dark:text-premium-muted text-[9px] font-black uppercase tracking-widest mb-1">Weekly Spend</p>
              <p className="text-xl font-black">{mask(stats.weeklyExpenseSpend)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-premium-muted text-[9px] font-black uppercase tracking-widest mb-1">Health</p>
              <p className="text-xl font-black text-emerald-400">92%</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 opacity-[0.03] scale-[2] pointer-events-none">
           <PieChart size={180} />
        </div>
      </section>

      {/* Lex AI Intelligence */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          Lex Intelligence <Sparkles size={12} className="text-indigo-500" />
        </h3>
        <div className="bg-slate-50 dark:bg-premium-card border border-slate-100 dark:border-white/5 p-6 rounded-[36px] shadow-inner space-y-4 relative overflow-hidden">
          <div className="flex gap-2">
            <input className="flex-1 bg-white dark:bg-premium-dark border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:text-premium-text transition-all" placeholder="Where is my money going?" value={lexQuery} onChange={(e) => setLexQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLexQuery()} />
            <button onClick={handleLexQuery} disabled={isLexLoading} className="bg-[#0f172a] dark:bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg active:scale-90 transition-all disabled:opacity-50">
              {isLexLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <AnimatePresence>{lexResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-premium-dark/50 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
              <p className="text-[11px] font-medium text-slate-700 dark:text-premium-muted leading-relaxed whitespace-pre-wrap">{lexResponse}</p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50 dark:border-white/5">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                 <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">End-to-End Encrypted Intelligence</span>
              </div>
            </motion.div>
          )}</AnimatePresence>
        </div>
      </section>

      {/* EMI Card */}
      <button onClick={() => onNavigate('emis')} className="w-full bg-[#0f172a] dark:bg-premium-card rounded-[40px] p-8 text-white flex items-center justify-between shadow-2xl active:scale-[0.98] transition-all hover:bg-slate-900 dark:hover:bg-premium-card/80">
        <div className="flex items-center gap-6 text-left">
          <div className="bg-white/10 dark:bg-indigo-500/10 p-4 rounded-2xl text-white dark:text-indigo-400"><Calendar size={24} /></div>
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-premium-muted font-bold uppercase tracking-[0.2em] mb-1">Fixed Obligations</p>
            <p className="text-2xl font-black tracking-tight">{mask(stats.monthlyEMISpend)} <span className="text-xs font-medium opacity-50">/ mo</span></p>
          </div>
        </div>
        <div className="bg-white/10 p-2.5 rounded-full"><ChevronRight size={18} className="text-zinc-400" /></div>
      </button>

      {/* Expense Velocity Chart */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em]">Expense Velocity</h3>
            <button onClick={() => setShowExplainer('velocity')}><Info size={10} className="text-slate-400" /></button>
          </div>
          <div className="bg-slate-100 dark:bg-premium-card p-1 rounded-full flex gap-1">
            <button onClick={() => setVelocityFilter('Weekly')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${velocityFilter === 'Weekly' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Weekly</button>
            <button onClick={() => setVelocityFilter('Monthly')} className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${velocityFilter === 'Monthly' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-400'}`}>Monthly</button>
          </div>
        </div>
        <AnimatePresence>
          {showExplainer === 'velocity' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-indigo-50/50 dark:bg-indigo-500/5 p-4 rounded-2xl">
              <p className="text-[10px] font-medium text-indigo-900/60 dark:text-indigo-300/60 leading-relaxed">
                Velocity tracks the speed of your spending. Lower peaks indicate high discipline and capital preservation.
              </p>
              <button onClick={() => setShowExplainer(null)} className="text-[9px] font-bold text-indigo-600 mt-2 uppercase tracking-widest">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="bg-white dark:bg-premium-card p-8 rounded-[44px] border border-slate-50 dark:border-white/5 card-glow h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={velocityData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} dy={10} />
              <Tooltip cursor={{ fill: 'transparent' }} content={({active, payload}) => active && payload ? <div className="bg-[#0f172a] text-white px-3 py-1.5 rounded-xl text-[10px] font-black">{mask(payload[0].value as number)}</div> : null} />
              <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={26}>
                {velocityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 4 ? '#6366f1' : '#f1f5f9'} fillOpacity={theme === 'dark' ? 0.3 : 0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Spend by Category Preview */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em] px-2">Spend by Category</h3>
        <div className="bg-white dark:bg-premium-card rounded-[40px] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
          <div className="space-y-4">
            {categorySummary.map(([cat, amount], idx) => (
              <div key={cat} className="flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${['bg-indigo-400', 'bg-emerald-400', 'bg-rose-400', 'bg-amber-400', 'bg-violet-400'][idx % 5]}`}></div>
                  <span className="text-xs font-bold text-slate-700 dark:text-premium-muted group-hover:text-slate-900 dark:group-hover:text-premium-text transition-colors">{cat}</span>
                </div>
                <span className="text-xs font-black text-slate-900 dark:text-premium-text">{mask(Math.round(amount))}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => onNavigate('categoryLogs')}
            className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pt-5 border-t border-slate-50 dark:border-white/5 active:scale-95 transition-all"
          >
            View full spend logs <ArrowRight size={12} />
          </button>
        </div>
      </section>

      {/* Recovery Mode */}
      <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-7 rounded-[40px] flex items-center justify-between group active:scale-95 transition-all cursor-pointer">
        <div className="flex items-center gap-6">
          <div className="bg-white dark:bg-premium-dark p-4 rounded-2xl shadow-sm text-emerald-500"><TrendingUp size={24} /></div>
          <div>
            <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1 leading-none">RECOVERY MODE</h4>
            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100/80">Regain {mask(740)} this month by optimizing leaks.</p>
          </div>
        </div>
        <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2.5 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
          <ChevronRight size={18} />
        </div>
      </div>

      {/* Refined Wealth Accelerator Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-slate-900 dark:text-premium-text font-black text-[10px] uppercase tracking-[0.2em]">Wealth Accelerator</h3>
            <button onClick={() => setShowExplainer('wealth')}><Info size={10} className="text-slate-400" /></button>
          </div>
        </div>
        
        <AnimatePresence>
          {showExplainer === 'wealth' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-violet-50/50 dark:bg-violet-500/5 p-5 rounded-[2rem] border border-violet-100/50 dark:border-violet-500/10 mb-2">
              <div className="flex items-start gap-4">
                <Zap size={16} className="text-violet-600 shrink-0 mt-1" />
                <p className="text-[11px] font-medium text-violet-900/70 dark:text-violet-200/60 leading-relaxed">
                  Compounding is the 8th wonder of the world. By investing your ₹12,500 monthly surplus, you bypass inflation and build generational capital.
                </p>
              </div>
              <button onClick={() => setShowExplainer(null)} className="text-[9px] font-black text-violet-600 dark:text-violet-400 mt-3 uppercase tracking-widest pl-9">I understand</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 p-8 rounded-[44px] shadow-2xl space-y-8 relative overflow-hidden group active:scale-[0.99] transition-all">
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-violet-500/10 transition-colors"></div>
          
          <div className="flex items-start gap-6 relative z-10">
            <div className="bg-violet-100 dark:bg-violet-500/10 p-5 rounded-[28px] shadow-inner text-violet-600 dark:text-violet-400 animate-pulse-slow">
              <LineIcon size={28} strokeWidth={2.5} />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-[0.2em]">Growth Potential</h4>
              <p className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tighter">
                {mask(45000)} <span className="text-xs font-medium text-slate-400 dark:text-premium-muted">by 2029</span>
              </p>
              <p className="text-[11px] font-medium text-slate-400 dark:text-premium-muted/60 leading-relaxed">
                Based on your current ₹12.5k surplus at 12% avg yield.
              </p>
            </div>
          </div>

          {/* Visualizing the Growth Curve */}
          <div className="h-24 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <button className="w-full bg-violet-600 hover:bg-violet-700 text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.25em] shadow-xl shadow-violet-200 dark:shadow-none flex items-center justify-center gap-3 transition-all relative z-10 active:scale-95">
            Deploy Idle Capital <ArrowUpRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
