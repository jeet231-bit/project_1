import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import { api } from '../src/lib/api';
import { CategoryBudget } from '../types';
import { ChevronLeft, Plus, X, Trash2, Target, Edit2, Check, ChevronDown, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface BudgetScreenProps {
  onBack: () => void;
}

const PRESET_CATEGORIES = [
  'Food', 'Transport', 'Entertainment', 'Shopping', 'Health',
  'Education', 'Utilities', 'Travel', 'Groceries', 'Other',
];

const BudgetScreen: React.FC<BudgetScreenProps> = ({ onBack }) => {
  const { budgets, setBudgets, expenses } = useApp();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [newBudget, setNewBudget] = useState({ category: '', monthlyLimit: '' });
  const [loading, setLoading] = useState(false);
  const [globalOpen, setGlobalOpen] = useState(false);

  // Current month info
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthName = now.toLocaleString('en-US', { month: 'long' });

  // Compute current month spend per category from expenses (case-insensitive match)
  const spendByCategory: Record<string, number> = {};
  expenses.forEach(exp => {
    if (exp.date.startsWith(currentMonth)) {
      const key = exp.category.toLowerCase();
      spendByCategory[key] = (spendByCategory[key] || 0) + exp.amount;
    }
  });

  // Helper: look up spend using case-insensitive key
  const getSpend = (category: string) => spendByCategory[category.toLowerCase()] || 0;

  const totalBudget = budgets.reduce((a, b) => a + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((a, b) => a + getSpend(b.category), 0);

  const handleAdd = async () => {
    const category = newBudget.category.trim();
    const limit = parseFloat(newBudget.monthlyLimit);
    if (!category || !limit || limit <= 0) return;

    setLoading(true);
    try {
      const result = await api.post('/budgets', { category, monthly_limit: limit });
      const mapped: CategoryBudget = {
        id: String(result.id),
        category: result.category,
        monthlyLimit: result.monthly_limit,
        createdAt: result.created_at,
      };
      // Upsert: replace if same category exists, otherwise add
      setBudgets([...budgets.filter(b => b.category !== mapped.category), mapped]);
      setNewBudget({ category: '', monthlyLimit: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Failed to save budget:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (budget: CategoryBudget) => {
    const limit = parseFloat(editLimit);
    if (!limit || limit <= 0) return;

    setLoading(true);
    try {
      const result = await api.post('/budgets', { category: budget.category, monthly_limit: limit });
      const mapped: CategoryBudget = {
        id: String(result.id),
        category: result.category,
        monthlyLimit: result.monthly_limit,
        createdAt: result.created_at,
      };
      setBudgets(budgets.map(b => b.id === budget.id ? mapped : b));
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update budget:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await api.delete(`/budgets/${id}`);
      setBudgets(budgets.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete budget:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (spent: number, limit: number) => {
    const ratio = spent / limit;
    if (ratio >= 1) return 'bg-rose-500';
    if (ratio >= 0.8) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getProgressTextColor = (spent: number, limit: number) => {
    const ratio = spent / limit;
    if (ratio >= 1) return 'text-rose-500';
    if (ratio >= 0.8) return 'text-amber-500';
    return 'text-emerald-500';
  };

  // Categories not yet budgeted
  const usedCategories = new Set(budgets.map(b => b.category));
  const availableCategories = PRESET_CATEGORIES.filter(c => !usedCategories.has(c));

  // ── Global Budgets: historical spend by category across all months ──
  const DEFAULT_GLOBAL_LIMIT = 1000;

  const globalData = useMemo(() => {
    const allCats = new Set<string>();
    const monthMap: Record<string, Record<string, number>> = {};

    expenses.forEach(exp => {
      const monthKey = exp.date.slice(0, 7);
      if (!monthKey || monthKey.length < 7) return;
      const cat = exp.category.toLowerCase();
      allCats.add(cat);
      if (!monthMap[monthKey]) monthMap[monthKey] = {};
      monthMap[monthKey][cat] = (monthMap[monthKey][cat] || 0) + exp.amount;
    });

    const sortedMonths = Object.keys(monthMap).sort().slice(-6);
    const categories = Array.from(allCats).sort();

    const chartData = sortedMonths.map(m => {
      const d = new Date(m + '-15');
      const label = d.toLocaleString('en-US', { month: 'short' });
      const row: Record<string, any> = { month: label };
      categories.forEach(cat => {
        row[cat] = monthMap[m][cat] || 0;
      });
      return row;
    });

    // Per-category summary
    const insights = categories.map(cat => {
      const total = chartData.reduce((a, row) => a + (row[cat] || 0), 0);
      const avg = total / Math.max(chartData.length, 1);
      return { category: cat, total, avg, over: avg > DEFAULT_GLOBAL_LIMIT };
    }).sort((a, b) => b.total - a.total);

    return { categories, chartData, insights };
  }, [expenses]);

  return (
    <div className="p-6 pt-10 space-y-8 min-h-screen bg-slate-50 dark:bg-zinc-950 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 flex items-center justify-center shadow-sm text-slate-600 dark:text-zinc-400 active:opacity-70 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">Budgets</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:scale-[0.975] transition-transform duration-150 ease-out hover:bg-indigo-700"
        >
          <Plus size={20} />
        </button>
      </header>

      {/* Summary Card */}
      <div className="bg-zinc-950 dark:bg-zinc-900 p-8 rounded-[40px] text-white shadow-2xl shadow-zinc-200 dark:shadow-none relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={120} /></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 mb-2">Monthly Budget ({monthName})</p>
        <h2 className="text-4xl font-black tracking-tighter">₹{totalBudget.toLocaleString()}</h2>
        <div className="mt-8 flex gap-8">
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Categories</p>
            <p className="text-lg font-black mt-1">{budgets.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Spent</p>
            <p className={`text-lg font-black mt-1 ${totalSpent > totalBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₹{totalSpent.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Remaining</p>
            <p className={`text-lg font-black mt-1 ${totalBudget - totalSpent < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ₹{Math.max(0, totalBudget - totalSpent).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Add Budget Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">New Category Budget</h3>
                <button onClick={() => setShowAddForm(false)} className="text-slate-400 active:opacity-70 transition-colors"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <select
                  value={newBudget.category}
                  onChange={e => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-slate-900 dark:text-zinc-100 border border-slate-100 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select category</option>
                  {availableCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Monthly limit (₹)"
                  value={newBudget.monthlyLimit}
                  onChange={e => setNewBudget({ ...newBudget, monthlyLimit: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-slate-900 dark:text-zinc-100 border border-slate-100 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={loading || !newBudget.category || !newBudget.monthlyLimit}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition-all disabled:opacity-50 hover:bg-indigo-700"
              >
                {loading ? 'Saving...' : 'Set Budget'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Cards */}
      {budgets.length === 0 && !showAddForm && (
        <div className="text-center py-16">
          <Target size={48} className="mx-auto text-slate-300 dark:text-zinc-700 mb-4" />
          <p className="text-sm font-bold text-slate-400 dark:text-zinc-500">No category budgets set</p>
          <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">Tap + to create your first budget</p>
        </div>
      )}

      <div className="space-y-4">
        {budgets.map(budget => {
          const spent = getSpend(budget.category);
          const pct = budget.monthlyLimit > 0 ? Math.min((spent / budget.monthlyLimit) * 100, 100) : 0;
          const isEditing = editingId === budget.id;

          return (
            <motion.div
              key={budget.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{budget.category}</h3>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => handleUpdate(budget)}
                      disabled={loading}
                      className="text-emerald-500 active:opacity-70 transition-colors"
                    >
                      <Check size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => { setEditingId(budget.id); setEditLimit(String(budget.monthlyLimit)); }}
                      className="text-slate-400 dark:text-zinc-500 active:opacity-70 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(budget.id)}
                    disabled={loading}
                    className="text-slate-400 dark:text-zinc-500 hover:text-rose-500 active:opacity-70 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="mb-4">
                  <input
                    type="number"
                    value={editLimit}
                    onChange={e => setEditLimit(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-zinc-800 rounded-xl text-sm font-medium text-slate-900 dark:text-zinc-100 border border-slate-100 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-baseline justify-between mb-3">
                  <span className={`text-lg font-black ${getProgressTextColor(spent, budget.monthlyLimit)}`}>
                    ₹{spent.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                    / ₹{budget.monthlyLimit.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${getProgressColor(spent, budget.monthlyLimit)}`}
                />
              </div>

              <div className="flex justify-between mt-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                  {pct.toFixed(0)}% used
                </span>
                {spent > budget.monthlyLimit && (
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                    Over by ₹{(spent - budget.monthlyLimit).toLocaleString()}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Global Budgets ──────────────────────────────────── */}
      <section className="mt-4">
        {/* Accordion trigger — card style */}
        <button
          onClick={() => setGlobalOpen(!globalOpen)}
          className="w-full flex items-center justify-between bg-zinc-950 dark:bg-zinc-900 rounded-[28px] p-6 shadow-xl shadow-zinc-200 dark:shadow-none active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl">
              <Globe size={18} className="text-white/70" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em] mb-0.5">Historical Analysis</p>
              <h3 className="text-[15px] font-bold text-white tracking-tight">Global Budgets</h3>
              <p className="text-[10px] text-zinc-500 font-medium mt-1">Last 6 months &middot; ₹1,000 baseline</p>
            </div>
          </div>
          <motion.div animate={{ rotate: globalOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-zinc-500" />
          </motion.div>
        </button>

        <AnimatePresence>
          {globalOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="space-y-10 pt-2 pb-4">
                {globalData.chartData.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-zinc-600 text-center py-10">No expense history found</p>
                ) : (
                  <>
                    {/* ── Chart Section ────────────────────────── */}
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 pt-6">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={globalData.chartData} barCategoryGap="25%" barGap={1}>
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fontWeight: 500, fill: '#94a3b8' }}
                              dy={6}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 9, fontWeight: 500, fill: '#cbd5e1' }}
                              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                              width={32}
                            />
                            <Tooltip
                              contentStyle={{
                                background: '#1e293b',
                                border: 'none',
                                borderRadius: 10,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#f1f5f9',
                                padding: '8px 12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,.15)',
                              }}
                              formatter={(value: number, name: string) => [
                                `₹${value.toLocaleString()}`,
                                name.charAt(0).toUpperCase() + name.slice(1),
                              ]}
                              cursor={{ fill: 'rgba(148,163,184,0.06)' }}
                            />
                            <ReferenceLine
                              y={DEFAULT_GLOBAL_LIMIT}
                              stroke="#cbd5e1"
                              strokeDasharray="4 4"
                              strokeWidth={1}
                            />
                            {globalData.categories.map(cat => {
                              // Over-baseline categories get a muted red, rest get neutral slate
                              const insight = globalData.insights.find(i => i.category === cat);
                              const barColor = insight?.over ? '#f87171' : '#e2e8f0';
                              const barColorDark = insight?.over ? '#ef4444' : '#334155';
                              // Use CSS media query isn't possible here — pick one that works in both
                              // Light mode dominates; dark users still get the semantic contrast
                              return (
                                <Bar
                                  key={cat}
                                  dataKey={cat}
                                  name={cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  fill={barColor}
                                  radius={[3, 3, 0, 0]}
                                  maxBarSize={24}
                                />
                              );
                            })}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      {/* Baseline label outside chart — quiet */}
                      <p className="text-[9px] text-slate-400 dark:text-zinc-600 font-medium text-right mt-1 pr-1">
                        Dashed line = ₹1,000 / category baseline
                      </p>
                    </div>

                    {/* ── Category Insights ────────────────────── */}
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider px-1 mb-4">
                        Category Insights
                      </h4>
                      <div className="space-y-0.5">
                        {globalData.insights.map(({ category, total, avg, over }) => (
                          <div
                            key={category}
                            className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            {/* Left — name + avg */}
                            <div>
                              <p className="text-[13px] font-semibold text-slate-800 dark:text-zinc-200">
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-600 font-normal mt-0.5">
                                ₹{Math.round(total).toLocaleString()} total &middot; ₹{Math.round(avg).toLocaleString()}/mo avg
                              </p>
                            </div>

                            {/* Right — status tag */}
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                                over
                                  ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                                  : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                              }`}
                            >
                              {over ? 'Over baseline' : 'Under control'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default BudgetScreen;
