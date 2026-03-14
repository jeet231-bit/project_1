import React, { useState } from 'react';
import { supabase } from '../src/lib/api';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    onBack: () => void;
}

const ForgotPasswordScreen: React.FC<Props> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password', // Ensure this route exists or logic handles it
            });
            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-premium-dark p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white dark:bg-premium-card rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-white/5"
            >
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors mb-6 text-sm font-bold uppercase tracking-widest"
                >
                    <ArrowLeft size={16} /> Back
                </button>

                <div className="mb-8">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reset Password</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                        Enter your email to receive recovery instructions.
                    </p>
                </div>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-2xl flex flex-col items-center text-center space-y-4"
                    >
                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={24} />
                        </div>
                        <p className="text-emerald-800 dark:text-emerald-200 font-bold text-sm">
                            Check your email for the reset link.
                        </p>
                    </motion.div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                                    placeholder="you@example.com"
                                />
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center gap-2 text-rose-500 text-sm bg-rose-50 dark:bg-rose-500/10 p-4 rounded-2xl"
                                >
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Send Recovery Link'}
                        </button>
                    </form>
                )}
            </motion.div>
        </div>
    );
};

export default ForgotPasswordScreen;
