import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../src/lib/api';
import {
  TrendingUp, Shield, Zap, Brain, Target, ArrowRight,
  AlertTriangle, Loader2, ChevronRight, Sparkles,
} from 'lucide-react';

interface InsightRevealScreenProps {
  onEnterDashboard: () => void;
}

interface ActivationData {
  surplus: any;
  discipline: any;
  behavior: any;
  maturity: any;
}

const InsightRevealScreen: React.FC<InsightRevealScreenProps> = ({ onEnterDashboard }) => {
  const [phase, setPhase] = useState<'loading' | 'reveal'>('loading');
  const [data, setData] = useState<ActivationData | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  const LOADING_STEPS = [
    'Mapping income streams...',
    'Scanning subscriptions...',
    'Analyzing spending behavior...',
    'Computing capital discipline...',
    'Generating strategic insights...',
  ];

  useEffect(() => {
    const activate = async () => {
      // Animate loading steps
      const stepInterval = setInterval(() => {
        setLoadingStep(prev => Math.min(prev + 1, LOADING_STEPS.length - 1));
      }, 500);

      try {
        // Fire all API calls in parallel
        const [surplusRes, disciplineRes, behaviorRes, maturityRes] = await Promise.all([
          api.get('/capital/surplus').catch(() => ({ status: 'error' })),
          api.get('/capital/discipline-score').catch(() => ({ status: 'error' })),
          api.get('/insights/behavior').catch(() => ({ status: 'error' })),
          api.post('/insights/maturity-snapshot', {}).catch(() => ({ status: 'error' })),
        ]);

        clearInterval(stepInterval);
        setLoadingStep(LOADING_STEPS.length - 1);

        setData({
          surplus: surplusRes,
          discipline: disciplineRes,
          behavior: behaviorRes,
          maturity: maturityRes,
        });

        // Brief pause to let the last step show, then reveal
        setTimeout(() => setPhase('reveal'), 800);
      } catch (err) {
        clearInterval(stepInterval);
        // Even on error, proceed to reveal with whatever we have
        setTimeout(() => setPhase('reveal'), 500);
      }
    };

    activate();
  }, []);

  // ── Loading phase ──────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-[#0E1116] flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-10"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-600/30">
            <Zap size={36} className="text-white" />
          </div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-bold text-white mb-8"
        >
          Analyzing your capital discipline...
        </motion.h2>

        <div className="w-full max-w-xs space-y-3">
          {LOADING_STEPS.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: i <= loadingStep ? 1 : 0.2, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {i <= loadingStep ? (
                i < loadingStep ? (
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                  </div>
                ) : (
                  <Loader2 size={18} className="text-blue-400 animate-spin" />
                )
              ) : (
                <div className="w-5 h-5 rounded-full bg-white/5" />
              )}
              <span className={`text-sm ${i <= loadingStep ? 'text-slate-300' : 'text-slate-600'}`}>
                {label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // ── Reveal phase ───────────────────────────────────────────────────
  const surplus = data?.surplus || {};
  const discipline = data?.discipline || {};
  const behavior = data?.behavior || {};
  const maturity = data?.maturity?.snapshot || {};

  const maturityScore = maturity.maturity_score ?? behavior?.classification?.financial_maturity?.maturity_index ?? 0;
  const maturityLabel = maturity.classification ?? behavior?.classification?.financial_maturity?.classification ?? 'Unknown';
  const persona = maturity.persona ?? behavior?.classification?.behavioral_persona?.persona ?? 'Unknown';
  const monthlySurplus = surplus.monthly_surplus ?? 0;
  const burnRate = surplus.burn_rate ?? 0;
  const disciplineScore = discipline.discipline_score ?? discipline.score ?? 0;
  const disciplineLabel = discipline.label ?? '';

  // Trajectory — may not be computed yet, surface what we have
  const currentPath5y = surplus.monthly_income
    ? Math.round(monthlySurplus * 60)
    : 0;
  const disciplinedPath5y = surplus.monthly_income
    ? Math.round(monthlySurplus * 1.15 * ((Math.pow(1 + 0.08 / 12, 60) - 1) / (0.08 / 12)))
    : 0;

  const formatCurrency = (n: number) => {
    if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-[#0E1116] text-white px-5 py-8 pb-32 overflow-y-auto relative">
      <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold mb-4">
            <Sparkles size={14} /> Capital Engine Activated
          </div>
          <h1 className="text-2xl font-bold">Your Financial Intelligence</h1>
        </motion.div>

        {/* ── Card Grid ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Financial Maturity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#161A22] border border-white/5 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Brain size={16} className="text-purple-400" /> Financial Maturity
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-extrabold">{maturityScore}</span>
              <span className="text-slate-400 text-sm">/ 100</span>
              <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${
                maturityScore >= 70 ? 'bg-green-500/15 text-green-400' :
                maturityScore >= 40 ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-red-500/15 text-red-400'
              }`}>
                {maturityLabel}
              </span>
            </div>
          </motion.div>

          {/* Persona */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#161A22] border border-white/5 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Target size={16} className="text-blue-400" /> Behavioral Persona
            </div>
            <p className="text-lg font-bold">You behave like: <span className="text-blue-400">{persona}</span></p>
          </motion.div>

          {/* Surplus & Burn Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#161A22] border border-white/5 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <TrendingUp size={16} className="text-green-400" /> Surplus Report
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Monthly Surplus</p>
                <p className={`text-2xl font-extrabold ${monthlySurplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(monthlySurplus)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Burn Rate</p>
                <p className={`text-2xl font-extrabold ${burnRate > 0.85 ? 'text-red-400' : burnRate > 0.70 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {(burnRate * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </motion.div>

          {/* Discipline Score */}
          {disciplineScore > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#161A22] border border-white/5 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                <Shield size={16} className="text-indigo-400" /> Capital Discipline Score
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold">{disciplineScore}</span>
                <span className="text-slate-400 text-sm">/ 100</span>
                {disciplineLabel && (
                  <span className="text-sm text-indigo-400 font-semibold">{disciplineLabel}</span>
                )}
              </div>
            </motion.div>
          )}

          {/* Capital Trajectory */}
          {monthlySurplus > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 rounded-2xl p-5"
            >
              <div className="flex items-center gap-2 text-sm text-blue-400 mb-4 font-semibold">
                <Zap size={16} /> 5-Year Capital Trajectory
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Current Path</p>
                  <p className="text-xl font-bold text-slate-300">{formatCurrency(currentPath5y)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Disciplined Path</p>
                  <p className="text-xl font-bold text-green-400">{formatCurrency(disciplinedPath5y)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <p className="text-xs text-red-300">
                  <span className="font-bold">Cost of indiscipline:</span> {formatCurrency(disciplinedPath5y - currentPath5y)} over 5 years
                </p>
              </div>
            </motion.div>
          )}

          {/* First Strategic Insight */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#161A22] border border-white/5 rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <Sparkles size={16} className="text-amber-400" /> Strategic Insight
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {behavior?.classification?.category_concentration?.dominant_category
                ? `${behavior.classification.category_concentration.dominant_category} spending dominance detected. Optimizing this single category can significantly improve your capital trajectory.`
                : 'Your capital engine is now active. As you add more transactions, Lex will identify specific optimization opportunities.'}
            </p>
          </motion.div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <button
            onClick={onEnterDashboard}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/25 active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            Enter Your Capital Dashboard
            <ArrowRight size={20} />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default InsightRevealScreen;
