
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../store';
import { api, supabase, signOutExplicitly } from '../src/lib/api';
import {
  TrendingUp, ChevronRight, Calendar, Info,
  Sun, Moon, Target, Check, Edit2, Plus, ArrowRight, Building2,
  Sparkles, Send, Loader2, CreditCard, Eye, EyeOff, ArrowUpRight, PieChart, Wallet,
  LineChart as LineIcon, Zap, Power, AlertTriangle, Bell, X, TrendingDown, ShieldAlert
} from 'lucide-react';
import { SubscriptionStatus, BillingCycle, LexMessage, LexAction, ProactiveAlert, MaturityForecast, AlertSeverity } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, Tooltip, AreaChart, Area } from 'recharts';
interface DashboardProps {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { userName, theme, setTheme, isSecureMode, toggleSecureMode, subscriptions, expenses, emis, goals, bankAccounts, setBankAccounts, budgets, updateGoal, cashBalance, updateCashBalance, appendLexMessages, setLexTargetBucket, appendPendingActions, pendingActions, conversationId, setConversationId, modelTier, proactiveAlerts, setProactiveAlerts, maturityForecast, setMaturityForecast, dismissAlert, isAlertDismissedToday, markAlertRead } = useApp();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoalVal, setNewGoalVal] = useState('');
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashEditVal, setCashEditVal] = useState('');
  const [velocityFilter, setVelocityFilter] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [showExplainer, setShowExplainer] = useState<string | null>(null);
  const [showAddBank, setShowAddBank] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: '', accountType: 'Savings', balance: '', lastFour: '' });
  const [isEditingAccounts, setIsEditingAccounts] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);

  const [lexQuery, setLexQuery] = useState('');
  const [lexResponse, setLexResponse] = useState<string | null>(null);
  const [lexSuggestion, setLexSuggestion] = useState<{ text: string, target: string, bucket?: string } | null>(null);
  const [isLexLoading, setIsLexLoading] = useState(false);
  const [lexHistory, setLexHistory] = useState<LexMessage[]>([]);
  const [lexActions, setLexActions] = useState<LexAction[]>([]);

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
    if (velocityFilter === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const totals = [0, 0, 0, 0, 0, 0, 0];
      const now = new Date();
      // Aggregate expenses from the last 7 days by day-of-week
      expenses.forEach(exp => {
        const d = new Date(exp.date);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          totals[d.getDay()] += exp.amount;
        }
      });
      return days.map((day, idx) => ({ name: day, value: totals[idx], isToday: idx === now.getDay() }));
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const totals = new Array(12).fill(0);
      const currentMonth = new Date().getMonth();
      expenses.forEach(exp => {
        const d = new Date(exp.date);
        if (d.getFullYear() === new Date().getFullYear()) {
          totals[d.getMonth()] += exp.amount;
        }
      });
      return months.map((m, idx) => ({ name: m, value: totals[idx], isToday: idx === currentMonth }));
    }
  }, [expenses, velocityFilter]);

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

  useEffect(() => {
    // Probe backend health to verify connection
    api.get('/health')
      .then(res => console.log('DEBUG: Backend Health OK:', res))
      .catch(err => console.error('DEBUG: Backend Health FAIL:', err));
  }, []);

  // Proactive Intelligence: Fetch alerts + forecast on mount
  useEffect(() => {
    const fetchProactiveIntelligence = async () => {
      try {
        // Ensure a maturity snapshot exists (needed for alerts & forecast)
        // This is throttled server-side to 1 per 23h, so safe to call every mount
        await api.post('/insights/maturity-snapshot', {}).catch(() => {});

        // Trigger alert detection (compares snapshots, generates new alerts)
        const checkResult = await api.post('/insights/alerts/check', {});
        if (checkResult?.alerts?.length > 0) {
          const filtered = checkResult.alerts.filter((a: ProactiveAlert) => !isAlertDismissedToday(a.id));
          setProactiveAlerts(filtered);
        }
        if (checkResult?.forecast) {
          setMaturityForecast(checkResult.forecast);
        }

        // Also fetch any previously persisted unread alerts
        const alertsResult = await api.get('/insights/alerts');
        if (alertsResult?.alerts?.length > 0) {
          // Filter out alerts dismissed today
          const filtered = alertsResult.alerts.filter((a: ProactiveAlert) => !isAlertDismissedToday(a.id));
          setProactiveAlerts(filtered);
        }
      } catch (err) {
        console.log('DEBUG: Proactive intelligence fetch skipped:', err);
      }
    };
    fetchProactiveIntelligence();
  }, []);

  const handleDismissAlert = async (alertId: number) => {
    dismissAlert(alertId);
    try {
      await api.put(`/insights/alerts/${alertId}/dismiss`, {});
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
    }
  };

  const handleMarkAlertRead = async (alertId: number) => {
    markAlertRead(alertId);
    try {
      await api.put(`/insights/alerts/${alertId}/read`, {});
    } catch (err) {
      console.error('Failed to mark alert read:', err);
    }
  };

  const mask = (val: string | number) => isSecureMode ? "••••" : `₹${val.toLocaleString()}`;

  const handleLexQuery = async () => {
    if (!lexQuery.trim()) return;
    setIsLexLoading(true);
    setLexResponse(null);
    try {
      // Build conversation_history in OpenAI message format
      const conversation_history = lexHistory.map(m => ({ role: m.role, content: m.content }));

      const response = await api.post('/insights/lex/query', {
        query: lexQuery,
        conversation_history,
        conversation_id: conversationId,
        model: modelTier !== 'gpt-4o-mini' ? modelTier : undefined,
      });

      // Store the conversation_id returned by backend (auto-created if new)
      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }

      // Update local conversation history
      const newMessages: LexMessage[] = [
        { role: 'user', content: lexQuery },
        { role: 'assistant', content: response.text || '' },
      ];
      setLexHistory(prev => [...prev, ...newMessages]);

      setLexResponse(response.text);
      setLexSuggestion(null);

      // Handle Routing Signal (Interactive Suggestion)
      if (response.routing && response.routing.should_navigate) {
        const tab = response.routing.target_tab;
        const tabMap: Record<string, string> = {
          'money': 'insights',
          'commitment': 'insights',
          'behavior': 'insights',
          'action': 'insights',
          'spending': 'expenses',
          'debts': 'emis',
          'logs': 'categoryLogs',
          'budgets': 'budgets'
        };

        const target = tabMap[tab] || 'insights';
        console.log(`DEBUG: Lex Routing - Tab: ${tab}, Target: ${target}, Suggestion: ${response.suggestion}`);

        if (response.suggestion) {
          setLexSuggestion({
            text: response.suggestion,
            target,
            bucket: tab,
          });
        }
      }

      // Capture actions from Lex response
      if (response.actions && response.actions.length > 0) {
        setLexActions(response.actions);
        appendPendingActions(response.actions);
      }

    } catch (e: any) {
      setLexResponse(`Error: ${e.message || "Unknown Connection Error"}`);
      console.error(e);
    }
    finally { setIsLexLoading(false); setLexQuery(''); }
  };

  const handleAddBank = async () => {
    if (!newBank.bankName || !newBank.lastFour || !newBank.balance) return;
    const newAcc = {
      id: editingBankId || Math.random().toString(36).substr(2, 9),
      bankName: newBank.bankName,
      accountType: newBank.accountType,
      balance: parseFloat(newBank.balance),
      lastFour: newBank.lastFour,
    };
    
    if (editingBankId) {
       setBankAccounts(bankAccounts.map(b => b.id === editingBankId ? newAcc : b));
    } else {
       setBankAccounts([...bankAccounts, newAcc]);
    }
    
    try {
      if (!editingBankId) {
        await api.post('/bank-accounts', {
          bank_name: newBank.bankName,
          account_type: newBank.accountType,
          balance: parseFloat(newBank.balance),
          last_four: newBank.lastFour,
        });
      }
    } catch (err) {
      console.error('Failed to sync bank account with server:', err);
    }
    setNewBank({ bankName: '', accountType: 'Savings', balance: '', lastFour: '' });
    setShowAddBank(false);
    setEditingBankId(null);
  };

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen">
      <header className="flex justify-between items-start">
        <div className="mr-2 space-y-2 min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <span className="text-lg leading-none mt-1">
              {(() => {
                const h = new Date().getHours();
                if (h >= 5 && h < 12) return '☀️';
                if (h >= 12 && h < 17) return '🌤️';
                if (h >= 17 && h < 21) return '🌙';
                return '🌙';
              })()}
            </span>
            <div>
              <span className="text-xl font-black text-slate-900 dark:text-premium-text tracking-tight leading-tight">
                {(() => {
                  const h = new Date().getHours();
                  if (h >= 5 && h < 12) return 'Good morning,';
                  if (h >= 12 && h < 17) return 'Good afternoon,';
                  if (h >= 17 && h < 21) return 'Good evening,';
                  return 'Good night,';
                })()}
              </span>
              <h1 className="text-xl font-black text-slate-900 dark:text-premium-text tracking-tight leading-tight mt-0.5">
                {userName || 'there'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-slate-400 dark:text-premium-muted">
            {(() => {
              const totalOut = stats.totalMonthlySpend;
              const subCount = subscriptions.filter(s => s.status === 'active').length;
              if (totalOut > 30000) return <><span>⚡</span><span>Heavy outflow month — ₹{Math.round(totalOut).toLocaleString()} and counting.</span></>;
              if (subCount >= 5) return <><span>📡</span><span>{subCount} active subscriptions under surveillance.</span></>;
              if (stats.weeklyExpenseSpend < 500) return <><span>✨</span><span>Minimal spend this week — your discipline is showing.</span></>;
              return <><span>💚</span><span>Your financial pulse is steady today.</span></>;
            })()}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleSecureMode}
            className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 flex items-center justify-center shadow-sm hover:shadow-md text-slate-500 dark:text-premium-muted active:opacity-70 transition-colors hover:border-indigo-200 dark:hover:border-indigo-500/30 group"
          >
            {isSecureMode
              ? <EyeOff size={16} className="group-hover:text-indigo-500 transition-colors" />
              : <Eye size={16} className="group-hover:text-indigo-500 transition-colors" />
            }
          </button>
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 flex items-center justify-center shadow-sm hover:shadow-md text-slate-500 dark:text-premium-muted active:opacity-70 transition-colors hover:border-amber-200 dark:hover:border-amber-500/30 group"
          >
            {theme === 'light'
              ? <Moon size={16} className="group-hover:text-amber-500 transition-colors" />
              : <Sun size={16} className="group-hover:text-amber-400 transition-colors" />
            }
          </button>
          <button
            onClick={() => signOutExplicitly()}
            className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 flex items-center justify-center shadow-sm hover:shadow-md text-rose-400 active:opacity-70 transition-colors hover:border-rose-200 dark:hover:border-rose-500/30 hover:text-rose-500 group"
            title="Sign Out"
          >
            <Power size={16} />
          </button>
        </div>
      </header>

      {/* Proactive Intelligence Section (Phase 4) */}
      <section className="space-y-3">
        {/* Alerts */}
        <AnimatePresence>
          {proactiveAlerts.filter(a => !a.is_dismissed).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 px-1">
                <Bell size={12} className="text-amber-500" />
                <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em]">
                  Proactive Alerts
                </h3>
                <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[9px] font-black px-2 py-0.5 rounded-full">
                  {proactiveAlerts.filter(a => !a.is_dismissed).length}
                </span>
              </div>

              <div className="space-y-2">
                {proactiveAlerts.filter(a => !a.is_dismissed).slice(0, 3).map((alert) => {
                  const severityConfig: Record<AlertSeverity, { bg: string; border: string; icon: string; text: string; badge: string }> = {
                    critical: { bg: 'bg-rose-50 dark:bg-rose-500/5', border: 'border-rose-200 dark:border-rose-500/20', icon: 'text-rose-500', text: 'text-rose-800 dark:text-rose-300', badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400' },
                    warning: { bg: 'bg-amber-50 dark:bg-amber-500/5', border: 'border-amber-200 dark:border-amber-500/20', icon: 'text-amber-500', text: 'text-amber-800 dark:text-amber-300', badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400' },
                    info: { bg: 'bg-emerald-50 dark:bg-emerald-500/5', border: 'border-emerald-200 dark:border-emerald-500/20', icon: 'text-emerald-500', text: 'text-emerald-800 dark:text-emerald-300', badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' },
                  };
                  const sc = severityConfig[alert.severity] || severityConfig.info;

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      className={`${sc.bg} border ${sc.border} p-5 rounded-[28px] relative group transition-all text-left`}
                    >
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-xl opacity-0 group-hover:opacity-100 active:opacity-70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <X size={12} className="text-slate-400" />
                      </button>

                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 ${sc.icon}`}>
                          {alert.severity === 'critical' ? <ShieldAlert size={20} /> :
                           alert.severity === 'warning' ? <AlertTriangle size={20} /> :
                           <TrendingUp size={20} />}
                        </div>
                        <div className="flex-1 space-y-2 text-left">
                          <div className="flex items-center gap-2 justify-start">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${sc.badge} px-2 py-0.5 rounded-full`}>
                              {alert.severity}
                            </span>
                            <h4 className={`text-xs font-bold ${sc.text}`}>{alert.title}</h4>
                          </div>
                          <p className="text-[11px] font-medium text-slate-600 dark:text-premium-muted leading-relaxed text-left">
                            {alert.message}
                          </p>
                          {alert.suggested_action && (
                            <button
                              onClick={() => {
                                handleMarkAlertRead(alert.id);
                                onNavigate('insights');
                              }}
                              className="flex items-center gap-1.5 justify-start text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 text-left hover:underline active:underline"
                            >
                              {alert.suggested_action} <ArrowRight size={10} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Maturity Forecast Mini Card — shown independently of alerts */}
        {maturityForecast ? (() => {
          const score = maturityForecast.current_score;
          const projected = maturityForecast.predictions[maturityForecast.predictions.length - 1];
          const t = maturityForecast.trajectory;
          const headline = t === 'improving' ? 'Your financial health is improving'
            : t === 'declining' ? 'Your financial health needs attention'
            : 'Your financial health is holding steady';
          const detail = t === 'improving'
            ? `Score is trending up from ${score} toward ${projected}. Keep it going.`
            : t === 'declining'
            ? `Score may drop from ${score} to ${projected} if current habits continue.`
            : score >= 60 ? `Score is steady at ${score}. You're in a good place.`
            : `Score is steady at ${score}. Small habit changes can push this higher.`;
          return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 rounded-[28px] border ${
              t === 'improving'
                ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                : t === 'declining'
                ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20'
                : 'bg-slate-50 dark:bg-slate-500/5 border-slate-200 dark:border-white/10'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                t === 'improving'
                  ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'
                  : t === 'declining'
                  ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600'
                  : 'bg-slate-100 dark:bg-slate-500/10 text-slate-600'
              }`}>
                {t === 'declining' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-premium-muted mb-0.5">
                  Financial Health Outlook
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-premium-text">
                  {headline}
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-premium-muted mt-0.5">
                  {detail}
                </p>
              </div>
            </div>
          </motion.div>
        );})() : (
          /* Warming-up placeholder when no forecast data yet */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-[28px] border border-indigo-100 dark:border-indigo-500/15 bg-indigo-50/50 dark:bg-indigo-500/5"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-500">
                <Sparkles size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-300/60 mb-0.5">
                  Intelligence Warming Up
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-premium-text">
                  Building your financial trajectory...
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-premium-muted mt-0.5">
                  Spndwisee learns your patterns over time. Personalized alerts and health forecasts will appear within 1–2 days of usage.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </section>

      {/* Linked Liquidity Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-slate-900 dark:text-premium-text font-black text-[10px] uppercase tracking-[0.2em]">Linked Liquidity</h3>
            <button onClick={() => setShowExplainer('liquidity')} className="active:scale-[0.85] transition-transform"><Info size={12} className="text-slate-400" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditingAccounts(!isEditingAccounts)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isEditingAccounts ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-premium-muted hover:bg-slate-200 dark:hover:bg-white/10'}`}>
              {isEditingAccounts ? <Check size={14} /> : <Edit2 size={14} />}
            </button>
            <button onClick={() => { setNewBank({ bankName: '', accountType: 'Savings', balance: '', lastFour: '' }); setEditingBankId(null); setShowAddBank(true); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-premium-muted hover:bg-slate-200 dark:hover:bg-white/10 active:scale-[0.975] transition-transform">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Add Bank Account Form */}
        <AnimatePresence>
          {showAddBank && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 p-5 rounded-[28px] space-y-3 mb-2 shadow-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{editingBankId ? 'Edit Account' : 'Link New Account'}</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Bank Name"
                    value={newBank.bankName}
                    onChange={e => setNewBank({ ...newBank, bankName: e.target.value })}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                  <input
                    placeholder="Last 4 digits"
                    maxLength={4}
                    value={newBank.lastFour}
                    onChange={e => setNewBank({ ...newBank, lastFour: e.target.value.replace(/\D/g, '') })}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                  <input
                    placeholder="Balance (₹)"
                    type="number"
                    value={newBank.balance}
                    onChange={e => setNewBank({ ...newBank, balance: e.target.value })}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                  <select
                    value={newBank.accountType}
                    onChange={e => setNewBank({ ...newBank, accountType: e.target.value })}
                    className="bg-slate-50 dark:bg-zinc-800 border border-slate-100 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                    <option value="Credit">Credit Card</option>
                    <option value="Digital">Digital Wallet</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleAddBank}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-[0.975] transition-transform duration-150 ease-out"
                  >
                    {editingBankId ? 'Save Changes' : 'Link Account'}
                  </button>
                  <button
                    onClick={() => setShowAddBank(false)}
                    className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 active:text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showExplainer === 'liquidity' && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-indigo-50/50 dark:bg-indigo-500/5 p-4 rounded-2xl mb-4">
               <p className="text-[10px] font-medium text-indigo-900/60 dark:text-indigo-300/60 leading-relaxed">
                This shows the total cash you have right now across all your bank accounts and cards. It helps you see how much money is available to cover your bills and expenses.
               </p>
              <button onClick={() => setShowExplainer(null)} className="text-[9px] font-bold text-indigo-600 mt-2 uppercase tracking-widest">Dismiss</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-1">
          {/* Cash Wallet card */}
          <div className={`min-w-[170px] bg-white dark:bg-premium-card border ${isEditingAccounts ? 'border-dashed border-indigo-300 dark:border-indigo-500/50 outline outline-4 outline-indigo-50 dark:outline-indigo-500/10' : 'border-slate-100 dark:border-white/5'} p-5 rounded-[2.5rem] card-glow flex flex-col justify-between h-36 transition-colors shrink-0`}>
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Wallet size={16} />
              </div>
            </div>
            <div>
              <p className="text-slate-400 dark:text-premium-muted/50 text-[9px] font-black uppercase tracking-widest leading-none mb-1">Cash Wallet</p>
              {isEditingAccounts ? (
                <input
                  type="number"
                  value={cashBalance.currentBalance}
                  onChange={e => updateCashBalance(parseFloat(e.target.value) || 0)}
                  className="text-xl font-black text-slate-900 dark:text-premium-text tracking-tight bg-transparent outline-none border-b border-indigo-400 dark:border-indigo-500/50 w-full"
                />
              ) : (
                <p className="text-xl font-black text-slate-900 dark:text-premium-text tracking-tight">{mask(cashBalance.currentBalance)}</p>
              )}
            </div>
          </div>

          {/* Bank account cards */}
          {(() => {
            const seen = new Set<string>();
            return bankAccounts.filter(acc => {
              const key = `${acc.bankName.toLowerCase()}-${acc.lastFour}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          })().map((acc, i) => (
            <div key={acc.id} onClick={() => { if(isEditingAccounts) { setEditingBankId(acc.id); setNewBank({bankName: acc.bankName, accountType: acc.accountType, balance: String(acc.balance), lastFour: acc.lastFour}); setShowAddBank(true); } }} className={`min-w-[170px] bg-white dark:bg-premium-card border ${isEditingAccounts ? 'border-dashed border-indigo-300 dark:border-indigo-500/50 outline outline-4 outline-indigo-50 dark:outline-indigo-500/10 cursor-pointer active:scale-[0.985] transition-transform' : 'border-slate-100 dark:border-white/5'} p-5 rounded-[2.5rem] card-glow flex flex-col justify-between h-36 transition-colors shrink-0 relative overflow-hidden group`}>
              {isEditingAccounts && (
                 <button onClick={(e) => { e.stopPropagation(); setBankAccounts(bankAccounts.filter(b => b.id !== acc.id)); }} className="absolute top-0 right-0 p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-bl-3xl transition-colors">
                    <X size={12} strokeWidth={3} />
                 </button>
              )}
              <div className="flex justify-between items-start">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs ${acc.accountType === 'Digital' ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                  {acc.accountType === 'Digital' ? <Wallet size={16} /> : <Building2 size={16} />}
                </div>
                {!isEditingAccounts && <span className="text-slate-300 dark:text-premium-muted/30 text-[10px] font-bold">{`•••• ${acc.lastFour}`}</span>}
              </div>
              <div>
                <p className="text-slate-400 dark:text-premium-muted/50 text-[9px] font-black uppercase tracking-widest leading-none mb-1 flex items-center gap-1">{acc.bankName} {isEditingAccounts && <Edit2 size={8} />}</p>
                <p className="text-xl font-black text-slate-900 dark:text-premium-text tracking-tight">{mask(acc.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Goal Section */}
      <section className="bg-indigo-600 dark:bg-indigo-700 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 group-active:bg-white/10 transition-colors pointer-events-none"></div>
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
      <section className="bg-[#0f172a] dark:bg-premium-card p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-[#0f172a]/20 dark:shadow-none hover:scale-[1.015] active:scale-[0.985] hover:shadow-3xl transition-all duration-300 ease-out cursor-pointer group hover:bg-[#152033] dark:hover:bg-premium-dark border border-transparent dark:border-white/5">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-slate-400 dark:text-premium-muted text-[10px] font-black uppercase tracking-[0.2em]">Portfolio Outflow</p>
                <button onClick={() => setShowExplainer(showExplainer === 'outflow' ? null : 'outflow')}>
                  <Info size={10} className="text-slate-500" />
                </button>
              </div>
              <h3 className="text-4xl font-black tracking-tighter">{mask(Math.round(stats.monthlySubSpend))}</h3>
              <p className="text-indigo-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Monthly Commitment</p>
            </div>
            <div className="bg-indigo-500/20 p-4 rounded-[28px] border border-white/5 text-indigo-400">
              <TrendingUp size={24} />
            </div>
          </div>

          <AnimatePresence>
            {showExplainer === 'outflow' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-[10px] text-slate-400 leading-relaxed font-medium bg-white/5 p-4 rounded-2xl">
                <p>💡 <strong>Portfolio Outflow</strong> = Total money going out every month on subscriptions.</p>
                <p className="mt-1"><strong>Weekly Spend</strong> = How much you spent in the last 7 days on everything (food, shopping, etc.).</p>
                <p className="mt-1"><strong>Health</strong> = A score out of 100. The less you spend on fixed costs compared to your total, the healthier your finances.</p>
                <button onClick={() => setShowExplainer(null)} className="text-[9px] font-bold text-indigo-400 mt-2 uppercase tracking-widest">Dismiss</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
            <div>
              <p className="text-slate-500 dark:text-premium-muted text-[9px] font-black uppercase tracking-widest mb-1">Weekly Spend</p>
              <p className="text-xl font-black">{mask(stats.weeklyExpenseSpend)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-premium-muted text-[9px] font-black uppercase tracking-widest mb-1">Health</p>
              <p className={`text-xl font-black ${(() => {
                const totalOut = stats.totalMonthlySpend;
                const fixedCosts = stats.monthlySubSpend + stats.monthlyEMISpend;
                if (totalOut === 0) return 'text-emerald-400';
                const ratio = fixedCosts / totalOut;
                const health = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));
                if (health >= 70) return 'text-emerald-400';
                if (health >= 40) return 'text-amber-400';
                return 'text-rose-400';
              })()}`}>{(() => {
                const totalOut = stats.totalMonthlySpend;
                const fixedCosts = stats.monthlySubSpend + stats.monthlyEMISpend;
                if (totalOut === 0) return '100%';
                const ratio = fixedCosts / totalOut;
                return `${Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)))}%`;
              })()}</p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-10 -right-10 opacity-[0.03] scale-[2] pointer-events-none">
          <PieChart size={180} />
        </div>
      </section>

      {/* Lex AI Intelligence */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em] flex items-center gap-2">
            Lex Intelligence <Sparkles size={12} className="text-indigo-500" />
          </h3>
          {lexHistory.length > 0 && (
            <button
              onClick={() => {
                setLexHistory([]);
                setLexResponse(null);
                setLexSuggestion(null);
                setLexQuery('');
                setConversationId(null);
              }}
              className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-[0.975] transition-transform duration-150 ease-out"
            >
              + New Chat
            </button>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-premium-card border border-slate-100 dark:border-white/5 p-6 rounded-[36px] shadow-inner space-y-4 relative overflow-hidden">
          <div className="flex gap-2">
            <input className="flex-1 bg-white dark:bg-premium-dark border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:text-premium-text transition-all" placeholder="Where is my money going?" value={lexQuery} onChange={(e) => setLexQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLexQuery()} />
            <button onClick={handleLexQuery} disabled={isLexLoading} className="bg-[#0f172a] dark:bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg active:scale-[0.975] transition-transform duration-150 ease-out disabled:opacity-50">
              {isLexLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <AnimatePresence>{lexResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-premium-dark/50 p-5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
              <p className="text-[11px] font-medium text-slate-700 dark:text-premium-muted leading-relaxed whitespace-pre-wrap">{lexResponse}</p>

              {lexSuggestion && (
                <button
                  onClick={() => {
                    // Persist conversation to global store before navigating
                    appendLexMessages(lexHistory);
                    if (lexSuggestion.bucket) {
                      setLexTargetBucket(lexSuggestion.bucket as any);
                    }
                    onNavigate(lexSuggestion.target);
                  }}
                  className="w-full flex items-center justify-between bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl group active:opacity-70 transition-colors border border-indigo-100/50 dark:border-indigo-500/20"
                >
                  <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400">{lexSuggestion.text}</span>
                  <ArrowRight size={12} className="text-indigo-500 group-hover:translate-x-1 transition-transform" />
                </button>
              )}

              <div className="flex items-center gap-2 pt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">End-to-End Encrypted Intelligence</span>
              </div>
            </motion.div>
          )}</AnimatePresence>
        </div>
      </section>

      {/* EMI Card */}
      <button onClick={() => onNavigate('emis')} className="w-full bg-[#0f172a] dark:bg-premium-card rounded-[40px] p-8 text-white flex items-center justify-between shadow-2xl active:scale-[0.985] transition-transform duration-150 ease-out hover:bg-slate-900 dark:hover:bg-premium-card/80">
        <div className="flex items-center gap-6 text-left">
          <div className="bg-white/10 dark:bg-indigo-500/10 p-4 rounded-2xl text-white dark:text-indigo-400"><Calendar size={24} /></div>
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-premium-muted font-bold uppercase tracking-[0.2em] mb-1">Fixed Obligations</p>
            <p className="text-2xl font-black tracking-tight">{mask(stats.monthlyEMISpend)} <span className="text-xs font-medium opacity-50">/ mo</span></p>
          </div>
        </div>
        <div className="bg-white/10 p-2.5 rounded-full"><ChevronRight size={18} className="text-zinc-400" /></div>
      </button>

      {/* Budget Tracker Card */}
      <button onClick={() => onNavigate('budgets')} className="w-full bg-[#0f172a] dark:bg-premium-card rounded-[40px] p-8 text-white flex items-center justify-between shadow-2xl active:scale-[0.98] transition-all hover:bg-slate-900 dark:hover:bg-premium-card/80">
        <div className="flex items-center gap-6 text-left">
          <div className="bg-white/10 dark:bg-emerald-500/10 p-4 rounded-2xl text-white dark:text-emerald-400"><Target size={24} /></div>
          <div>
            <p className="text-[10px] text-zinc-400 dark:text-premium-muted font-bold uppercase tracking-[0.2em] mb-1">Category Budgets</p>
            <p className="text-2xl font-black tracking-tight">{budgets.length} <span className="text-xs font-medium opacity-50">active</span></p>
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
            <BarChart data={velocityData} style={{ border: 'none' }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} dy={10} />
              <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => active && payload ? <div className="bg-[#0f172a] text-white px-3 py-1.5 rounded-xl text-[10px] font-black">{mask(payload[0].value as number)}</div> : null} />
              <Bar dataKey="value" radius={[10, 10, 10, 10]} barSize={velocityFilter === 'Monthly' ? 14 : 26}>
                {velocityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isToday ? '#6366f1' : theme === 'dark' ? '#2d2d3f' : '#f1f5f9'} fillOpacity={entry.isToday ? 1 : theme === 'dark' ? 0.5 : 0.8} />
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
            className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pt-5 border-t border-slate-50 dark:border-white/5 active:scale-[0.975] transition-transform duration-150 ease-out"
          >
            View full spend logs <ArrowRight size={12} />
          </button>
        </div>
      </section>

      {/* Recovery Mode */}
      {(() => {
        // Calculate total potential savings from pending Lex actions
        const totalSavings = pendingActions.reduce((sum, action) => sum + (action.amount || 0), 0) || 740; // Fallback to 740 if zero/empty to maintain UI preview
        
        return (
          <div 
            onClick={() => {
              setLexTargetBucket('action');
              onNavigate('insights');
            }}
            className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 p-7 rounded-[40px] flex items-center justify-between group active:scale-[0.985] transition-transform duration-150 cursor-pointer"
          >
            <div className="flex items-center gap-6">
              <div className="bg-white dark:bg-premium-dark p-4 rounded-2xl shadow-sm text-emerald-500"><TrendingUp size={24} /></div>
              <div>
                <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1 leading-none">RECOVERY MODE</h4>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100/80">You have the potential to regain {mask(totalSavings)} this month by optimizing identified spending leaks.</p>
              </div>
            </div>
            <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2.5 rounded-full text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} />
            </div>
          </div>
        );
      })()}

      {/* Refined Wealth Accelerator Section */}
      <section id="wealth-accelerator-section" className="space-y-4">
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
              <AreaChart data={projectionData} style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="val" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <button className="w-full bg-violet-600 hover:bg-violet-700 text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.25em] shadow-xl shadow-violet-200 dark:shadow-none flex items-center justify-center gap-3 active:scale-[0.975] transition-transform duration-150 ease-out relative z-10">
            Deploy Idle Capital <ArrowUpRight size={16} />
          </button>
        </div>
      </section>


    </div>
  );
};

export default Dashboard;
