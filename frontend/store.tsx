
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, supabase } from './src/lib/api';
import { 
  Subscription, Expense, Goal, EMI, CashBalance, BankAccount, CategoryBudget,
  SubscriptionStatus, BillingCycle, PaymentMethod, GoalType, Friend, SharedExpense,
  LexMessage, LexBucket, LexAction, ActionResult, ModelTier, ProactiveAlert, MaturityForecast
} from './types';

interface AppState {
  userName: string;
  theme: 'light' | 'dark';
  isSecureMode: boolean;
  subscriptions: Subscription[];
  expenses: Expense[];
  goals: Goal[];
  emis: EMI[];
  bankAccounts: BankAccount[];
  budgets: CategoryBudget[];
  cashBalance: CashBalance;
  friends: Friend[];
  sharedExpenses: SharedExpense[];
  dataLoaded: boolean;
  // Lex conversational state (shared across screens)
  lexHistory: LexMessage[];
  lexTargetBucket: LexBucket | null;
  pendingActions: LexAction[];
  pastActions: LexAction[];
  actionResults: ActionResult[];
  conversationId: string | null;
  modelTier: ModelTier;
  setLexHistory: (history: LexMessage[]) => void;
  appendLexMessages: (messages: LexMessage[]) => void;
  setLexTargetBucket: (bucket: LexBucket | null) => void;
  clearLexSession: () => void;
  setPendingActions: (actions: LexAction[]) => void;
  appendPendingActions: (actions: LexAction[]) => void;
  addPastActions: (actions: LexAction[]) => void;
  clearPendingActions: () => void;
  setActionResults: (results: ActionResult[]) => void;
  setConversationId: (id: string | null) => void;
  setModelTier: (tier: ModelTier) => void;
  // Proactive Intelligence (Phase 4)
  proactiveAlerts: ProactiveAlert[];
  maturityForecast: MaturityForecast | null;
  setProactiveAlerts: (alerts: ProactiveAlert[]) => void;
  setMaturityForecast: (forecast: MaturityForecast | null) => void;
  dismissAlert: (id: number) => void;
  isAlertDismissedToday: (id: number) => boolean;
  markAlertRead: (id: number) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSecureMode: () => void;
  setSubscriptions: (subs: Subscription[]) => void;
  setExpenses: (exps: Expense[]) => void;
  setBankAccounts: (accounts: BankAccount[]) => void;
  setBudgets: (budgets: CategoryBudget[]) => void;
  setEmis: (emis: EMI[]) => void;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => void;
  cancelSubscription: (id: string) => void;
  renewSubscription: (id: string) => void;
  updateSubscription: (id: string, updates: Partial<Subscription>) => void;
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  updateGoal: (id: string, amount: number) => void;
  updateCashBalance: (amount: number) => void;
  addSharedExpense: (exp: Omit<SharedExpense, 'id'>) => void;
  settleWithFriend: (friendId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

// ── Helper: Map backend snake_case → frontend camelCase ──────────────
const mapSubscription = (raw: any): Subscription => ({
  id: String(raw.id),
  name: raw.name || '',
  category: raw.category || '',
  subcategory: raw.subcategory || '',
  amount: raw.amount || 0,
  billingCycle: raw.billing_cycle === 'yearly' ? BillingCycle.YEARLY : BillingCycle.MONTHLY,
  nextRenewalDate: raw.next_renewal_date || '',
  autoPay: raw.auto_pay ?? true,
  status: raw.status === 'cancelled' ? SubscriptionStatus.CANCELLED : SubscriptionStatus.ACTIVE,
  createdAt: raw.created_at || '',
  paymentSource: raw.payment_source,
  usageScore: raw.usage_score,
});

const mapExpense = (raw: any): Expense => ({
  id: String(raw.id),
  name: raw.name || '',
  category: raw.category || '',
  subcategory: raw.subcategory || '',
  tags: raw.tags || [],
  amount: raw.amount || 0,
  date: raw.date || '',
  paymentMethod: (raw.payment_method || 'upi') as PaymentMethod,
});

const mapBankAccount = (raw: any): BankAccount => ({
  id: String(raw.id),
  bankName: raw.bank_name || '',
  accountType: raw.account_type || 'Savings',
  balance: raw.balance || 0,
  lastFour: raw.last_four || '',
});

const mapBudget = (raw: any): CategoryBudget => ({
  id: String(raw.id),
  category: raw.category || '',
  monthlyLimit: raw.monthly_limit || 0,
  createdAt: raw.created_at || '',
});

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Varun', balance: 1250 },
  { id: 'f2', name: 'Rohan', balance: -450 },
  { id: 'f3', name: 'Isha', balance: 0 },
];

const MOCK_SHARED_EXPENSES: SharedExpense[] = [
  { id: 's1', description: 'Dinner at Social', amount: 3000, paidBy: 'me', date: '2024-11-05', involvedFriends: ['f1', 'f2'] },
  { id: 's2', description: 'Movie Tickets', amount: 900, paidBy: 'f2', date: '2024-11-04', involvedFriends: ['f1', 'me'] },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [userName, setUserName] = useState('');
  const [dataLoaded, setDataLoaded] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<Goal[]>([
    { id: 'g1', type: GoalType.SAVINGS, targetAmount: 50000, period: 'monthly', currentProgress: 0 },
  ]);
  const [emis, setEmis] = useState<EMI[]>([
    { id: 'emi1', name: 'Car Loan', monthlyAmount: 11000, dueDate: '2026-04-05' },
    { id: 'emi2', name: 'Phone EMI', monthlyAmount: 3400, dueDate: '2026-04-10' },
  ]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>(MOCK_SHARED_EXPENSES);
  const [cashBalance, setCashBalance] = useState<CashBalance>({ openingBalance: 0, currentBalance: 0 });

  // ── Fetch real data from backend on mount ───────────────────────────
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Get user's display name from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          if (user.user_metadata && user.user_metadata.name) {
            setUserName(user.user_metadata.name);
          } else if (user.email) {
            // Fallback for old accounts
            const emailFirstName = user.email.split('@')[0].split('.')[0];
            const displayName = emailFirstName.charAt(0).toUpperCase() + emailFirstName.slice(1).toLowerCase();
            setUserName(displayName);
          }
        }

        // Fetch all real data in parallel (allSettled so one failure doesn't block others)
        const [subsRes, expRes, bankRes, budgetRes] = await Promise.allSettled([
          api.get('/subscriptions'),
          api.get('/expenses'),
          api.get('/bank-accounts'),
          api.get('/budgets'),
        ]);

        // Map backend data → frontend types (log failures explicitly)
        if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value)) {
          setSubscriptions(subsRes.value.map(mapSubscription));
          console.log('DEBUG: Loaded', subsRes.value.length, 'subscriptions');
        } else if (subsRes.status === 'rejected') {
          console.error('DEBUG: Failed to fetch subscriptions:', subsRes.reason);
        }

        if (expRes.status === 'fulfilled' && Array.isArray(expRes.value)) {
          setExpenses(expRes.value.map(mapExpense));
          console.log('DEBUG: Loaded', expRes.value.length, 'expenses');
        } else if (expRes.status === 'rejected') {
          console.error('DEBUG: Failed to fetch expenses:', expRes.reason);
        }

        if (bankRes.status === 'fulfilled' && Array.isArray(bankRes.value)) {
          const allAccounts = bankRes.value.map(mapBankAccount);
          // Auto-cleanup: delete duplicate bank accounts and HDFC 3199 from DB
          const seen = new Set<string>();
          const keepAccounts: typeof allAccounts = [];
          const deleteIds: string[] = [];
          allAccounts.forEach(acc => {
            const key = `${acc.bankName.toLowerCase()}-${acc.lastFour}`;
            // Remove all HDFC 3199 entries
            if (acc.bankName.toLowerCase() === 'hdfc' && acc.lastFour === '3199') {
              deleteIds.push(acc.id);
              return;
            }
            // Dedup remaining by bankName + lastFour
            if (seen.has(key)) {
              deleteIds.push(acc.id);
            } else {
              seen.add(key);
              keepAccounts.push(acc);
            }
          });
          // Delete from backend
          if (deleteIds.length > 0) {
            console.log('DEBUG: Removing', deleteIds.length, 'bank accounts (duplicates + HDFC 3199)');
            deleteIds.forEach(id => {
              api.delete(`/bank-accounts/${id}`).catch(err =>
                console.warn('DEBUG: Failed to delete bank account:', id, err)
              );
            });
          }
          setBankAccounts(keepAccounts);
          console.log('DEBUG: Loaded', keepAccounts.length, 'bank accounts');
        } else if (bankRes.status === 'rejected') {
          console.error('DEBUG: Failed to fetch bank accounts:', bankRes.reason);
        }

        if (budgetRes.status === 'fulfilled' && Array.isArray(budgetRes.value)) {
          setBudgets(budgetRes.value.map(mapBudget));
          console.log('DEBUG: Loaded', budgetRes.value.length, 'budgets');
        } else if (budgetRes.status === 'rejected') {
          console.error('DEBUG: Failed to fetch budgets:', budgetRes.reason);
        }

        setDataLoaded(true);
      } catch (err) {
        console.warn('DEBUG: Failed to load user data, using empty state:', err);
        setDataLoaded(true);
      }
    };

    loadUserData();
  }, []);

  // Lex conversational memory
  const [lexHistory, setLexHistory] = useState<LexMessage[]>([]);
  const [lexTargetBucket, setLexTargetBucket] = useState<LexBucket | null>(null);
  const appendLexMessages = useCallback((msgs: LexMessage[]) => setLexHistory(prev => [...prev, ...msgs]), []);
  const clearLexSession = useCallback(() => { setLexHistory([]); setLexTargetBucket(null); setConversationId(null); }, []);

  // Conversation persistence
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [modelTier, setModelTier] = useState<ModelTier>('gpt-4o-mini');

  // Action execution state
  const [pendingActions, setPendingActions] = useState<LexAction[]>([]);
  const [pastActions, setPastActions] = useState<LexAction[]>([]);
  const [actionResults, setActionResults] = useState<ActionResult[]>([]);
  const appendPendingActions = useCallback((actions: LexAction[]) => setPendingActions(prev => [...prev, ...actions]), []);
  const addPastActions = useCallback((actions: LexAction[]) => setPastActions(prev => [...prev, ...actions]), []);
  const clearPendingActions = useCallback(() => { setPendingActions([]); setActionResults([]); }, []);

  // Proactive Intelligence state (Phase 4)
  const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlert[]>([]);
  const [maturityForecast, setMaturityForecast] = useState<MaturityForecast | null>(null);
  const dismissAlert = useCallback((id: number) => {
    // Persist dismiss to localStorage with today's date so it only comes back tomorrow
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const stored = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
    stored[id] = today;
    localStorage.setItem('dismissedAlerts', JSON.stringify(stored));
    setProactiveAlerts(prev => prev.filter(a => a.id !== id));
  }, []);
  const isAlertDismissedToday = useCallback((id: number) => {
    const today = new Date().toISOString().split('T')[0];
    const stored = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
    return stored[id] === today;
  }, []);
  const markAlertRead = useCallback((id: number) => {
    setProactiveAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }, []);

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
    if (t === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, []);

  const toggleSecureMode = useCallback(() => setIsSecureMode(prev => !prev), []);

  const addSubscription = useCallback((sub: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSub: Subscription = {
      ...sub,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    };
    setSubscriptions(prev => [...prev, newSub]);
  }, []);

  const cancelSubscription = useCallback((id: string) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: SubscriptionStatus.CANCELLED } : s));
  }, []);

  const renewSubscription = useCallback((id: string) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, status: SubscriptionStatus.ACTIVE } : s));
  }, []);

  const updateSubscription = useCallback((id: string, updates: Partial<Subscription>) => {
    setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const addExpense = useCallback((exp: Omit<Expense, 'id'>) => {
    const newExp: Expense = { ...exp, id: Math.random().toString(36).substr(2, 9) };
    setExpenses(prev => [newExp, ...prev]);
    if (exp.paymentMethod === PaymentMethod.CASH) {
      setCashBalance(prev => ({ ...prev, currentBalance: prev.currentBalance - exp.amount }));
    }
  }, []);

  const updateGoal = useCallback((id: string, amount: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, targetAmount: amount } : g));
  }, []);

  const updateCashBalance = useCallback((amount: number) => {
    setCashBalance(prev => ({ ...prev, currentBalance: amount }));
  }, []);

  const addSharedExpense = useCallback((exp: Omit<SharedExpense, 'id'>) => {
    const newExp: SharedExpense = { ...exp, id: Math.random().toString(36).substr(2, 9) };
    setSharedExpenses(prev => [newExp, ...prev]);
    // Logic to update friend balances would go here
  }, []);

  const settleWithFriend = useCallback((friendId: string) => {
    setFriends(prev => prev.map(f => f.id === friendId ? { ...f, balance: 0 } : f));
  }, []);

  return (
    <AppContext.Provider value={{ 
      userName, theme, setTheme, isSecureMode, toggleSecureMode, subscriptions, expenses, goals, emis, cashBalance, bankAccounts, budgets,
      friends, sharedExpenses, dataLoaded, lexHistory, lexTargetBucket, pendingActions, pastActions, actionResults,
      conversationId, modelTier,
      setLexHistory, appendLexMessages, setLexTargetBucket, clearLexSession,
      setPendingActions, appendPendingActions, addPastActions, clearPendingActions, setActionResults,
      setConversationId, setModelTier,
      proactiveAlerts, maturityForecast, setProactiveAlerts, setMaturityForecast, dismissAlert, isAlertDismissedToday, markAlertRead,
      setSubscriptions, setExpenses, setBankAccounts, setBudgets, setEmis,
      addSubscription, cancelSubscription, renewSubscription, updateSubscription, addExpense, updateGoal, updateCashBalance,
      addSharedExpense, settleWithFriend
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
