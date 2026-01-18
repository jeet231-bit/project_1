
import React, { useState } from 'react';
import { 
  User, Bell, Shield, Eye, 
  HelpCircle, LogOut, ChevronRight, 
  Smartphone, Database, Coins
} from 'lucide-react';
import { useApp } from '../store';

const Settings: React.FC = () => {
  const { userName } = useApp();
  const [notifs, setNotifs] = useState(true);
  const [smsAccess, setSmsAccess] = useState(false);
  const [appUsage, setAppUsage] = useState(true);

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <button onClick={onToggle} className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${active ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${active ? 'left-6' : 'left-1'}`}></div>
    </button>
  );

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
              <Toggle active={false} onToggle={() => {}} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-[0.2em] ml-1">Data Control</h3>
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 border border-slate-100 dark:border-zinc-800 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600"><Coins size={18} /></div>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Base Currency</span>
              </div>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">INR (₹)</span>
            </div>
            <div className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="bg-slate-50 dark:bg-zinc-800 p-2.5 rounded-2xl text-slate-600"><Database size={18} /></div>
                <div>
                  <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">Export Vault</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Download full JSON profile</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </div>
          </div>
        </section>

        <button className="w-full flex items-center justify-center gap-3 py-4 text-rose-500 font-black uppercase text-[10px] tracking-widest">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="text-center pt-4 space-y-2 opacity-40">
        <div className="flex justify-center items-center gap-2">
          <Shield size={12} />
          <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted Storage</span>
        </div>
        <p className="text-[9px] font-bold">FinIQ v1.0.8 • Silicon Architecture</p>
      </div>
    </div>
  );
};

export default Settings;
