import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, ArrowRight } from 'lucide-react';

interface LandingScreenProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ onGetStarted, onLogin }) => {
  return (
    <div className="min-h-screen bg-[#0E1116] text-white flex flex-col items-center justify-between px-6 py-10 overflow-hidden relative">
      {/* Background glow effects */}
      <div className="absolute top-[-120px] left-[-80px] w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-60px] w-[250px] h-[250px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Spndwisee
            </span>
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
            AI Capital Discipline Engine
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10 space-y-3"
        >
          <p className="text-lg text-slate-300 leading-relaxed">
            Find where your capital leaks.
          </p>
          <p className="text-lg text-slate-300 leading-relaxed">
            Redirect it.
          </p>
          <p className="text-lg font-semibold text-white leading-relaxed">
            Build disciplined wealth.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          {[
            { icon: TrendingUp, label: 'Surplus Engine' },
            { icon: Shield, label: 'Discipline Score' },
            { icon: Zap, label: 'AI Strategist' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300"
            >
              <Icon size={14} className="text-blue-400" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="w-full max-w-sm z-10 space-y-4"
      >
        <button
          onClick={onGetStarted}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 active:scale-[0.97] transition-all flex items-center justify-center gap-3"
        >
          Start Your Capital Engine
          <ArrowRight size={20} />
        </button>

        <button
          onClick={onLogin}
          className="w-full py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          Already have an account? <span className="text-blue-400 font-semibold">Log In</span>
        </button>
      </motion.div>
    </div>
  );
};

export default LandingScreen;
