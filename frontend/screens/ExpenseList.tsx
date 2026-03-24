
import React, { useState } from 'react';
import { useApp } from '../store';
import { api } from '../src/lib/api';
import { 
  Plus, User, Coffee, Car, ShoppingBag, Dumbbell, PenTool, Trash2, X
} from 'lucide-react';
import { PaymentMethod, Expense } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Food', 'Transport', 'Essentials', 'Health', 'Entertainment', 'Shopping', 'Education', 'Other'];

const ExpenseList: React.FC<{ onNavigate?: (screen: string) => void }> = ({ onNavigate }) => {
  const { expenses, addExpense, updateExpense, deleteExpense, isSecureMode } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('Food');
  const [newPayment, setNewPayment] = useState<PaymentMethod>(PaymentMethod.UPI);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setNewName(exp.name);
    setNewAmount(String(exp.amount));
    setNewCategory(exp.category);
    setNewPayment(exp.paymentMethod);
  };

  const closeEditModal = () => {
    setEditingExpense(null);
    setNewName('');
    setNewAmount('');
    setNewCategory('Food');
    setNewPayment(PaymentMethod.UPI);
  };

  const getIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('food')) return <i className="fa-solid fa-mug-hot"></i>;
    if (c.includes('transport')) return <i className="fa-solid fa-car"></i>;
    if (c.includes('essentials')) return <i className="fa-solid fa-cart-shopping"></i>;
    if (c.includes('health')) return <i className="fa-solid fa-dumbbell"></i>;
    return <i className="fa-solid fa-bag-shopping"></i>;
  };

  const getSource = (method: string) => {
    if (method === PaymentMethod.UPI) return "HDFC Bank • 4242";
    if (method === PaymentMethod.CARD) return "ICICI Bank • 8821";
    return "CASH";
  };

  const mask = (val: number) => isSecureMode ? "••••" : `₹${val.toLocaleString()}`;

  return (
    <div className="p-6 pt-10 space-y-8 pb-32 bg-slate-50 dark:bg-premium-dark min-h-screen">
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-slate-900 dark:text-premium-text tracking-tight">Daily Spend</h1>
        <div className="flex gap-2">
          <button onClick={() => setEditMode(!editMode)} className={`w-9 h-9 rounded-full border flex items-center justify-center active:scale-95 transition-all ${editMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-premium-card border-slate-100 dark:border-white/5 text-slate-400'}`}><PenTool size={16} /></button>
          <button onClick={() => onNavigate?.('settings')} className="w-9 h-9 bg-[#0f172a] dark:bg-premium-card rounded-full border border-white/5 flex items-center justify-center text-white dark:text-premium-text active:scale-95 transition-all"><User size={18} /></button>
        </div>
      </header>

      <div className="flex justify-between items-center px-1">
        <h3 className="text-[10px] font-black text-slate-900 dark:text-premium-text uppercase tracking-[0.2em]">Expense Ledger</h3>
        <button onClick={() => setShowAdd(true)} className="bg-[#0f172a] dark:bg-indigo-600 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Plus size={22} /></button>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {expenses.map((exp, i) => (
            <motion.div 
              key={exp.id} 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }} 
              whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
              whileTap={{ scale: 0.97, boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}
              transition={{ delay: i * 0.05 }} 
              onClick={() => editMode && openEditModal(exp)}
              className={`bg-white dark:bg-premium-card p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 flex justify-between items-center group transition-all cursor-pointer active:scale-[0.98] relative ${editMode ? 'ring-2 ring-indigo-500/20' : ''}`}
            >
              {editMode && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try { await api.delete(`/expenses/${exp.id}`); } catch {}
                    deleteExpense(exp.id);
                  }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg z-10 active:scale-90 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-3xl bg-slate-50 dark:bg-premium-dark flex items-center justify-center text-slate-400 dark:text-premium-muted/50 text-xl border border-slate-100 dark:border-white/5 shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 group-active:bg-indigo-50 dark:group-active:bg-indigo-500/10 group-active:text-indigo-600 transition-colors">
                  {getIcon(exp.category)}
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-premium-text leading-tight tracking-tight text-lg">{exp.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400 dark:text-premium-muted/50 font-black uppercase tracking-widest">{exp.category}</span>
                    <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-white/10"></div>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-widest">{getSource(exp.paymentMethod)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-slate-900 dark:text-premium-text text-lg">{mask(exp.amount)}</p>
                <p className="text-[10px] text-slate-400 dark:text-premium-muted font-bold uppercase tracking-widest">{new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit' })}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[100] flex items-end" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-premium-dark w-full rounded-t-[48px] p-10 pb-12 shadow-2xl border-t border-white/5">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-10"></div>
            <h2 className="text-3xl font-black mb-10 dark:text-premium-text tracking-tight text-center">New Entry</h2>
            <div className="space-y-6">
              <input
                className="w-full bg-slate-50 dark:bg-premium-card border-none rounded-3xl p-6 font-bold outline-none dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Merchant Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                type="number"
                className="w-full bg-slate-50 dark:bg-premium-card border-none rounded-3xl p-6 font-black text-3xl outline-none dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="₹0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              {/* Category selector */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      newCategory === cat
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-50 dark:bg-premium-card text-slate-400 dark:text-premium-muted border border-slate-100 dark:border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* Payment method selector */}
              <div className="flex gap-2">
                {[PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.CASH].map(pm => (
                  <button
                    key={pm}
                    onClick={() => setNewPayment(pm)}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      newPayment === pm
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-50 dark:bg-premium-card text-slate-400 dark:text-premium-muted border border-slate-100 dark:border-white/5'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewAmount(''); }} className="flex-1 py-5 text-slate-400 dark:text-premium-muted font-black uppercase text-[10px] tracking-[0.2em] hover:text-rose-500 transition-colors">Discard</button>
              <button
                disabled={isSubmitting || !newName.trim() || !newAmount}
                onClick={async () => {
                  const amount = parseFloat(newAmount);
                  if (!newName.trim() || isNaN(amount) || amount <= 0) return;
                  setIsSubmitting(true);
                  try {
                    // Try persisting to backend / Supabase
                    await api.post('/expenses/', {
                      name: newName.trim(),
                      amount,
                      category: newCategory,
                      subcategory: '',
                      tags: [],
                      date: new Date().toISOString().split('T')[0],
                      paymentMethod: newPayment,
                    });
                  } catch (err) {
                    console.warn('Backend persist failed, saving locally:', err);
                  }
                  // Always add to local state so it appears immediately
                  addExpense({
                    name: newName.trim(),
                    amount,
                    category: newCategory,
                    subcategory: '',
                    tags: [],
                    date: new Date().toISOString().split('T')[0],
                    paymentMethod: newPayment,
                  });
                  setNewName('');
                  setNewAmount('');
                  setNewCategory('Food');
                  setNewPayment(PaymentMethod.UPI);
                  setIsSubmitting(false);
                  setShowAdd(false);
                }}
                className="flex-[2] bg-[#0f172a] dark:bg-indigo-600 text-white py-6 rounded-[28px] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all disabled:opacity-40"
              >
                {isSubmitting ? 'Posting...' : 'Post Transaction'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[100] flex items-end" onClick={closeEditModal}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-premium-dark w-full rounded-t-[48px] p-10 pb-12 shadow-2xl border-t border-white/5">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-8"></div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black dark:text-premium-text tracking-tight">Edit Expense</h2>
              <button onClick={closeEditModal} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-premium-card flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            <div className="space-y-6">
              <input
                className="w-full bg-slate-50 dark:bg-premium-card border-none rounded-3xl p-6 font-bold outline-none dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Merchant Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                type="number"
                className="w-full bg-slate-50 dark:bg-premium-card border-none rounded-3xl p-6 font-black text-3xl outline-none dark:text-premium-text placeholder:text-slate-300 dark:placeholder:text-premium-muted/30 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="₹0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      newCategory === cat
                        ? 'bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-50 dark:bg-premium-card text-slate-400 dark:text-premium-muted border border-slate-100 dark:border-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[PaymentMethod.UPI, PaymentMethod.CARD, PaymentMethod.CASH].map(pm => (
                  <button
                    key={pm}
                    onClick={() => setNewPayment(pm)}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      newPayment === pm
                        ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg'
                        : 'bg-slate-50 dark:bg-premium-card text-slate-400 dark:text-premium-muted border border-slate-100 dark:border-white/5'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4 mt-12">
              <button
                onClick={async () => {
                  try { await api.delete(`/expenses/${editingExpense.id}`); } catch {}
                  deleteExpense(editingExpense.id);
                  closeEditModal();
                }}
                className="flex-1 py-5 text-rose-500 font-black uppercase text-[10px] tracking-[0.2em] hover:text-rose-600 transition-colors"
              >
                Delete
              </button>
              <button
                disabled={isSubmitting || !newName.trim() || !newAmount}
                onClick={async () => {
                  const amount = parseFloat(newAmount);
                  if (!newName.trim() || isNaN(amount) || amount <= 0) return;
                  setIsSubmitting(true);
                  const updates = {
                    name: newName.trim(),
                    amount,
                    category: newCategory,
                    paymentMethod: newPayment,
                  };
                  try { await api.put(`/expenses/${editingExpense.id}`, updates); } catch {}
                  updateExpense(editingExpense.id, updates);
                  setIsSubmitting(false);
                  closeEditModal();
                }}
                className="flex-[2] bg-[#0f172a] dark:bg-indigo-600 text-white py-6 rounded-[28px] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all disabled:opacity-40"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
