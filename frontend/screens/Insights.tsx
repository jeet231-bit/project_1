
import React, { useState } from 'react';
import { useApp } from '../store';
import { 
  TrendingUp, Sparkles, Target, Zap, CircleAlert, 
  Send, Loader2, Info, ArrowRight, BrainCircuit, Activity, LineChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from "@google/genai";

const Insights: React.FC = () => {
  const { subscriptions, isSecureMode } = useApp();
  const [lexQuery, setLexQuery] = useState('');
  const [lexResponse, setLexResponse] = useState<string | null>(null);
  const [isLexLoading, setIsLexLoading] = useState(false);
  const [activeBucket, setActiveBucket] = useState<'money' | 'commitment' | 'behavior' | 'action'>('money');

  const scatterData = subscriptions.map(s => ({
    name: s.name,
    x: s.usageScore || 50,
    y: s.amount / 100,
    z: 100
  }));

  const mask = (val: string | number) => isSecureMode ? "••••" : `₹${val.toLocaleString()}`;

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const promptContext = `You are Lex, the FinIQ Intelligence Engine. Refine Aryan's data into a brief, storytelling summary. Focus on ROI and capital preservation. Q: ${lexQuery}`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: promptContext });
      setLexResponse(response.text);
    } catch (e) { setLexResponse("I encountered an error. Please try again."); }
    finally { setIsLexLoading(false); }
  };

  return (
    <div className="p-6 pt-10 space-y-10 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
      <header className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900 dark:text-premium-text tracking-tight">Intelligence</h1>
        <p className="text-sm font-medium text-slate-400 dark:text-premium-muted">Turning capital data into human storytelling.</p>
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
          {activeBucket === 'money' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="p-8 rounded-[40px] bg-indigo-600 text-white flex-1 space-y-4 shadow-xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">Money Intelligence</p>
                  <h3 className="text-3xl font-black tracking-tighter">₹14,200</h3>
                  <p className="text-[9px] font-bold opacity-60 uppercase">That's 12% lower than last month. Healthy trend.</p>
                </div>
              </div>
              <div className="bg-white dark:bg-premium-card p-8 rounded-[40px] border border-slate-100 dark:border-white/5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-premium-muted">Subscription Burden</span>
                  <span className="text-xs font-black text-slate-900 dark:text-premium-text">31% of spend</span>
                </div>
                <div className="w-full bg-slate-50 dark:bg-premium-dark h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[31%]"></div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium italic">Commitments are currently within the safe "30-40%" range for your income profile.</p>
              </div>
            </div>
          )}

          {activeBucket === 'commitment' && (
            <div className="space-y-6">
              <div className="bg-[#0f172a] dark:bg-premium-card p-8 rounded-[40px] text-white space-y-4 shadow-xl">
                 <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">Commitment Intelligence</p>
                 <h3 className="text-3xl font-black tracking-tighter">₹5,500 <span className="text-sm font-medium opacity-50">/ mo</span></h3>
                 <p className="text-[9px] font-bold opacity-60 uppercase">Fixed obligations are locked for the next 4 months.</p>
              </div>
              <div className="p-8 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-[40px] flex items-center gap-6">
                <div className="bg-white dark:bg-premium-dark p-4 rounded-2xl text-amber-500"><CircleAlert size={24} /></div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1">Outflow Warning</h4>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-100/80">Next heavy outflow (₹1,650) is scheduled in exactly 4 days.</p>
                </div>
              </div>
            </div>
          )}

          {activeBucket === 'behavior' && (
            <div className="space-y-8">
               <section className="bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 p-8 rounded-[44px] shadow-sm space-y-8 h-[420px] relative">
                <div className="flex justify-center items-center gap-2">
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em] text-center">Service Value Mapping</h3>
                  <Info size={10} className="text-slate-400" />
                </div>
                <div className="relative h-64 w-full">
                  <div className="absolute -left-2 top-1/2 -rotate-90 origin-left text-[9px] font-black text-slate-300 dark:text-premium-muted/30 uppercase tracking-widest">Capital Cost</div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-300 dark:text-premium-muted/30 uppercase tracking-widest">Utility Score</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                      <XAxis type="number" dataKey="x" hide domain={[0, 100]} />
                      <YAxis type="number" dataKey="y" hide domain={[0, 60]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                        if (active && payload?.[0]) {
                          return (
                            <div className="bg-[#0f172a] dark:bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl">
                              {payload[0].payload.name}
                            </div>
                          );
                        }
                        return null;
                      }} />
                      <Scatter data={scatterData}>
                        {scatterData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'][index % 5]} className="cursor-pointer transition-transform hover:scale-125" />)}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest italic leading-relaxed">Behavioral spike detected: High impulse spending occurs on Sunday evenings.</p>
              </section>
            </div>
          )}

          {activeBucket === 'action' && (
            <div className="space-y-6">
              <div className="bg-emerald-600 rounded-[40px] p-8 text-white space-y-6 shadow-xl">
                 <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-60">Action Intelligence</p>
                 <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/5">
                      <Zap size={20} className="shrink-0" />
                      <p className="text-xs font-bold">Cancel Adobe CC → save ₹4,230 + gain 4 hours back</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/5">
                      <TrendingUp size={20} className="shrink-0" />
                      <p className="text-xs font-bold">Switch to yearly for Netflix → save ₹289/year</p>
                    </div>
                 </div>
              </div>
              <button className="w-full bg-[#0f172a] dark:bg-indigo-600 text-white py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.25em] shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all">
                Execute Recommended Actions <ArrowRight size={14} />
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Lex AI Intelligence Section */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          Lex Intelligence <Sparkles size={12} className="text-indigo-500" />
        </h3>
        <div className="bg-slate-50 dark:bg-premium-card border border-slate-100 dark:border-white/5 p-6 rounded-[40px] shadow-inner space-y-4 relative overflow-hidden">
          <div className="flex gap-2">
            <input className="flex-1 bg-white dark:bg-premium-dark border border-slate-100 dark:border-white/10 rounded-2xl px-5 py-4 text-sm focus:ring-1 focus:ring-indigo-500 outline-none dark:text-premium-text transition-all" placeholder="Tell me a story about my money..." value={lexQuery} onChange={(e) => setLexQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLexQuery()} />
            <button onClick={handleLexQuery} disabled={isLexLoading} className="bg-[#0f172a] dark:bg-indigo-600 text-white p-4 rounded-2xl shadow-lg active:scale-90 transition-all">
              {isLexLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <AnimatePresence>{lexResponse && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-premium-dark/50 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
              <p className="text-[11px] font-medium text-slate-700 dark:text-premium-muted leading-relaxed whitespace-pre-wrap">{lexResponse}</p>
              <div className="mt-4 pt-4 border-t border-slate-50 dark:border-white/5">
                 <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">LEX AI RECOMMENDATION: "Action Intelligence bucket contains your best ROI moves."</p>
              </div>
            </motion.div>
          )}</AnimatePresence>
        </div>
      </section>

      {/* Privacy First Analytics */}
      <div className="bg-zinc-950 dark:bg-premium-card rounded-[44px] p-10 text-white relative shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
        <Sparkles className="text-indigo-400 mb-6" size={28} />
        <h3 className="text-2xl font-black mb-3 tracking-tight">Privacy First Architecture</h3>
        <p className="text-[11px] text-zinc-400 dark:text-premium-muted leading-relaxed font-medium">
          FinIQ operates strictly on-device. Your capital flows, account numbers, and behavioral spikes never leave this silicon. We believe data privacy is the ultimate wealth.
        </p>
      </div>
    </div>
  );
};

export default Insights;
