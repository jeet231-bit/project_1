
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../store';
import { api } from '../src/lib/api';
import { LexMessage, LexAction, ActionResult, ProactiveAlert, AlertSeverity } from '../types';
import {
  TrendingUp, Sparkles, Target, Zap, CircleAlert, CheckCircle2, XCircle, AlertTriangle,
  Send, Loader2, Info, ArrowRight, BrainCircuit, Activity, LineChart,
  ShieldAlert, BarChart3, Flame, Clock, Brain, ChevronDown, ChevronUp,
  Calendar, Percent, PieChart, TrendingDown, Wallet, User, Shield, Fingerprint,
  ArrowUpRight, ArrowDownRight, History, ChevronRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart as ReLineChart, Line, CartesianGrid } from 'recharts';

interface InsightsProps {
  onNavigate: (tab: string) => void;
}

const Insights: React.FC<InsightsProps> = ({ onNavigate }) => {
  const {
    userName, subscriptions, expenses, emis, bankAccounts, isSecureMode,
    lexHistory: globalLexHistory, setLexHistory, appendLexMessages, 
    lexTargetBucket, setLexTargetBucket, clearLexSession,
    pendingActions, pastActions, actionResults, 
    setPendingActions, appendPendingActions, addPastActions, setActionResults,
    conversationId, setConversationId, modelTier,
    proactiveAlerts, dismissAlert, markAlertRead, maturityForecast
  } = useApp();
  const [lexQuery, setLexQuery] = useState('');
  const [lexResponse, setLexResponse] = useState<string | null>(null);
  const [isLexLoading, setIsLexLoading] = useState(false);
  const [activeBucket, setActiveBucket] = useState<'money' | 'commitment' | 'behavior' | 'action'>('money');
  const [localHistory, setLocalHistory] = useState<LexMessage[]>([]);
  const hasConsumedTarget = useRef(false);

  // Action execution state
  const [selectedActions, setSelectedActions] = useState<Set<number>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSummary, setExecutionSummary] = useState<string | null>(null);
  const [showPastActions, setShowPastActions] = useState(false);

  // Behavior tab expand state
  const [expandedBehavior, setExpandedBehavior] = useState<string | null>(null);
  const [showBehaviorInfo, setShowBehaviorInfo] = useState<string | null>(null);

  // Money tab info expand state
  const [showMoneyInfo, setShowMoneyInfo] = useState<string | null>(null);

  // Behavior Intelligence metrics from backend
  const [behaviorMetrics, setBehaviorMetrics] = useState<any>(null);
  const [behaviorClassification, setBehaviorClassification] = useState<any>(null);
  const [behaviorLoading, setBehaviorLoading] = useState(false);

  // Maturity history + persona evolution (Phase 3)
  const [maturityHistory, setMaturityHistory] = useState<any[]>([]);
  const [personaEvolution, setPersonaEvolution] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fetch behavior metrics from backend when behavior or money tab activates
  useEffect(() => {
    if ((activeBucket === 'behavior' || activeBucket === 'money') && !behaviorMetrics) {
      setBehaviorLoading(true);
      api.get('/insights/behavior')
        .then((res: any) => {
          if (res.status === 'ok' && res.metrics) {
            setBehaviorMetrics(res.metrics);
          }
          if (res.classification) {
            setBehaviorClassification(res.classification);
          }
        })
        .catch((err: any) => console.warn('Behavior metrics fetch failed:', err))
        .finally(() => setBehaviorLoading(false));

      // Take a maturity snapshot + fetch history
      setHistoryLoading(true);
      api.post('/insights/maturity-snapshot', {})
        .then((res: any) => {
          if (res.persona_evolution) {
            setPersonaEvolution(res.persona_evolution);
          }
        })
        .catch((err: any) => console.warn('Maturity snapshot failed:', err))
        .finally(() => {
          // After snapshot, fetch full history
          api.get('/insights/maturity-history')
            .then((res: any) => {
              if (res.status === 'ok' && res.history) {
                setMaturityHistory(res.history);
              }
            })
            .catch((err: any) => console.warn('Maturity history fetch failed:', err))
            .finally(() => setHistoryLoading(false));
        });
    }
  }, [activeBucket]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch recommended actions when Action tab is active and empty
  useEffect(() => {
    if (activeBucket === 'action' && pendingActions.length === 0) {
      api.get('/actions/recommend')
        .then((res: any) => {
          if (res.status === 'ok' && res.actions?.length > 0) {
            appendPendingActions(res.actions);
          }
        })
        .catch((err: any) => console.warn('Action recommendations fetch failed:', err));
    }
  }, [activeBucket]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: consume global state passed from Dashboard
  useEffect(() => {
    if (!hasConsumedTarget.current) {
      // Restore conversation history from global store
      if (globalLexHistory.length > 0) {
        setLocalHistory(globalLexHistory);
        // Show the last assistant message as the current response
        const lastAssistant = [...globalLexHistory].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) setLexResponse(lastAssistant.content);
      }
      // Auto-navigate to the target bucket
      if (lexTargetBucket && ['money', 'commitment', 'behavior', 'action'].includes(lexTargetBucket)) {
        setActiveBucket(lexTargetBucket as any);
        setLexTargetBucket(null); // consume it
      }
      hasConsumedTarget.current = true;
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const scatterData = subscriptions.map((s, i) => {
    // Compute a deterministic utility score from subscription properties
    // so dots spread across the X axis instead of stacking at x=50
    const categoryScores: Record<string, number> = {
      'Productivity': 85, 'Cloud': 75, 'Health': 80, 'Education': 90,
      'Entertainment': 45, 'Shopping': 35, 'Music': 55, 'Other': 50,
    };
    const baseScore = categoryScores[s.category] || 50;
    // Use name hash to add per-subscription variation
    const nameHash = s.name.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
    const variation = ((nameHash * 7 + i * 13) % 30) - 15; // ±15 spread
    const utilityScore = Math.max(5, Math.min(95, baseScore + variation));
    return {
      name: s.name,
      x: utilityScore,
      y: s.amount / 100,
      z: 100,
    };
  });

  const mask = (val: string | number) => isSecureMode ? "••••" : `₹${typeof val === 'number' ? val.toLocaleString() : val}`;

  const IntelligenceBucket = ({ id, label, icon: Icon }: { id: typeof activeBucket, label: string, icon: any }) => (
    <button
      onClick={() => setActiveBucket(id)}
      className={`flex flex-col items-center gap-2 p-4 rounded-3xl transition-all ${activeBucket === id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white dark:bg-premium-card text-slate-400 dark:text-premium-muted border border-slate-50 dark:border-white/5'}`}
    >
      <Icon size={20} />
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );

  const handleLexQuery = async () => {
    if (!lexQuery.trim()) return;
    setIsLexLoading(true);
    setLexResponse(null);
    try {
      const conversation_history = localHistory.map(m => ({ role: m.role, content: m.content }));

      const response = await api.post('/insights/lex/query', {
        query: lexQuery,
        conversation_history,
        conversation_id: conversationId,
        model: modelTier !== 'gpt-4o-mini' ? modelTier : undefined,
      });

      // Store conversation_id from backend
      if (response.conversation_id && !conversationId) {
        setConversationId(response.conversation_id);
      }

      // Append to local + global history
      const newMessages: LexMessage[] = [
        { role: 'user', content: lexQuery },
        { role: 'assistant', content: response.text || '' },
      ];
      setLocalHistory(prev => [...prev, ...newMessages]);
      appendLexMessages(newMessages);

      setLexResponse(response.text);

      if (response.routing && response.routing.should_navigate) {
        const tab = response.routing.target_tab;
        if (['money', 'commitment', 'behavior', 'action'].includes(tab)) {
          setActiveBucket(tab as any);
        }
      }

      // Capture actions from Lex response
      if (response.actions && response.actions.length > 0) {
        appendPendingActions(response.actions);
      }
    } catch (e) { setLexResponse("I encountered an error. Please try again."); }
    finally { setIsLexLoading(false); setLexQuery(''); }
  };

  // Action execution helpers
  const toggleAction = (idx: number) => {
    setSelectedActions(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const selectAllActions = () => {
    if (selectedActions.size === pendingActions.length) setSelectedActions(new Set());
    else setSelectedActions(new Set(pendingActions.map((_, i) => i)));
  };

  const executeSelected = async () => {
    if (selectedActions.size === 0) return;
    setIsExecuting(true);
    setExecutionSummary(null);
    try {
      const actionsToRun = pendingActions.filter((_, i) => selectedActions.has(i));
      const response = await api.post('/actions/execute', { actions: actionsToRun });
      setActionResults(response.results || []);
      setExecutionSummary(response.summary || 'Execution complete.');
      
      // Calculate which ones succeeded to add to history
      const successfulLabels = new Set((response.results || []).filter((r: any) => r.status === 'success').map((r: any) => r.label));
      const successfulActions = actionsToRun.filter(a => successfulLabels.has(a.label));
      if (successfulActions.length > 0) {
        addPastActions(successfulActions);
      }

      // Remove executed actions from pending (whether success or fail for now)
      const remaining = pendingActions.filter((_, i) => !selectedActions.has(i));
      setPendingActions(remaining);
      setSelectedActions(new Set());
    } catch (e: any) {
      setExecutionSummary(`Execution error: ${e.message || 'Unknown'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-6 pt-10 space-y-10 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900 dark:text-premium-text tracking-tight">Intelligence</h1>
        <p className="text-sm font-medium text-slate-400 dark:text-premium-muted">Turning Capital Data into Human Storytelling.</p>
      </header>

      {/* Bucket Selection */}
      <div className="grid grid-cols-4 gap-3">
        <IntelligenceBucket id="money" label="Money" icon={LineChart} />
        <IntelligenceBucket id="commitment" label="Commit" icon={Activity} />
        <IntelligenceBucket id="behavior" label="Behavior" icon={BrainCircuit} />
        <IntelligenceBucket id="action" label="Action" icon={Target} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeBucket}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="space-y-8"
        >
          {activeBucket === 'money' && (() => {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const monthlyExpenses = expenses.filter(e => {
              if (!e.date) return false;
              const d = new Date(e.date);
              return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            }).reduce((sum, e) => sum + e.amount, 0);

            const activeSubsMonthly = subscriptions.filter(s => s.status === 'active').reduce((sum, s) => {
              return sum + (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount);
            }, 0);

            const activeEmisMonthly = emis.reduce((sum, e) => sum + e.monthlyAmount, 0);
            const totalMonthlyOutflow = monthlyExpenses + activeSubsMonthly + activeEmisMonthly;

            return (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="p-8 rounded-[40px] bg-indigo-600 text-white flex-1 space-y-4 shadow-xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60 flex items-center gap-1.5">
                    Money Intelligence <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'outflow' ? null : 'outflow')} className="cursor-help p-2 -m-2"><Info size={10} className="text-white/50" /></button>
                  </p>
                  <h3 className="text-3xl font-black tracking-tighter">₹{Math.round(totalMonthlyOutflow).toLocaleString()}</h3>
                  <p className="text-[9px] font-bold opacity-60 uppercase">Total computed outflow for this month.</p>
                  <AnimatePresence>
                    {showMoneyInfo === 'outflow' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="text-[10px] font-medium leading-relaxed text-white/70">Sum of all expenses, active subscriptions (annuals prorated monthly), and fixed EMIs for the current calendar month.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* ══ Financial Maturity Index — Hero Card ══ */}
              {behaviorLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-indigo-500" />
                  <span className="ml-3 text-[10px] font-bold text-slate-400">Loading intelligence...</span>
                </div>
              )}
              {!behaviorLoading && behaviorMetrics?.financial_maturity && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-[40px] p-8 text-white shadow-2xl relative"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-400/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-2 mb-5">
                    <Brain size={16} className="text-indigo-200" />
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-200 flex items-center gap-1.5">
                      Financial Maturity Index <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'maturity' ? null : 'maturity')} className="cursor-help p-2 -m-2"><Info size={10} className="text-indigo-300/60" /></button>
                    </p>
                  </div>
                  <AnimatePresence>
                    {showMoneyInfo === 'maturity' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-4">
                        <p className="text-[10px] font-medium leading-relaxed text-indigo-200/80">A composite score (0–100) computed from spend consistency, category diversification, subscription burden, and savings behavior over the past 90 days.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="flex items-end gap-4 mb-4">
                    <span className="text-6xl font-black tracking-tighter leading-none">{behaviorMetrics.financial_maturity.maturity_index}</span>
                    <div className="mb-2">
                      <p className="text-sm font-black leading-tight">
                        {behaviorClassification?.maturity_label || behaviorMetrics.financial_maturity.classification}
                      </p>
                      {behaviorClassification?.maturity_tone && (
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${behaviorClassification.maturity_tone === 'positive' ? 'text-emerald-300' :
                            behaviorClassification.maturity_tone === 'critical' ? 'text-rose-300' :
                              behaviorClassification.maturity_tone === 'cautionary' ? 'text-amber-300' :
                                'text-indigo-200'
                          }`}>{behaviorClassification.maturity_tone}</p>
                      )}
                    </div>
                  </div>
                  {/* Component breakdown mini-bars */}
                  <div className="grid grid-cols-5 gap-1.5 mt-4">
                    {Object.entries(behaviorMetrics.financial_maturity.components || {}).map(([key, val]: [string, any]) => (
                      <div key={key} className="space-y-1">
                        <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-white/60" style={{ width: `${val}%` }} />
                        </div>
                        <p className="text-[7px] font-bold text-indigo-200 uppercase tracking-wider text-center truncate">
                          {key.replace(/_/g, ' ').replace('spend ', '').replace('category ', '')}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Strengths & Weaknesses tags */}
                  <div className="flex flex-wrap gap-1.5 mt-5">
                    {behaviorMetrics.financial_maturity.strengths?.map((s: string, i: number) => (
                      <span key={`s-${i}`} className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-[8px] font-black text-emerald-200 uppercase tracking-wider">{s}</span>
                    ))}
                    {behaviorMetrics.financial_maturity.weaknesses?.map((w: string, i: number) => (
                      <span key={`w-${i}`} className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-[8px] font-black text-rose-200 uppercase tracking-wider">{w}</span>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* ══ Supporting Signals ══ */}
              {!behaviorLoading && behaviorMetrics && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                  className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] p-6 shadow-sm"
                >
                  <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5">
                    Supporting Signals <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'signals' ? null : 'signals')} className="cursor-help p-2 -m-2"><Info size={10} className="text-slate-400" /></button>
                  </p>
                  <AnimatePresence>
                    {showMoneyInfo === 'signals' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Key financial behavior signals derived from your spending patterns — volatility, subscription load, category concentration, and weekend spending bias.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-premium-dark rounded-2xl p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Activity size={12} className="text-amber-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex-1">Volatility</p>
                        <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'sig-volatility' ? null : 'sig-volatility')} className="cursor-help p-2 -m-2"><Info size={9} className="text-slate-300" /></button>
                      </div>
                      <p className={`text-sm font-black ${behaviorMetrics.spend_volatility.volatility_score >= 60 ? 'text-rose-500' :
                          behaviorMetrics.spend_volatility.volatility_score >= 30 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>{behaviorMetrics.spend_volatility.classification}</p>
                      <AnimatePresence>
                        {showMoneyInfo === 'sig-volatility' && (
                          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-[9px] text-slate-400 font-medium leading-relaxed pt-1">How much your daily spending swings up and down. Lower is more consistent.</motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="bg-slate-50 dark:bg-premium-dark rounded-2xl p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Wallet size={12} className="text-rose-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex-1">Sub Burden</p>
                        <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'sig-burden' ? null : 'sig-burden')} className="cursor-help p-2 -m-2"><Info size={9} className="text-slate-300" /></button>
                      </div>
                      <p className={`text-sm font-black ${behaviorMetrics.subscription_burden.risk_level === 'Critical' ? 'text-rose-500' :
                          behaviorMetrics.subscription_burden.risk_level === 'Elevated' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>{behaviorMetrics.subscription_burden.risk_level}</p>
                      <AnimatePresence>
                        {showMoneyInfo === 'sig-burden' && (
                          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-[9px] text-slate-400 font-medium leading-relaxed pt-1">How much of your income goes to fixed subscriptions. High burden means less flexibility.</motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="bg-slate-50 dark:bg-premium-dark rounded-2xl p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <PieChart size={12} className="text-violet-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex-1">Diversity</p>
                        <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'sig-concentration' ? null : 'sig-concentration')} className="cursor-help p-2 -m-2"><Info size={9} className="text-slate-300" /></button>
                      </div>
                      <p className="text-sm font-black text-violet-500">
                        {Math.round(100 - behaviorMetrics.category_concentration.concentration_score * 100)}% Spread
                      </p>
                      <AnimatePresence>
                        {showMoneyInfo === 'sig-concentration' && (
                          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-[9px] text-slate-400 font-medium leading-relaxed pt-1">Whether your spending is spread across categories or concentrated in just a few. More spread = healthier.</motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="bg-slate-50 dark:bg-premium-dark rounded-2xl p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-cyan-500" />
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex-1">Weekend</p>
                        <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'sig-weekend' ? null : 'sig-weekend')} className="cursor-help p-2 -m-2"><Info size={9} className="text-slate-300" /></button>
                      </div>
                      <p className={`text-sm font-black ${behaviorMetrics.weekend_bias.pattern === 'Leisure-skewed' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>{behaviorMetrics.weekend_bias.pattern === 'Leisure-skewed' ? 'Weekend-heavy' : behaviorMetrics.weekend_bias.pattern}</p>
                      <AnimatePresence>
                        {showMoneyInfo === 'sig-weekend' && (
                          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-[9px] text-slate-400 font-medium leading-relaxed pt-1">Weekends are only 2 of 7 days — fair share is ~29%. If over 40% of your money goes on weekends, it's disproportionately high.</motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* ══ Maturity Trend (Money Tab — Phase 3) ══ */}
              {!behaviorLoading && maturityHistory.length > 1 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                  className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-indigo-500" />
                    <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                      Maturity Over Time <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'trend' ? null : 'trend')} className="cursor-help p-2 -m-2"><Info size={10} className="text-slate-400" /></button>
                    </p>
                  </div>
                  <AnimatePresence>
                    {showMoneyInfo === 'trend' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Historical plot of your Financial Maturity Index across periodic snapshots, showing how your financial health evolves over time.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="h-36 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart
                        data={[...maturityHistory].reverse().map((h: any) => ({
                          date: h.snapshot_at ? new Date(h.snapshot_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
                          score: h.maturity_score,
                        }))}
                        margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                      >
                        <XAxis dataKey="date" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} width={25} />
                        <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1', strokeWidth: 1, stroke: '#fff' }} />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>
              )}

              {/* ══ Maturity Forecast Card (Phase 4) ══ */}
              {maturityForecast && maturityForecast.data_points_used >= 3 ? (() => {
                // Use real-time maturity score when available, fall back to last snapshot
                const liveScore = behaviorMetrics?.financial_maturity?.maturity_index;
                const score = liveScore ?? maturityForecast.current_score;
                const projected = maturityForecast.predictions[maturityForecast.predictions.length - 1];
                const t = maturityForecast.trajectory;
                const headline = t === 'improving' ? 'Your score is trending upward'
                  : t === 'declining' ? 'Your score is trending downward'
                  : 'Your score is holding steady';
                const takeaway = t === 'improving'
                  ? `If you maintain your current habits, your score could rise from ${score} to ${projected}. The positive momentum is real — keep it up.`
                  : t === 'declining'
                  ? `At the current pace, your score could drop from ${score} to ${projected}. Consider reviewing subscriptions or reducing discretionary spend.`
                  : score >= 60
                  ? `Your score has been steady at ${score}. You're in a healthy range — incremental improvements in savings can push this even higher.`
                  : `Your score has been steady at ${score}. Small changes like cutting one subscription or reducing weekend spending can move this up meaningfully.`;
                return (
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className={`border rounded-[36px] p-6 shadow-sm space-y-4 ${t === 'improving'
                      ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                      : t === 'declining'
                        ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20'
                        : 'bg-white dark:bg-premium-card border-slate-100 dark:border-white/5'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <LineChart size={14} className={
                      t === 'improving' ? 'text-emerald-500' :
                        t === 'declining' ? 'text-rose-500' : 'text-indigo-500'
                    } />
                    <span className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                      Financial Health Outlook <button onClick={(e) => { e.stopPropagation(); setShowMoneyInfo(showMoneyInfo === 'forecast' ? null : 'forecast'); }} className="cursor-help p-1 -m-1"><Info size={12} className="text-slate-400" /></button>
                    </span>
                  </div>
                  <AnimatePresence>
                    {showMoneyInfo === 'forecast' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-1 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Based on your recent spending patterns, we project where your Financial Maturity score is heading. This updates daily as more data comes in.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-end gap-6">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Now</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-premium-text">{score}<span className="text-sm font-bold text-slate-400">/100</span></p>
                    </div>
                    <div className={`${t === 'improving' ? 'text-emerald-500' : t === 'declining' ? 'text-rose-500' : 'text-slate-400'}`}>
                      {t === 'declining' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected</p>
                      <p className={`text-2xl font-black ${t === 'improving' ? 'text-emerald-600 dark:text-emerald-400' :
                          t === 'declining' ? 'text-rose-600 dark:text-rose-400' :
                            'text-slate-900 dark:text-premium-text'
                        }`}>{projected}<span className="text-sm font-bold text-slate-400">/100</span></p>
                    </div>
                  </div>

                  <p className="text-[11px] font-medium text-slate-500 dark:text-premium-muted leading-relaxed">
                    {headline} — {takeaway}
                  </p>
                </motion.section>
              );})() : (
                /* Warming-up placeholder when forecast isn't ready yet */
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                  className="border border-indigo-100 dark:border-indigo-500/15 bg-indigo-50/50 dark:bg-indigo-500/5 rounded-[36px] p-6 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-400" />
                    <p className="text-[9px] font-black text-indigo-400 dark:text-indigo-300/60 uppercase tracking-[0.2em]">
                      Financial Health Outlook
                    </p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-premium-text">
                    Building your financial trajectory...
                  </p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-premium-muted leading-relaxed">
                    We're analyzing your spending patterns to project where your financial health is heading. This needs a few days of data — check back soon.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-indigo-100 dark:bg-indigo-500/10 h-1.5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-400 dark:bg-indigo-500/60 rounded-full"
                        initial={{ width: '0%' }}
                        animate={{ width: maturityForecast ? `${Math.min(100, (maturityForecast.data_points_used / 3) * 100)}%` : '15%' }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-indigo-400">
                      {maturityForecast ? `${maturityForecast.data_points_used}/3 days` : 'Collecting data'}
                    </span>
                  </div>
                </motion.section>
              )}

              {/* ══ Proactive Maturity Alerts (Phase 4) ══ */}
              {proactiveAlerts.filter(a => !a.is_dismissed && (a.alert_type.includes('maturity') || a.alert_type === 'maturity_forecast')).length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className="space-y-2"
                >
                  {proactiveAlerts.filter(a => !a.is_dismissed && (a.alert_type.includes('maturity') || a.alert_type === 'maturity_forecast')).map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-2xl border ${alert.severity === 'critical' ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20' :
                          alert.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20' :
                            'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${alert.severity === 'critical' ? 'text-rose-500' :
                            alert.severity === 'warning' ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                          {alert.severity === 'info' ? <TrendingUp size={16} /> : <AlertTriangle size={16} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-premium-text">{alert.title}</p>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-premium-muted mt-0.5 leading-relaxed">{alert.message}</p>
                          {alert.suggested_action && (
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1.5">→ {alert.suggested_action}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.section>
              )}

              {behaviorMetrics?.subscription_burden && (
                <div className="bg-white dark:bg-premium-card p-8 rounded-[40px] border border-slate-100 dark:border-white/5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-premium-muted flex items-center gap-1.5">
                      Subscription Burden <button onClick={() => setShowMoneyInfo(showMoneyInfo === 'sub-burden' ? null : 'sub-burden')} className="cursor-help p-2 -m-2"><Info size={10} className="text-slate-400" /></button>
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-premium-text">
                      {Math.round(behaviorMetrics.subscription_burden.burden_ratio * 100)}% of spend
                    </span>
                  </div>
                  <AnimatePresence>
                    {showMoneyInfo === 'sub-burden' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">The percentage of your total monthly spending that goes to fixed recurring subscriptions. A high ratio means most of your money is locked into commitments before you even start spending.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="w-full bg-slate-50 dark:bg-premium-dark h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${
                        behaviorMetrics.subscription_burden.risk_level === 'Critical' ? 'bg-rose-500' :
                        behaviorMetrics.subscription_burden.risk_level === 'Elevated' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, behaviorMetrics.subscription_burden.burden_ratio * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium italic">
                    {behaviorMetrics.subscription_burden.risk_level === 'Critical' 
                      ? 'Warning: Unsafe level of fixed outflows detected for your risk profile.' 
                      : 'Commitments are currently within a manageable range for your income profile.'}
                  </p>
                </div>
              )}
            </div>
          )})()}

          {activeBucket === 'commitment' && (() => {
            const totalEmi = emis.reduce((sum, e) => sum + e.monthlyAmount, 0);
            const activeSubs = subscriptions.filter(s => s.status === 'active');
            const totalSubs = activeSubs.reduce((sum, s) => sum + (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount), 0);
            const totalCommitment = totalEmi + totalSubs;

            // Find closest upcoming outflow
            const today = new Date();
            let closestItem: any = null;
            let minDays = Infinity;

            [...emis.map(e => ({ name: e.name, amount: e.monthlyAmount, date: e.dueDate })), ...activeSubs.map(s => ({ name: s.name, amount: s.amount, date: s.nextRenewalDate }))].forEach(item => {
              const date = new Date(item.date);
              if (date > today) {
                const diffTime = Math.abs(date.getTime() - today.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays < minDays) {
                  minDays = diffDays;
                  closestItem = item;
                }
              }
            });

            return (
              <div className="space-y-6">
                <div className="bg-[#0f172a] dark:bg-premium-card p-8 rounded-[40px] text-white space-y-4 shadow-xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">Commitment Intelligence</p>
                  <h3 className="text-3xl font-black tracking-tighter">₹{Math.round(totalCommitment).toLocaleString()} <span className="text-sm font-medium opacity-50">/ mo</span></h3>
                  <p className="text-[9px] font-bold opacity-60 uppercase">{activeSubs.length} active subscriptions and {emis.length} EMIs locked.</p>
                </div>
                {closestItem ? (
                  <div className="p-8 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-[40px] flex items-center gap-6">
                    <div className="bg-white dark:bg-premium-dark p-4 rounded-2xl text-amber-500"><CircleAlert size={24} /></div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Outflow Warning</h4>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-100/80">Next heavy outflow ({closestItem.name} • ₹{closestItem.amount.toLocaleString()}) is scheduled in {minDays} days.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 rounded-[40px] flex items-center gap-6">
                    <div className="bg-white dark:bg-premium-dark p-4 rounded-2xl text-emerald-500"><CheckCircle2 size={24} /></div>
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1">Clear Horizon</h4>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100/80">No upcoming fixed outflows in the immediate horizon.</p>
                    </div>
                  </div>
                )}

                {/* ══ Active EMIs ══ */}
                {emis.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] px-1">Active EMIs</p>
                    {emis.map((emi, i) => {
                      const dueDate = new Date(emi.dueDate);
                      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isUrgent = daysUntil >= 0 && daysUntil <= 7;
                      return (
                        <motion.div
                          key={emi.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{ duration: 0.4, delay: i * 0.08 }}
                          className="bg-white dark:bg-premium-card p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-4"
                        >
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isUrgent ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-slate-50 dark:bg-premium-dark text-slate-400 dark:text-premium-muted'}`}>
                            <Wallet size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 dark:text-premium-text text-sm tracking-tight truncate">{emi.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-premium-muted uppercase tracking-widest mt-0.5">
                              Due {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              {isUrgent && <span className="text-rose-500 ml-1.5">• {daysUntil}d away</span>}
                            </p>
                          </div>
                          <p className="font-black text-slate-900 dark:text-premium-text text-sm">₹{emi.monthlyAmount.toLocaleString()}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* ══ Active Subscriptions (as commitments) ══ */}
                {activeSubs.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] px-1">Recurring Subscriptions</p>
                    {activeSubs.map((sub, i) => {
                      const monthlyAmount = sub.billingCycle === 'yearly' ? Math.round(sub.amount / 12) : sub.amount;
                      return (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{ duration: 0.4, delay: i * 0.08 }}
                          className="bg-white dark:bg-premium-card p-5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-4"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0">
                            <Calendar size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-slate-900 dark:text-premium-text text-sm tracking-tight truncate">{sub.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 dark:text-premium-muted uppercase tracking-widest mt-0.5">
                              {sub.category} • {sub.billingCycle}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-900 dark:text-premium-text text-sm">₹{monthlyAmount.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">/mo</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {activeBucket === 'behavior' && (
            <div className="space-y-4">

              {/* Loading state */}
              {behaviorLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                  <span className="ml-3 text-xs font-bold text-slate-400">Computing behavioral signals...</span>
                </div>
              )}

              {!behaviorLoading && !behaviorMetrics && (
                <div className="bg-white dark:bg-premium-card p-8 rounded-[40px] border border-slate-100 dark:border-white/5 text-center space-y-3">
                  <BrainCircuit size={28} className="text-slate-300 dark:text-premium-muted/30 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 dark:text-premium-muted">No behavioral data available yet. Add expenses and subscriptions to unlock intelligence.</p>
                </div>
              )}

              {!behaviorLoading && behaviorMetrics && (<>

                {/* ══ Proactive Behavior Alerts (Phase 4) ══ */}
                {proactiveAlerts.filter(a => !a.is_dismissed && (a.alert_type.includes('burden') || a.alert_type.includes('volatility') || a.alert_type.includes('persona') || a.alert_type.includes('drift'))).length > 0 && (
                  <motion.section
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 px-1 mb-2">
                      <ShieldAlert size={12} className="text-amber-500" />
                      <span className="text-[9px] font-black text-slate-500 dark:text-premium-muted uppercase tracking-[0.2em]">Behavior Alerts</span>
                    </div>
                    {proactiveAlerts.filter(a => !a.is_dismissed && (a.alert_type.includes('burden') || a.alert_type.includes('volatility') || a.alert_type.includes('persona') || a.alert_type.includes('drift'))).map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-2xl border ${alert.severity === 'critical' ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20' :
                            alert.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20' :
                              'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${alert.severity === 'critical' ? 'text-rose-500' :
                              alert.severity === 'warning' ? 'text-amber-500' : 'text-emerald-500'
                            }`}>
                            {alert.severity === 'critical' ? <ShieldAlert size={16} /> : <AlertTriangle size={16} />}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-premium-text">{alert.title}</p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-premium-muted mt-0.5 leading-relaxed">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.section>
                )}

                {/* ══ Behavioral Persona Card ══ */}
                {behaviorMetrics.behavioral_persona && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[40px] p-7 shadow-sm space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white">
                          <Fingerprint size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center w-full">
                            <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                              Behavioral Persona <button onClick={() => setShowBehaviorInfo(showBehaviorInfo === 'persona' ? null : 'persona')} className="cursor-help p-2 -m-2"><Info size={10} className="text-slate-400" /></button>
                            </p>
                          </div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-premium-text tracking-tight leading-tight mt-0.5">
                            {behaviorClassification?.persona || behaviorMetrics.behavioral_persona.persona}
                          </h3>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                          {Math.round((behaviorClassification?.confidence || behaviorMetrics.behavioral_persona.confidence) * 100)}%
                        </div>
                        <p className="text-[8px] font-black text-slate-300 dark:text-premium-muted/30 uppercase tracking-widest">Confidence</p>
                      </div>
                    </div>
                    <AnimatePresence>
                      {showBehaviorInfo === 'persona' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2 pb-1">
                          <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Your overarching financial personality model evaluated across multi-dimensional spending factors and psychological triggers deduced from the past 90 days.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Description */}
                    <p className="text-[11px] font-medium text-slate-500 dark:text-premium-muted leading-relaxed">
                      {behaviorClassification?.behavioral_summary || behaviorMetrics.behavioral_persona.description}
                    </p>

                    {/* Traits */}
                    <div className="flex flex-wrap gap-1.5">
                      {(behaviorMetrics.behavioral_persona.traits || []).map((trait: string, i: number) => (
                        <span key={i} className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-premium-dark text-[9px] font-black text-slate-500 dark:text-premium-muted uppercase tracking-widest border border-slate-100 dark:border-white/5">{trait}</span>
                      ))}
                    </div>

                    {/* Risk Areas + Strategic Focus */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-3">
                        <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Risk</p>
                          <p className="text-xs font-bold text-slate-700 dark:text-premium-text">
                            {behaviorClassification?.primary_risk_area || behaviorMetrics.behavioral_persona.primary_risk_area}
                          </p>
                        </div>
                      </div>
                      {(behaviorClassification?.secondary_risk_area || behaviorMetrics.behavioral_persona.secondary_risk_area) !== "None detected" && (
                        <div className="flex items-start gap-3">
                          <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secondary Risk</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-premium-text">
                              {behaviorClassification?.secondary_risk_area || behaviorMetrics.behavioral_persona.secondary_risk_area}
                            </p>
                          </div>
                        </div>
                      )}
                      {behaviorClassification?.strategic_focus && (
                        <div className="flex items-start gap-3">
                          <Target size={14} className="text-indigo-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Strategic Focus</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-premium-text">{behaviorClassification.strategic_focus}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.section>
                )}

                {/* ══ Persona Evolution Banner (Phase 3) ══ */}
                {personaEvolution?.persona_changed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-[32px] p-5 shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                        <ArrowUpRight size={18} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[9px] font-black text-white/60 uppercase tracking-[0.2em]">Persona Evolution Detected</p>
                        <p className="text-sm font-black text-white leading-tight mt-1">
                          {personaEvolution.previous_persona} <span className="text-white/50 mx-2">→</span> {personaEvolution.current_persona}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-white/70 mt-3 leading-relaxed">
                      Your financial behavior has shifted. Lex has adapted its recommendations to match your new profile.
                    </p>
                  </motion.div>
                )}

                {/* ══ Risk Heatmap (Phase 3) ══ */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-indigo-500" />
                      <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                        Risk Heatmap <button onClick={() => setShowBehaviorInfo(showBehaviorInfo === 'heatmap' ? null : 'heatmap')} className="cursor-help p-2 -m-2"><Info size={10} className="text-slate-400" /></button>
                      </p>
                    </div>
                  </div>
                  <AnimatePresence>
                    {showBehaviorInfo === 'heatmap' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed pb-3 px-1">Analyzes 5 critical vectors of financial instability ranging from impulse triggers and drift tendencies to concentrated category exposures over time.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <p className="text-[8px] font-bold text-slate-400 dark:text-premium-muted text-center uppercase tracking-widest">Risk Score /100</p>
                  <div className="grid grid-cols-5 gap-2">
                    {(() => {
                      const vol = Math.min(100, behaviorMetrics.spend_volatility?.volatility_score || 0);
                      const driftRaw = behaviorMetrics.lifestyle_drift?.drift_count || 0;
                      const drift = Math.min(100, driftRaw * 25);
                      const burden = Math.min(100, (behaviorMetrics.subscription_burden?.burden_ratio || 0) * 100);
                      const conc = Math.min(100, (behaviorMetrics.category_concentration?.concentration_score || 0) * 100);
                      const weekend = Math.min(100, (behaviorMetrics.weekend_bias?.weekend_ratio || 0) * 100);

                      const getColor = (val: number, thresholds: [number, number]) => {
                        if (val >= thresholds[1]) return { bg: 'bg-rose-500', text: 'text-white', label: 'HIGH' };
                        if (val >= thresholds[0]) return { bg: 'bg-amber-400', text: 'text-amber-900', label: 'MED' };
                        return { bg: 'bg-emerald-500', text: 'text-white', label: 'LOW' };
                      };

                      const cells = [
                        { name: 'Spending\nSwings', val: vol, ...getColor(vol, [30, 60]) },
                        { name: 'Lifestyle\nCreep', val: drift, ...getColor(drift, [25, 50]) },
                        { name: 'Sub\nLoad', val: burden, ...getColor(burden, [35, 50]) },
                        { name: 'Category\nFocus', val: conc, ...getColor(conc, [30, 50]) },
                        { name: 'Weekend\nBias', val: weekend, ...getColor(weekend, [32, 40]) },
                      ];

                      return cells.map((cell) => (
                        <div key={cell.name} className={`${cell.bg} rounded-2xl p-3 flex flex-col items-center justify-center aspect-square`}>
                          <span className={`text-[8px] font-black ${cell.text} uppercase tracking-wider`}>{cell.label}</span>
                          <span className={`text-lg font-black ${cell.text} leading-none mt-1`}>{Math.round(cell.val)}</span>
                          <span className={`text-[6px] font-bold ${cell.text} opacity-70 mt-1 text-center leading-tight whitespace-pre-line`}>{cell.name}</span>
                        </div>
                      ));
                    })()}
                  </div>
                  <div className="flex items-center justify-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /><span className="text-[8px] font-bold text-slate-400">Safe (0-29)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-[8px] font-bold text-slate-400">Watch (30-59)</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /><span className="text-[8px] font-bold text-slate-400">Alert (60+)</span></div>
                  </div>
                </motion.section>

                {/* ══ Maturity Trend Chart (Phase 3) ══ */}
                {maturityHistory.length > 1 && (
                  <motion.section
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] p-6 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History size={14} className="text-indigo-500" />
                        <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                          Maturity Trend <button onClick={() => setShowBehaviorInfo(showBehaviorInfo === 'trend' ? null : 'trend')} className="cursor-help p-2 -m-2"><Info size={10} className="text-slate-400" /></button>
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-slate-300 dark:text-premium-muted/30 uppercase tracking-widest">{maturityHistory.length} snapshots</span>
                    </div>
                    <AnimatePresence>
                      {showBehaviorInfo === 'trend' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed pb-3 px-1">Tracks your progression against the proprietary Financial Maturity Index (FMI) through behavioral snapshot points and records persona shifts over historical data.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReLineChart
                          data={[...maturityHistory].reverse().map((h: any) => ({
                            date: h.snapshot_at ? new Date(h.snapshot_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
                            score: h.maturity_score,
                            persona: h.persona,
                          }))}
                          margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} width={30} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload?.[0]) {
                                const d = payload[0].payload;
                                return (
                                  <div className="bg-[#0f172a] text-white px-4 py-2.5 rounded-2xl text-[10px] font-bold shadow-2xl space-y-0.5">
                                    <p className="font-black">{d.date}</p>
                                    <p>Score: <span className="text-indigo-300 font-black">{d.score}</span></p>
                                    <p className="text-[9px] text-slate-300">{d.persona}</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                          />
                        </ReLineChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Persona timeline */}
                    {maturityHistory.some((h: any) => h.persona_changed) && (
                      <div className="space-y-2 pt-2">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Persona Changes</p>
                        {[...maturityHistory].reverse().filter((h: any) => h.persona_changed).map((h: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[10px]">
                            <ArrowUpRight size={10} className="text-violet-500 shrink-0" />
                            <span className="font-bold text-slate-500 dark:text-premium-muted">
                              {h.previous_persona} → <span className="text-indigo-600 dark:text-indigo-400 font-black">{h.persona}</span>
                            </span>
                            <span className="text-[8px] text-slate-300 dark:text-premium-muted/30 ml-auto">
                              {h.snapshot_at ? new Date(h.snapshot_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.section>
                )}
                {historyLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={16} className="animate-spin text-indigo-400" />
                    <span className="ml-2 text-[9px] font-bold text-slate-400">Loading trend data...</span>
                  </div>
                )}

                {/* ══ Detailed Panels (expandable) ══ */}
                <div className="pt-2">
                  <p className="text-[9px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.2em] px-2 mb-3">Detailed Breakdowns</p>
                </div>

                {/* 1. Spend Volatility Index */}
                <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedBehavior(expandedBehavior === 'volatility' ? null : 'volatility')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-2xl text-amber-500"><Activity size={16} /></div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.15em]">Spend Stability</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowBehaviorInfo(showBehaviorInfo === 'volatility' ? null : 'volatility'); }}><Info size={10} className="text-slate-400" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${behaviorMetrics.spend_volatility.volatility_score >= 60 ? 'text-rose-500' :
                          behaviorMetrics.spend_volatility.volatility_score >= 30 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>{behaviorMetrics.spend_volatility.classification}</span>
                      {expandedBehavior === 'volatility' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {showBehaviorInfo === 'volatility' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Shows how steady or unpredictable your spending is month-to-month. A low score means you spend about the same each month (good!). A high score means your spending jumps around a lot.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expandedBehavior === 'volatility' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 space-y-4">
                        <div className="flex items-center gap-6">
                          <div className="relative w-20 h-20">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-100 dark:text-white/5" />
                              <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.5" strokeDasharray={`${behaviorMetrics.spend_volatility.volatility_score} ${100 - behaviorMetrics.spend_volatility.volatility_score}`} strokeLinecap="round"
                                className={behaviorMetrics.spend_volatility.volatility_score >= 60 ? 'text-rose-500 stroke-current' : behaviorMetrics.spend_volatility.volatility_score >= 30 ? 'text-amber-500 stroke-current' : 'text-emerald-500 stroke-current'} />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-900 dark:text-premium-text">{behaviorMetrics.spend_volatility.volatility_score}</span>
                          </div>
                          <div className="flex-1 space-y-2">
                            <p className="text-xs font-bold text-slate-700 dark:text-premium-text">Volatility Score: <span className="font-black">{behaviorMetrics.spend_volatility.volatility_score}/100</span></p>
                            <p className="text-[10px] text-slate-400 dark:text-premium-muted">Trend: <span className="font-bold capitalize">{behaviorMetrics.spend_volatility.trend}</span></p>
                            {Object.keys(behaviorMetrics.spend_volatility.monthly_totals || {}).length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {Object.entries(behaviorMetrics.spend_volatility.monthly_totals).sort().slice(-4).map(([month, val]: [string, any]) => (
                                  <span key={month} className="bg-slate-50 dark:bg-premium-dark px-2 py-1 rounded-lg text-[8px] font-bold text-slate-500 dark:text-premium-muted">
                                    {month.split('-')[1]}: {mask(Math.round(val))}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* 2. Category Concentration */}
                <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedBehavior(expandedBehavior === 'concentration' ? null : 'concentration')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-violet-50 dark:bg-violet-500/10 p-2.5 rounded-2xl text-violet-500"><PieChart size={16} /></div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.15em]">Lifestyle Concentration</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowBehaviorInfo(showBehaviorInfo === 'concentration' ? null : 'concentration'); }}><Info size={10} className="text-slate-400" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-violet-500 uppercase tracking-widest">
                        {(behaviorMetrics.category_concentration.concentration_score * 100).toFixed(0)}%
                      </span>
                      {expandedBehavior === 'concentration' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {showBehaviorInfo === 'concentration' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Shows if most of your money goes to just one type of spending (like entertainment or food). A lower score means your spending is spread out nicely. A higher score means you're spending a lot in one area.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expandedBehavior === 'concentration' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 space-y-4">
                        {behaviorMetrics.category_concentration.dominant_category && (
                          <div className="bg-violet-50 dark:bg-violet-500/5 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-violet-800 dark:text-violet-300">
                              Dominant category: <span className="font-black">{behaviorMetrics.category_concentration.dominant_category}</span>
                            </p>
                          </div>
                        )}
                        <div className="space-y-2">
                          {Object.entries(behaviorMetrics.category_concentration.category_shares || {})
                            .sort(([, a]: any, [, b]: any) => b - a)
                            .map(([cat, share]: [string, any]) => (
                              <div key={cat} className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span className="font-bold text-slate-600 dark:text-premium-muted">{cat}</span>
                                  <span className="font-black text-slate-900 dark:text-premium-text">{(share * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-premium-dark h-2 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${share * 100}%` }} transition={{ duration: 0.6 }}
                                    className="h-full rounded-full bg-violet-500" />
                                </div>
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* 3. Subscription Burden */}
                <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedBehavior(expandedBehavior === 'burden' ? null : 'burden')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-rose-50 dark:bg-rose-500/10 p-2.5 rounded-2xl text-rose-500"><Wallet size={16} /></div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.15em]">Subscription Burden</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowBehaviorInfo(showBehaviorInfo === 'burden' ? null : 'burden'); }}><Info size={10} className="text-slate-400" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${behaviorMetrics.subscription_burden.risk_level === 'Critical' ? 'text-rose-500' :
                          behaviorMetrics.subscription_burden.risk_level === 'Elevated' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>{behaviorMetrics.subscription_burden.risk_level}</span>
                      {expandedBehavior === 'burden' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {showBehaviorInfo === 'burden' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Shows how much of your monthly spending goes to subscriptions (Netflix, Spotify, gym, etc.). If more than 35% of your money is going to subscriptions, it's getting heavy. Above 50% is a red flag.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expandedBehavior === 'burden' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-premium-dark p-5 rounded-[24px] space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recurring</p>
                            <p className="text-xl font-black text-slate-900 dark:text-premium-text">{mask(behaviorMetrics.subscription_burden.monthly_sub_spend)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-premium-dark p-5 rounded-[24px] space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Monthly</p>
                            <p className="text-xl font-black text-slate-900 dark:text-premium-text">{mask(behaviorMetrics.subscription_burden.total_monthly)}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-slate-500 dark:text-premium-muted">Burden Ratio</span>
                            <span className="font-black text-slate-900 dark:text-premium-text">{(behaviorMetrics.subscription_burden.burden_ratio * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-premium-dark h-3 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, behaviorMetrics.subscription_burden.burden_ratio * 100)}%` }} transition={{ duration: 0.8 }}
                              className={`h-full rounded-full ${behaviorMetrics.subscription_burden.burden_ratio > 0.5 ? 'bg-rose-500' :
                                  behaviorMetrics.subscription_burden.burden_ratio > 0.35 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* 4. Recurring Creep */}
                <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedBehavior(expandedBehavior === 'creep' ? null : 'creep')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-50 dark:bg-orange-500/10 p-2.5 rounded-2xl text-orange-500"><Clock size={16} /></div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.15em]">Recurring Creep</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowBehaviorInfo(showBehaviorInfo === 'creep' ? null : 'creep'); }}><Info size={10} className="text-slate-400" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${behaviorMetrics.recurring_creep.new_subscriptions_60d > 2 ? 'text-rose-500' :
                          behaviorMetrics.recurring_creep.new_subscriptions_60d > 0 ? 'text-amber-500' : 'text-emerald-500'
                        }`}>
                        {behaviorMetrics.recurring_creep.new_subscriptions_60d > 0
                          ? `+${behaviorMetrics.recurring_creep.new_subscriptions_60d} new`
                          : 'Stable'}
                      </span>
                      {expandedBehavior === 'creep' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {showBehaviorInfo === 'creep' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Tracks any new subscriptions you've signed up for in the last 2 months and how much extra they cost you each month. Helps you catch if you're slowly adding too many.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expandedBehavior === 'creep' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-premium-dark p-5 rounded-[24px] space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">New (60d)</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-premium-text">{behaviorMetrics.recurring_creep.new_subscriptions_60d}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-premium-dark p-5 rounded-[24px] space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly Delta</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-premium-text">{mask(behaviorMetrics.recurring_creep.delta_monthly_commitment)}</p>
                          </div>
                        </div>
                        {behaviorMetrics.recurring_creep.new_services?.length > 0 && (
                          <div className="space-y-2">
                            {behaviorMetrics.recurring_creep.new_services.map((srv: any, i: number) => (
                              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-white/5 last:border-0">
                                <span className="text-xs font-bold text-slate-700 dark:text-premium-text">{srv.name}</span>
                                <span className="text-xs font-black text-slate-900 dark:text-premium-text">{mask(srv.monthly_cost)}/mo</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {behaviorMetrics.recurring_creep.new_subscriptions_60d === 0 && (
                          <div className="bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl">
                            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">No new recurring commitments in the last 60 days. Your subscription discipline is solid.</p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* 5. Weekend Spend Bias */}
                <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedBehavior(expandedBehavior === 'weekend' ? null : 'weekend')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-cyan-50 dark:bg-cyan-500/10 p-2.5 rounded-2xl text-cyan-500"><Calendar size={16} /></div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.15em]">Habit Patterns</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowBehaviorInfo(showBehaviorInfo === 'weekend' ? null : 'weekend'); }}><Info size={10} className="text-slate-400" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${behaviorMetrics.weekend_bias.pattern === 'Leisure-skewed' ? 'text-amber-500' : 'text-emerald-500'
                        }`}>{behaviorMetrics.weekend_bias.pattern === 'Leisure-skewed' ? 'Weekend-heavy' : behaviorMetrics.weekend_bias.pattern}</span>
                      {expandedBehavior === 'weekend' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {showBehaviorInfo === 'weekend' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Compares how much you spend on weekends vs weekdays. Ideally it's about even (~29%). If more than 40% of your spending happens on weekends, you might be making impulse purchases when you're relaxing.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expandedBehavior === 'weekend' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-premium-dark p-5 rounded-[24px] space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weekend</p>
                            <p className="text-xl font-black text-slate-900 dark:text-premium-text">{mask(behaviorMetrics.weekend_bias.weekend_spend)}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-premium-dark p-5 rounded-[24px] space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Weekday</p>
                            <p className="text-xl font-black text-slate-900 dark:text-premium-text">{mask(behaviorMetrics.weekend_bias.weekday_spend)}</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-slate-500 dark:text-premium-muted">Weekend Ratio</span>
                            <span className="font-black text-slate-900 dark:text-premium-text">{(behaviorMetrics.weekend_bias.weekend_ratio * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-premium-dark h-3 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, behaviorMetrics.weekend_bias.weekend_ratio * 100)}%` }} transition={{ duration: 0.8 }}
                              className={`h-full rounded-full ${behaviorMetrics.weekend_bias.weekend_ratio > 0.4 ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                          </div>
                        </div>
                        <div className={`p-4 rounded-2xl ${behaviorMetrics.weekend_bias.pattern === 'Leisure-skewed' ? 'bg-amber-50 dark:bg-amber-500/5' : 'bg-cyan-50 dark:bg-cyan-500/5'}`}>
                          <p className="text-[10px] font-bold text-slate-700 dark:text-premium-muted leading-relaxed">
                            {behaviorMetrics.weekend_bias.pattern === 'Leisure-skewed'
                              ? `⚠ ${(behaviorMetrics.weekend_bias.weekend_ratio * 100).toFixed(0)}% of your spending happens on weekends. Consider setting weekend spending limits.`
                              : behaviorMetrics.weekend_bias.pattern === 'Weekday-heavy'
                                ? `Your spending is concentrated during weekdays — likely essentials and commute. Disciplined weekend control.`
                                : `✓ Balanced spending distribution across the week. Healthy pattern.`
                            }
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

                {/* Service Value Map (original scatter chart) */}
                <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 rounded-[36px] shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedBehavior(expandedBehavior === 'svm' ? null : 'svm')} className="w-full flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2.5 rounded-2xl text-indigo-500"><BarChart3 size={16} /></div>
                      <span className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.15em]">Service Value Map</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowBehaviorInfo(showBehaviorInfo === 'svm' ? null : 'svm'); }}><Info size={10} className="text-slate-400" /></button>
                    </div>
                    {expandedBehavior === 'svm' ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </button>
                  <AnimatePresence>
                    {showBehaviorInfo === 'svm' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-2">
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium leading-relaxed">Shows each subscription on a chart — how useful it is vs how much it costs. Subscriptions in the top-right are great value (useful and cheap). Bottom-left ones are costing you money without much benefit.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {expandedBehavior === 'svm' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 space-y-4">
                        {/* Quadrant guide */}
                        <div className="grid grid-cols-2 gap-1.5 text-[8px] font-black uppercase tracking-widest">
                          <div className="bg-amber-50 dark:bg-amber-500/5 rounded-xl p-2 text-center text-amber-500">⚡ Costly & Low Use</div>
                          <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-xl p-2 text-center text-emerald-500">★ Worth the Price</div>
                          <div className="bg-rose-50 dark:bg-rose-500/5 rounded-xl p-2 text-center text-rose-500">✕ Can Drop</div>
                          <div className="bg-blue-50 dark:bg-blue-500/5 rounded-xl p-2 text-center text-blue-500">◆ Cheap & Useful</div>
                        </div>

                        <div className="relative h-72 w-full">
                          <div className="absolute -left-1 top-1/2 -rotate-90 origin-left text-[8px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.15em]">Capital Cost (₹)</div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] font-black text-slate-400 dark:text-premium-muted uppercase tracking-[0.15em]">Utility Score →</div>

                          {/* Quadrant dividers */}
                          <div className="absolute top-[50%] left-[55px] right-[20px] h-px border-t border-dashed border-slate-200 dark:border-white/10 z-0" />
                          <div className="absolute left-[calc(50%+17px)] top-[20px] bottom-[40px] w-px border-l border-dashed border-slate-200 dark:border-white/10 z-0" />

                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 35 }}>
                              <XAxis
                                type="number"
                                dataKey="x"
                                domain={[0, 100]}
                                tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                                ticks={[0, 25, 50, 75, 100]}
                                label={{ value: '', position: 'bottom' }}
                              />
                              <YAxis
                                type="number"
                                dataKey="y"
                                domain={[0, 'auto']}
                                tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                                axisLine={{ stroke: '#e2e8f0' }}
                                tickLine={false}
                                tickFormatter={(v: number) => `₹${(v * 100).toLocaleString()}`}
                                width={50}
                              />
                              <Tooltip
                                cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }}
                                content={({ active, payload }) => {
                                  if (active && payload?.[0]) {
                                    const d = payload[0].payload;
                                    const zone = d.x >= 50
                                      ? (d.y >= (scatterData.reduce((s: number, p: any) => s + p.y, 0) / (scatterData.length || 1)) ? '★ Worth the Price' : '◆ Cheap & Useful')
                                      : (d.y >= (scatterData.reduce((s: number, p: any) => s + p.y, 0) / (scatterData.length || 1)) ? '⚡ Costly & Low Use' : '✕ Can Drop');
                                    return (
                                      <div className="bg-[#0f172a] dark:bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow-2xl space-y-1 min-w-[140px]">
                                        <p className="text-[11px] font-black">{d.name}</p>
                                        <p className="text-[9px] font-bold text-white/60">Cost: ₹{(d.y * 100).toLocaleString()}/mo</p>
                                        <p className="text-[9px] font-bold text-white/60">Utility: {Math.round(d.x)}/100</p>
                                        <p className="text-[9px] font-black text-indigo-300 pt-0.5">{zone}</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Scatter
                                data={scatterData}
                                shape={(props: any) => {
                                  const { cx, cy, payload } = props;
                                  const avgY = scatterData.reduce((s: number, p: any) => s + p.y, 0) / (scatterData.length || 1);
                                  const quadrantColor = payload.x >= 50
                                    ? (payload.y >= avgY ? '#10b981' : '#3b82f6')
                                    : (payload.y >= avgY ? '#f59e0b' : '#f43f5e');
                                  return (
                                    <g>
                                      <circle cx={cx} cy={cy} r={7} fill={quadrantColor} stroke="white" strokeWidth={2} style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }} />
                                      <text x={cx} y={cy - 12} textAnchor="middle" fill="#475569" fontSize={8} fontWeight={800} className="dark:fill-premium-muted">
                                        {payload.name.length > 12 ? payload.name.slice(0, 11) + '…' : payload.name}
                                      </text>
                                    </g>
                                  );
                                }}
                              >
                                {scatterData.map((entry) => {
                                  const avgY = scatterData.reduce((s: number, p: any) => s + p.y, 0) / (scatterData.length || 1);
                                  const color = entry.x >= 50
                                    ? (entry.y >= avgY ? '#10b981' : '#3b82f6')
                                    : (entry.y >= avgY ? '#f59e0b' : '#f43f5e');
                                  return <Cell key={`cell-${entry.name}`} fill={color} />;
                                })}
                              </Scatter>
                            </ScatterChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 justify-center">
                          {scatterData.map((entry) => {
                            const avgY = scatterData.reduce((s: number, p: any) => s + p.y, 0) / (scatterData.length || 1);
                            const color = entry.x >= 50
                              ? (entry.y >= avgY ? '#10b981' : '#3b82f6')
                              : (entry.y >= avgY ? '#f59e0b' : '#f43f5e');
                            return (
                            <div key={entry.name} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-[8px] font-bold text-slate-500 dark:text-premium-muted">{entry.name}</span>
                            </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>

              </>)}
            </div>
          )}

          {activeBucket === 'action' && (
            <div className="space-y-6">
              {/* Header Card */}
              <div className="bg-emerald-600 rounded-[40px] p-8 text-white space-y-4 shadow-xl">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">Action Intelligence</p>
                <h3 className="text-2xl font-black tracking-tighter">
                  {pendingActions.length} Recommended Action{pendingActions.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-[10px] font-bold opacity-70">Select and execute to optimize your finances instantly.</p>
              </div>

              {/* Action List with Checkboxes */}
              {pendingActions.length > 0 ? (
                <div className="space-y-3">
                  <button onClick={selectAllActions} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-2">
                    {selectedActions.size === pendingActions.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {pendingActions.map((action, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => toggleAction(idx)}
                      className={`w-full flex items-center gap-4 p-5 rounded-[28px] border transition-all active:scale-[0.98] text-left ${selectedActions.has(idx)
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-white dark:bg-premium-card border-slate-100 dark:border-white/5'
                        }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedActions.has(idx) ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-premium-dark'
                        }`}>
                        {selectedActions.has(idx) && <CheckCircle2 size={14} />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-premium-text">{action.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-premium-muted font-medium mt-0.5 capitalize">{action.type.replace(/_/g, ' ')}</p>
                      </div>
                      <Zap size={14} className={selectedActions.has(idx) ? 'text-emerald-500' : 'text-slate-300 dark:text-premium-muted/30'} />
                    </motion.button>
                  ))}

                  {/* Execute Button */}
                  <button
                    onClick={executeSelected}
                    disabled={selectedActions.size === 0 || isExecuting}
                    className="w-full bg-[#0f172a] dark:bg-indigo-600 text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.25em] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {isExecuting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Execute {selectedActions.size} Action{selectedActions.size !== 1 ? 's' : ''} <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-premium-card p-8 rounded-[40px] border border-slate-100 dark:border-white/5 text-center space-y-3">
                  <Target size={28} className="text-slate-300 dark:text-premium-muted/30 mx-auto" />
                  <p className="text-xs font-bold text-slate-400 dark:text-premium-muted">No pending actions. Ask Lex for recommendations!</p>
                </div>
              )}

              {/* Execution Results */}
              <AnimatePresence>
                {(executionSummary || actionResults.length > 0) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    {executionSummary && (
                      <div className="bg-indigo-50 dark:bg-indigo-500/10 p-5 rounded-[28px] border border-indigo-100 dark:border-indigo-500/20">
                        <p className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-1">Execution Summary</p>
                        <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100/80">{executionSummary}</p>
                      </div>
                    )}
                    {actionResults.map((r, i) => (
                      <div key={i} className={`flex items-center gap-3 p-4 rounded-[24px] border ${r.status === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10'
                          : 'bg-rose-50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/10'
                        }`}>
                        {r.status === 'success'
                          ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                          : <XCircle size={16} className="text-rose-500 shrink-0" />
                        }
                        <div className="flex-1">
                          <p className="text-[11px] font-bold text-slate-800 dark:text-premium-text">{r.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-premium-muted">{r.detail || r.reason}</p>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Past Executed Actions History */}
              {pastActions.length > 0 && (
                <div className="pt-2">
                  <button 
                    onClick={() => setShowPastActions(!showPastActions)}
                    className="w-full flex items-center justify-between p-4 bg-slate-100 dark:bg-premium-card rounded-2xl active:scale-95 transition-all text-slate-600 dark:text-premium-muted hover:text-slate-900 border border-transparent dark:border-white/5"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      View Past Actions ({pastActions.length})
                    </span>
                    <ChevronRight size={16} className={`transition-transform duration-300 ${showPastActions ? 'rotate-90' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {showPastActions && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }} 
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2"
                      >
                        <div className="space-y-2 py-2">
                          {pastActions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-4 bg-white dark:bg-premium-card/50 border border-slate-100 dark:border-white/5 rounded-[24px]">
                              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-premium-dark flex items-center justify-center shrink-0">
                                <Check size={12} className="text-slate-400" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-700 dark:text-premium-text/80">{action.label}</p>
                                <p className="text-[9px] font-medium text-slate-400 opacity-80 mt-0.5 capitalize">{action.type.replace(/_/g, ' ')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Lex AI Intelligence Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em] flex items-center gap-2">
            Lex Intelligence <Sparkles size={12} className="text-indigo-500" />
          </h3>
          {localHistory.length > 0 && (
            <button
              onClick={() => {
                setLocalHistory([]);
                setLexResponse(null);
                setLexQuery('');
                clearLexSession();
              }}
              className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all active:scale-95"
            >
              + New Chat
            </button>
          )}
        </div>
        <div className="bg-slate-50 dark:bg-premium-card border border-slate-100 dark:border-white/5 p-6 rounded-[40px] shadow-inner space-y-4 relative overflow-hidden">
          {/* Conversation History */}
          {localHistory.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-3 no-scrollbar">
              {localHistory.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-premium-dark/50 border border-slate-100 dark:border-white/5 text-slate-700 dark:text-premium-muted rounded-bl-md'
                    }`}>
                    <p className="text-[11px] font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
              {isLexLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-premium-dark/50 border border-slate-100 dark:border-white/5 p-4 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Input */}
          <div className="flex gap-2">
            <input className="flex-1 bg-white dark:bg-premium-dark border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:text-premium-text transition-all" placeholder="Tell me a story about my money..." value={lexQuery} onChange={(e) => setLexQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLexQuery()} />
            <button onClick={handleLexQuery} disabled={isLexLoading} className="bg-[#0f172a] dark:bg-indigo-600 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all">
              {isLexLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          {localHistory.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
              <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">End-to-End Encrypted Intelligence</p>
            </div>
          )}
        </div>
      </section>

      {/* Privacy First Analytics — only on Money and Action tabs */}
      {(activeBucket === 'money' || activeBucket === 'action') && (
        <div className="bg-zinc-950 dark:bg-premium-card rounded-[44px] p-10 text-white relative shadow-2xl overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-125 group-active:scale-125 transition-transform duration-1000 pointer-events-none"></div>
          <Sparkles className="text-indigo-400 mb-6" size={28} />
          <h3 className="text-2xl font-black mb-3 tracking-tight">Privacy First Architecture</h3>
          <p className="text-[11px] text-zinc-400 dark:text-premium-muted leading-relaxed font-medium">
            SpndWisee processes your financial data with end-to-end encryption. Your capital flows, account numbers, and spending patterns are never shared with third parties. We believe data privacy is the ultimate wealth.
          </p>
        </div>
      )}
    </div>
  );
};

export default Insights;
