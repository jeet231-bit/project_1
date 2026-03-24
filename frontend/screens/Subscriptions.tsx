
import React, { useState, useMemo } from 'react';
import { useApp } from '../store';
import type { Subscription } from '../types';
import { 
  Plus, User, ChevronUp, ArrowRight, Play, Calendar, ArrowLeft, Music, Ghost, ShieldCheck, X,
  Tv, Film, Palette, PenTool, Bot, Headphones, ShoppingBag, Cloud, Gamepad2, Newspaper,
  Video, Code, Briefcase, UtensilsCrossed, Car, Dumbbell, Globe, Shield, Laptop,
  BookOpen, Wifi, CreditCard, MonitorSmartphone, MessageCircle, Sparkles, Repeat
} from 'lucide-react';
import { SubscriptionStatus, BillingCycle } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// Extracted card component — owns its own hover state (fixes Rules of Hooks violation)
const SubCard: React.FC<{ sub: Subscription; onViewDetail: (id: string) => void; getSubIcon: (name: string, active: boolean) => React.ReactNode; editMode?: boolean; onCancel?: (id: string) => void; onEdit?: (sub: Subscription) => void }> = ({ sub, onViewDetail, getSubIcon, editMode, onCancel, onEdit }) => {
  const [hover, setHover] = useState(false);
  return (
    <motion.div
      key={sub.id}
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
      onClick={() => editMode ? onEdit?.(sub) : onViewDetail(sub.id)}
      className={`bg-white dark:bg-premium-card p-6 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-sm hover:shadow-xl hover:scale-[1.02] active:shadow-xl active:scale-[0.97] transition-all duration-300 cursor-pointer group relative ${editMode ? 'ring-2 ring-indigo-500/20' : ''}`}
    >
      {editMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onCancel?.(sub.id); }}
          className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg z-10 active:scale-90 transition-all"
        >
          <X size={14} />
        </button>
      )}
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4 items-center">
          <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-premium-dark flex items-center justify-center text-slate-900 dark:text-premium-text text-xl border border-slate-100 dark:border-white/5 shrink-0 group-hover:bg-slate-900 dark:group-hover:bg-indigo-600 group-hover:text-white group-active:bg-slate-900 dark:group-active:bg-indigo-600 group-active:text-white transition-colors duration-300">
            {getSubIcon(sub.name, hover)}
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-premium-text text-lg leading-tight tracking-tight">{sub.name}</h4>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub.subcategory || sub.category}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-slate-900 dark:text-premium-text text-lg">₹{sub.amount.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sub.billingCycle}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="px-4 py-2 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-premium-dark text-slate-500 dark:text-premium-muted/50 hover:bg-slate-100 dark:hover:bg-white/5 hover:scale-[1.05] active:bg-slate-100 dark:active:bg-white/5 active:scale-[1.05] transition-all duration-200">
          <Calendar size={12} className="text-slate-400" />
          Renewed
        </div>
        <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-premium-dark text-slate-400 dark:text-premium-muted/50 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-white/5 hover:scale-[1.05] active:bg-slate-100 dark:active:bg-white/5 active:scale-[1.05] transition-all duration-200">
          <ShieldCheck size={12} className={sub.autoPay ? "text-indigo-500" : "text-slate-300"} />
          {sub.autoPay ? 'Auto' : 'Manual'}
        </div>
      </div>

      {sub.usageScore !== undefined && sub.usageScore < 20 && (
        <div className="mt-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-500 p-3 rounded-2xl flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
          <p className="text-[10px] font-black uppercase tracking-widest">Attention Leak: Low Usage Detected</p>
        </div>
      )}
    </motion.div>
  );
};

interface SubsProps {
  onViewDetail: (id: string) => void;
  onNavigate?: (screen: string) => void;
}

const SubSubscriptions: React.FC<SubsProps> = ({ onViewDetail, onNavigate }) => {
  const { subscriptions, renewSubscription, cancelSubscription, deleteSubscription, updateSubscription, addSubscription, theme } = useApp();
  const [view, setView] = useState<'active' | 'cancelled'>('active');
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [leftOffset, setLeftOffset] = useState('24px');

  React.useEffect(() => {
    const handleResize = () => {
      const offset = Math.max(24, (window.innerWidth / 2) - 210);
      setLeftOffset(`${offset}px`);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add subscription form state
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Entertainment');
  const [newCycle, setNewCycle] = useState<BillingCycle>(BillingCycle.MONTHLY);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditSub = (sub: Subscription) => {
    setEditingSub(sub);
    setNewName(sub.name);
    setNewAmount(String(sub.amount));
    setNewCategory(sub.category);
    setNewCycle(sub.billingCycle);
  };

  const closeEditSub = () => {
    setEditingSub(null);
    setNewName('');
    setNewAmount('');
    setNewCategory('Entertainment');
    setNewCycle(BillingCycle.MONTHLY);
  };

  const filteredSubs = useMemo(() => subscriptions.filter(s => 
    view === 'active' ? s.status === SubscriptionStatus.ACTIVE : s.status === SubscriptionStatus.CANCELLED
  ), [subscriptions, view]);

  const totalRetained = useMemo(() => {
    return subscriptions
      .filter(s => s.status === SubscriptionStatus.CANCELLED)
      .reduce((acc, sub) => acc + (sub.billingCycle === BillingCycle.MONTHLY ? sub.amount * 12 : sub.amount), 0);
  }, [subscriptions]);

  const getSubIcon = (name: string, isHovered: boolean) => {
    const n = name.toLowerCase();
    const s = isHovered ? { color: 'white' } : { color: 'currentColor' };
    const f = isHovered ? 'white' : 'currentColor';
    const sz = 22;

    // Streaming & Video
    if (n.includes('netflix') || n.includes('prime video')) return <Tv size={sz} style={s} />;
    if (n.includes('disney') || n.includes('hotstar')) return <Sparkles size={sz} style={s} />;
    if (n.includes('youtube')) return <Film size={sz} style={s} />;
    if (n.includes('hbo') || n.includes('hulu') || n.includes('peacock') || n.includes('jio cinema') || n.includes('sonyliv') || n.includes('zee5') || n.includes('voot') || n.includes('mubi')) return <Video size={sz} style={s} />;
    if (n.includes('crunchyroll') || n.includes('funimation')) return <Play size={sz} fill={f} style={s} />;

    // Music & Audio
    if (n.includes('spotify') || n.includes('apple music') || n.includes('youtube music') || n.includes('gaana') || n.includes('wynk') || n.includes('jiosaavn') || n.includes('tidal')) return <Music size={sz} style={s} />;
    if (n.includes('audible') || n.includes('podcast')) return <Headphones size={sz} style={s} />;

    // AI & Productivity
    if (n.includes('chatgpt') || n.includes('openai') || n.includes('claude') || n.includes('copilot') || n.includes('gemini') || n.includes('perplexity') || n.includes('midjourney')) return <Bot size={sz} style={s} />;
    if (n.includes('notion') || n.includes('obsidian') || n.includes('evernote') || n.includes('todoist')) return <BookOpen size={sz} style={s} />;
    if (n.includes('microsoft') || n.includes('office') || n.includes('365')) return <Laptop size={sz} style={s} />;
    if (n.includes('slack') || n.includes('teams') || n.includes('discord') || n.includes('telegram')) return <MessageCircle size={sz} style={s} />;
    if (n.includes('zoom') || n.includes('meet') || n.includes('webex')) return <MonitorSmartphone size={sz} style={s} />;

    // Creative & Design
    if (n.includes('adobe') || n.includes('photoshop') || n.includes('illustrator') || n.includes('lightroom') || n.includes('canva')) return <Palette size={sz} style={s} />;
    if (n.includes('figma') || n.includes('sketch') || n.includes('invision')) return <PenTool size={sz} style={s} />;

    // Dev Tools
    if (n.includes('github') || n.includes('gitlab') || n.includes('bitbucket') || n.includes('vercel') || n.includes('netlify') || n.includes('heroku') || n.includes('aws') || n.includes('azure')) return <Code size={sz} style={s} />;

    // Cloud & Storage
    if (n.includes('google') || n.includes('icloud') || n.includes('dropbox') || n.includes('onedrive') || n.includes('drive')) return <Cloud size={sz} style={s} />;

    // Shopping & Delivery
    if (n.includes('amazon') || n.includes('flipkart') || n.includes('blinkit') || n.includes('zepto') || n.includes('bigbasket') || n.includes('meesho')) return <ShoppingBag size={sz} style={s} />;
    if (n.includes('swiggy') || n.includes('zomato') || n.includes('uber eats') || n.includes('doordash')) return <UtensilsCrossed size={sz} style={s} />;

    // Transport & Mobility
    if (n.includes('uber') || n.includes('ola') || n.includes('rapido') || n.includes('lyft')) return <Car size={sz} style={s} />;

    // VPN & Security
    if (n.includes('vpn') || n.includes('nord') || n.includes('express') || n.includes('surfshark') || n.includes('proton')) return <Shield size={sz} style={s} />;

    // Internet & Telecom
    if (n.includes('airtel') || n.includes('jio') || n.includes('vi ') || n.includes('bsnl') || n.includes('wifi') || n.includes('broadband') || n.includes('internet')) return <Wifi size={sz} style={s} />;

    // Gaming
    if (n.includes('xbox') || n.includes('playstation') || n.includes('steam') || n.includes('nintendo') || n.includes('ea play') || n.includes('game pass')) return <Gamepad2 size={sz} style={s} />;

    // News & Reading
    if (n.includes('news') || n.includes('times') || n.includes('economist') || n.includes('medium') || n.includes('substack') || n.includes('kindle')) return <Newspaper size={sz} style={s} />;

    // Fitness & Health
    if (n.includes('gym') || n.includes('fitness') || n.includes('cult') || n.includes('peloton') || n.includes('strava') || n.includes('fitbit') || n.includes('noom')) return <Dumbbell size={sz} style={s} />;

    // Professional & Career
    if (n.includes('linkedin') || n.includes('coursera') || n.includes('udemy') || n.includes('skillshare') || n.includes('masterclass') || n.includes('unacademy')) return <Briefcase size={sz} style={s} />;

    // Insurance & Finance
    if (n.includes('insurance') || n.includes('emi') || n.includes('loan') || n.includes('mutual fund')) return <CreditCard size={sz} style={s} />;

    // Generic subscription fallback
    return <Repeat size={sz} style={s} />;
  };

  if (view === 'cancelled') {
    return (
      <div className="p-6 pt-10 space-y-8 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">Past Leaks</h1>
          <div className="flex gap-2">
            <button onClick={() => setView('active')} className="w-10 h-10 rounded-xl bg-white dark:bg-premium-card border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400"><ArrowLeft size={18} /></button>
          </div>
        </header>

        <div className="bg-emerald-600 dark:bg-emerald-700 rounded-[36px] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60 mb-2">Annually Retained</p>
          <h2 className="text-4xl font-black tracking-tighter">₹{totalRetained.toLocaleString()}</h2>
          <p className="text-[10px] opacity-70 mt-3 font-medium uppercase tracking-widest">Saved from cancelled services</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-widest px-2">Inactive Commitments</h3>
          
          {filteredSubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 bg-white dark:bg-premium-card rounded-[40px] border border-slate-100 dark:border-white/5">
              <Ghost className="text-slate-200 dark:text-premium-muted/20" size={48} />
              <p className="text-xs font-bold text-slate-400 dark:text-premium-muted uppercase tracking-widest">No past leaks detected</p>
            </div>
          ) : (
            filteredSubs.map((sub) => (
              <motion.div 
                key={sub.id} 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-premium-card p-6 rounded-[32px] border border-slate-100 dark:border-white/5 flex justify-between items-center group shadow-sm"
              >
                <div className="flex gap-5 items-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-premium-dark rounded-2xl flex items-center justify-center text-slate-300 dark:text-premium-muted/30">{getSubIcon(sub.name, false)}</div>
                  <div>
                    <h4 className="font-black text-slate-800 dark:text-premium-text tracking-tight">{sub.name}</h4>
                    <p className="text-[10px] font-black text-slate-300 dark:text-premium-muted/30 uppercase tracking-widest">Terminated</p>
                  </div>
                </div>
                <button onClick={() => renewSubscription(sub.id)} className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] active:scale-95 transition-all">Reactivate</button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen transition-colors">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">SubX Portfolio</h1>
        <div className="flex gap-2">
          <button onClick={() => setEditMode(!editMode)} className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-95 transition-all ${editMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-premium-card border-slate-100 dark:border-white/5 text-slate-400'}`}><PenTool size={16} /></button>
          <button onClick={() => setShowAdd(true)} className="w-9 h-9 bg-white dark:bg-premium-card rounded-full border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-800 dark:text-white transition-colors active:scale-95"><Plus size={18} /></button>
          <button onClick={() => onNavigate?.('settings')} className="w-9 h-9 bg-[#0f172a] dark:bg-premium-card rounded-full flex items-center justify-center text-white active:scale-95 transition-all"><User size={18} /></button>
        </div>
      </header>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em]">Live Portfolios</h3>
        <button 
          onClick={() => setView('cancelled')} 
          className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest flex items-center gap-1.5 border-b border-indigo-600/10 dark:border-indigo-400/10 pb-1 active:opacity-50 transition-all"
        >
          View Past Leaks <ArrowRight size={12} />
        </button>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredSubs.map((sub) => (
            <SubCard key={sub.id} sub={sub} onViewDetail={onViewDetail} getSubIcon={getSubIcon} editMode={editMode} onCancel={cancelSubscription} onEdit={openEditSub} />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Subscription Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-premium-card rounded-t-[40px] p-8 pb-24 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-premium-text uppercase tracking-widest">New Commitment</h3>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-premium-dark flex items-center justify-center text-slate-400"><X size={16} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Service Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Netflix, Spotify" className="w-full bg-slate-50 dark:bg-premium-dark border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (₹)</label>
                    <input value={newAmount} onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="499" type="text" inputMode="decimal" className="w-full bg-slate-50 dark:bg-premium-dark border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Billing Cycle</label>
                    <div className="flex bg-slate-50 dark:bg-premium-dark border border-slate-100 dark:border-white/5 rounded-2xl p-1">
                      {[BillingCycle.MONTHLY, BillingCycle.YEARLY].map(c => (
                        <button key={c} onClick={() => setNewCycle(c)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newCycle === c ? 'bg-white dark:bg-premium-card shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Entertainment', 'Music', 'Productivity', 'Cloud', 'AI', 'Shopping', 'Food', 'Fitness', 'Finance', 'Other'].map(cat => (
                      <button key={cat} onClick={() => setNewCategory(cat)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-premium-dark text-slate-400 border border-slate-100 dark:border-white/5'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                disabled={!newName.trim() || !newAmount || isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    addSubscription({
                      name: newName.trim(),
                      amount: parseFloat(newAmount),
                      category: newCategory,
                      subcategory: newCategory,
                      billingCycle: newCycle,
                      nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                      autoPay: false,
                      status: SubscriptionStatus.ACTIVE,
                    });
                    setNewName(''); setNewAmount(''); setNewCategory('Entertainment'); setNewCycle(BillingCycle.MONTHLY);
                    setShowAdd(false);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                  !newName.trim() || !newAmount ? 'bg-slate-100 dark:bg-premium-dark text-slate-300 dark:text-premium-muted/30 cursor-not-allowed' : 'bg-[#0f172a] dark:bg-indigo-600 text-white active:scale-95 shadow-xl'
                }`}
              >
                <Plus size={16} /> Add Commitment
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Subscription Modal */}
      <AnimatePresence>
        {editingSub && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={closeEditSub}
          >
            <motion.div
              initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-premium-card rounded-t-[40px] p-8 pb-24 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-premium-text uppercase tracking-widest">Edit Commitment</h3>
                <button onClick={closeEditSub} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-premium-dark flex items-center justify-center text-slate-400"><X size={16} /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Service Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Netflix, Spotify" className="w-full bg-slate-50 dark:bg-premium-dark border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (₹)</label>
                    <input value={newAmount} onChange={(e) => setNewAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="499" type="text" inputMode="decimal" className="w-full bg-slate-50 dark:bg-premium-dark border border-slate-100 dark:border-white/5 rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Billing Cycle</label>
                    <div className="flex bg-slate-50 dark:bg-premium-dark border border-slate-100 dark:border-white/5 rounded-2xl p-1">
                      {[BillingCycle.MONTHLY, BillingCycle.YEARLY].map(c => (
                        <button key={c} onClick={() => setNewCycle(c)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newCycle === c ? 'bg-white dark:bg-premium-card shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {['Entertainment', 'Music', 'Productivity', 'Cloud', 'AI', 'Shopping', 'Food', 'Fitness', 'Finance', 'Other'].map(cat => (
                      <button key={cat} onClick={() => setNewCategory(cat)} className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 dark:bg-premium-dark text-slate-400 border border-slate-100 dark:border-white/5'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    deleteSubscription(editingSub.id);
                    closeEditSub();
                  }}
                  className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Delete
                </button>
                <button
                  disabled={!newName.trim() || !newAmount || isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      updateSubscription(editingSub.id, {
                        name: newName.trim(),
                        amount: parseFloat(newAmount),
                        category: newCategory,
                        subcategory: newCategory,
                        billingCycle: newCycle,
                      });
                      closeEditSub();
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                    !newName.trim() || !newAmount ? 'bg-slate-100 dark:bg-premium-dark text-slate-300 dark:text-premium-muted/30 cursor-not-allowed' : 'bg-[#0f172a] dark:bg-indigo-600 text-white active:scale-95 shadow-xl'
                  }`}
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubSubscriptions;
