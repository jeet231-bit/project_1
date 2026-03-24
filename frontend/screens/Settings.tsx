import React, { useState } from 'react';
import {
  User, Bell, Shield, Eye,
  HelpCircle, LogOut, ChevronRight, ChevronDown, ChevronUp,
  Smartphone, Database, Coins, Download, FileText, FileSpreadsheet,
  Brain, Landmark, Loader2, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { useApp } from '../store';
import { api, apiUrl, supabase, signOutExplicitly } from '../src/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const Settings: React.FC = () => {
  const { userName, userEmail, subscriptions, expenses, bankAccounts } = useApp();
  const [notifs, setNotifs] = useState(true);

  // Export Vault state
  const [vaultOpen, setVaultOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [statementData, setStatementData] = useState<any>(null);
  const [behaviorData, setBehaviorData] = useState<any>(null);

  const handleLogout = async () => {
    await signOutExplicitly();
  };

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${active ? 'left-6' : 'left-1'}`}></div>
    </button>
  );

  // ── Download helpers ──────────────────────────────────────────
  const downloadJSON = async () => {
    setLoading('json');
    try {
      const data = await api.get('/export/full-profile');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finiq_profile_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('JSON export failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const downloadCSV = async () => {
    setLoading('csv');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${apiUrl}/export/expenses-csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    } finally {
      setLoading(null);
    }
  };

  const loadStatement = async () => {
    if (expandedItem === 'statement') { setExpandedItem(null); return; }
    setExpandedItem('statement');
    if (!statementData) {
      setLoading('statement');
      try {
        const res = await api.get('/export/monthly-statement');
        if (res.status === 'ok') setStatementData(res.statement);
      } catch (err) { console.warn('Statement load failed:', err); }
      finally { setLoading(null); }
    }
  };

  const loadBehavior = async () => {
    if (expandedItem === 'behavior') { setExpandedItem(null); return; }
    setExpandedItem('behavior');
    if (!behaviorData) {
      setLoading('behavior');
      try {
        const res = await api.get('/insights/behavior');
        if (res.status === 'ok') setBehaviorData(res);
      } catch (err) { console.warn('Behavior load failed:', err); }
      finally { setLoading(null); }
    }
  };

  const toggleBankSummary = () => {
    setExpandedItem(expandedItem === 'bank' ? null : 'bank');
  };

  // ── Vault items config ────────────────────────────────────────
  const vaultItems = [
    {
      id: 'statement',
      icon: FileText,
      title: 'Monthly Statement',
      subtitle: 'Income, expenses & surplus breakdown',
      onClick: loadStatement,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      id: 'json',
      icon: Download,
      title: 'Download Full JSON',
      subtitle: 'Complete financial profile export',
      onClick: downloadJSON,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    },
    {
      id: 'csv',
      icon: FileSpreadsheet,
      title: 'Expense Report (CSV)',
      subtitle: 'Spreadsheet-ready expense data',
      onClick: downloadCSV,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      id: 'bank',
      icon: Landmark,
      title: 'Bank Summary',
      subtitle: 'Linked accounts & liquidity',
      onClick: toggleBankSummary,
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      id: 'behavior',
      icon: Brain,
      title: 'Behavioral Snapshot',
      subtitle: 'Persona, risk & discipline metrics',
      onClick: loadBehavior,
      color: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-500/10',
    },
  ];

  return (
    <div className="p-6 pt-10 space-y-10 pb-32">
      <div className="flex items-center gap-5">
        <div className="w-18 h-18 rounded-[32px] bg-gradient-to-br from-indigo-500 to-violet-600 p-1 shadow-2xl shadow-indigo-100 dark:shadow-none">
          <div className="w-full h-full rounded-[28px] bg-white dark:bg-zinc-900 flex items-center justify-center">
            <User size={36} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-50 tracking-tight">{userName}</h1>
          {userEmail && <p className="text-xs text-slate-400 font-medium mt-0.5">{userEmail}</p>}
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Premium Member</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Privacy Engine</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-slate-100 dark:border-zinc-800 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600"><Bell size={18} /></div>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Payment Alerts</span>
              </div>
              <Toggle active={notifs} onToggle={() => setNotifs(!notifs)} />
            </div>
            <div className="flex items-center justify-between opacity-50">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600"><Smartphone size={18} /></div>
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">SMS Scanner</span>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">Coming Soon</p>
                </div>
              </div>
              <Toggle active={false} onToggle={() => { }} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Data Control</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-slate-100 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600"><Coins size={18} /></div>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Base Currency</span>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">INR (₹)</span>
            </div>

            {/* ═══ Export Vault — Collapsible ═══ */}
            <div className="space-y-0">
              <button
                onClick={() => setVaultOpen(!vaultOpen)}
                className="w-full flex items-center justify-between py-1 group"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600 group-hover:text-indigo-500 group-active:text-indigo-500 transition-colors"><Database size={18} /></div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Export Vault</span>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">5 data features</p>
                  </div>
                </div>
                {vaultOpen
                  ? <ChevronUp size={18} className="text-slate-400" />
                  : <ChevronDown size={18} className="text-slate-400" />
                }
              </button>

              <AnimatePresence>
                {vaultOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-2">
                      {vaultItems.map((item) => (
                        <div key={item.id}>
                          <button
                            onClick={item.onClick}
                            disabled={loading === item.id}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-all active:scale-[0.98] text-left"
                          >
                            <div className={`${item.bg} p-2.5 rounded-xl ${item.color}`}>
                              {loading === item.id
                                ? <Loader2 size={16} className="animate-spin" />
                                : <item.icon size={16} />
                              }
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] font-bold text-slate-800 dark:text-zinc-200">{item.title}</p>
                              <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">{item.subtitle}</p>
                            </div>
                            {(item.id === 'statement' || item.id === 'bank' || item.id === 'behavior')
                              ? (expandedItem === item.id
                                ? <ChevronUp size={14} className="text-slate-300" />
                                : <ChevronDown size={14} className="text-slate-300" />
                              )
                              : <ChevronRight size={14} className="text-slate-300" />
                            }
                          </button>

                          {/* ─── Inline: Monthly Statement ─── */}
                          <AnimatePresence>
                            {item.id === 'statement' && expandedItem === 'statement' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                {statementData ? (
                                  <div className="mx-4 mb-3 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl space-y-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{statementData.period}</p>

                                    <div className="space-y-2">
                                      <div className="flex justify-between text-[11px]">
                                        <span className="font-medium text-slate-500 dark:text-zinc-400">Income</span>
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">₹{statementData.income.total.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-[11px]">
                                        <span className="font-medium text-slate-500 dark:text-zinc-400">Subscriptions ({statementData.subscriptions.count})</span>
                                        <span className="font-black text-amber-600 dark:text-amber-400">-₹{statementData.subscriptions.total.toLocaleString()}</span>
                                      </div>
                                      <div className="flex justify-between text-[11px]">
                                        <span className="font-medium text-slate-500 dark:text-zinc-400">Expenses ({statementData.expenses.count})</span>
                                        <span className="font-black text-rose-600 dark:text-rose-400">-₹{statementData.expenses.total.toLocaleString()}</span>
                                      </div>
                                      <div className="border-t border-slate-200 dark:border-zinc-700 pt-2 flex justify-between text-[12px]">
                                        <span className="font-bold text-slate-700 dark:text-zinc-200">Net Surplus</span>
                                        <span className={`font-black ${statementData.net_surplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                          {statementData.net_surplus >= 0 ? '+' : ''}₹{statementData.net_surplus.toLocaleString()}
                                        </span>
                                      </div>
                                    </div>

                                    {statementData.expenses.category_breakdown.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Top Categories</p>
                                        {statementData.expenses.category_breakdown.slice(0, 4).map((c: any) => (
                                          <div key={c.category} className="flex justify-between text-[10px]">
                                            <span className="font-medium text-slate-500 dark:text-zinc-400">{c.category}</span>
                                            <span className="font-bold text-slate-700 dark:text-zinc-300">₹{c.amount.toLocaleString()}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mx-4 mb-3 p-4 flex items-center justify-center">
                                    <Loader2 size={16} className="animate-spin text-slate-400" />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* ─── Inline: Bank Summary ─── */}
                          <AnimatePresence>
                            {item.id === 'bank' && expandedItem === 'bank' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mx-4 mb-3 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl space-y-3">
                                  {bankAccounts.length > 0 ? (
                                    <>
                                      {bankAccounts.map((b: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                                              <Landmark size={14} className="text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div>
                                              <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-200">{b.bankName || b.bank_name}</p>
                                              <p className="text-[9px] font-medium text-slate-400">
                                                {b.accountType || b.account_type} •••• {b.lastFour || b.last_four}
                                              </p>
                                            </div>
                                          </div>
                                          <span className="text-[11px] font-black text-slate-800 dark:text-zinc-100">
                                            ₹{(b.balance || 0).toLocaleString()}
                                          </span>
                                        </div>
                                      ))}
                                      <div className="border-t border-slate-200 dark:border-zinc-700 pt-2 flex justify-between">
                                        <span className="text-[10px] font-bold text-slate-500">Total Liquidity</span>
                                        <span className="text-[12px] font-black text-emerald-600 dark:text-emerald-400">
                                          ₹{bankAccounts.reduce((s: number, b: any) => s + (b.balance || 0), 0).toLocaleString()}
                                        </span>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-[10px] font-bold text-slate-400 text-center py-2">
                                      No bank accounts linked yet.
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* ─── Inline: Behavioral Snapshot ─── */}
                          <AnimatePresence>
                            {item.id === 'behavior' && expandedItem === 'behavior' && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                {behaviorData?.metrics ? (
                                  <div className="mx-4 mb-3 p-4 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl space-y-3">
                                    {/* Persona */}
                                    {behaviorData.metrics.behavioral_persona && (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Persona</p>
                                          <p className="text-[13px] font-black text-slate-800 dark:text-zinc-100">
                                            {behaviorData.metrics.behavioral_persona.persona}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                            {Math.round(behaviorData.metrics.behavioral_persona.confidence * 100)}%
                                          </p>
                                          <p className="text-[8px] font-bold text-slate-400 uppercase">Confidence</p>
                                        </div>
                                      </div>
                                    )}

                                    {/* Key metrics row */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Volatility</p>
                                        <p className={`text-sm font-black ${(behaviorData.metrics.spend_volatility?.volatility_score || 0) >= 60 ? 'text-rose-500' :
                                            (behaviorData.metrics.spend_volatility?.volatility_score || 0) >= 30 ? 'text-amber-500' : 'text-emerald-500'
                                          }`}>
                                          {behaviorData.metrics.spend_volatility?.volatility_score || 0}
                                        </p>
                                      </div>
                                      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Burden</p>
                                        <p className={`text-sm font-black ${behaviorData.metrics.subscription_burden?.risk_level === 'Critical' ? 'text-rose-500' :
                                            behaviorData.metrics.subscription_burden?.risk_level === 'Elevated' ? 'text-amber-500' : 'text-emerald-500'
                                          }`}>
                                          {behaviorData.metrics.subscription_burden?.risk_level || 'N/A'}
                                        </p>
                                      </div>
                                      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl text-center">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Trend</p>
                                        <p className="text-sm font-black text-slate-700 dark:text-zinc-200 capitalize flex items-center justify-center gap-1">
                                          {behaviorData.metrics.spend_volatility?.trend === 'improving' ? <TrendingDown size={12} className="text-emerald-500" /> :
                                            behaviorData.metrics.spend_volatility?.trend === 'worsening' ? <TrendingUp size={12} className="text-rose-500" /> :
                                              <Minus size={12} className="text-slate-400" />}
                                          {behaviorData.metrics.spend_volatility?.trend || '—'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Primary risk */}
                                    {behaviorData.metrics.behavioral_persona?.primary_risk_area && (
                                      <div className="bg-rose-50 dark:bg-rose-500/5 p-3 rounded-xl">
                                        <p className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Primary Risk</p>
                                        <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5">
                                          {behaviorData.metrics.behavioral_persona.primary_risk_area}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mx-4 mb-3 p-4 flex items-center justify-center">
                                    <Loader2 size={16} className="animate-spin text-slate-400" />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="text-center pt-4 space-y-2 opacity-40">
        <div className="flex justify-center items-center gap-2">
          <Shield size={12} />
          <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted Storage</span>
        </div>
        <p className="text-[9px] font-bold">SpndWisee v1.0.0 • Silicon Architecture</p>
      </div>
    </div>
  );
};

export default Settings;
