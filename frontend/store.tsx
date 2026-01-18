
import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  Subscription, Expense, Goal, EMI, CashBalance, BankAccount,
  SubscriptionStatus, BillingCycle, PaymentMethod, GoalType, Friend, SharedExpense
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
  cashBalance: CashBalance;
  friends: Friend[];
  sharedExpenses: SharedExpense[];
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSecureMode: () => void;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => void;
  cancelSubscription: (id: string) => void;
  renewSubscription: (id: string) => void;
  addExpense: (exp: Omit<Expense, 'id'>) => void;
  updateGoal: (id: string, amount: number) => void;
  updateCashBalance: (amount: number) => void;
  addSharedExpense: (exp: Omit<SharedExpense, 'id'>) => void;
  settleWithFriend: (friendId: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const MOCK_SUBS: Subscription[] = [
  { id: '1', name: 'Netflix', category: 'Entertainment', subcategory: 'Streaming', amount: 499, billingCycle: BillingCycle.MONTHLY, nextRenewalDate: '2024-11-20', autoPay: true, status: SubscriptionStatus.ACTIVE, createdAt: '2024-01-01', paymentSource: 'ICICI Bank • 8821', usageScore: 88 },
  { id: '2', name: 'Spotify', category: 'Entertainment', subcategory: 'Music', amount: 119, billingCycle: BillingCycle.MONTHLY, nextRenewalDate: '2024-11-15', autoPay: true, status: SubscriptionStatus.ACTIVE, createdAt: '2024-02-01', paymentSource: 'HDFC Bank • 1024', usageScore: 92 },
  { id: '3', name: 'Amazon Prime', category: 'Shopping', subcategory: 'Membership', amount: 1499, billingCycle: BillingCycle.YEARLY, nextRenewalDate: '2024-12-05', autoPay: false, status: SubscriptionStatus.ACTIVE, createdAt: '2023-12-05', paymentSource: 'Credit Card • 4455', usageScore: 45 },
  { id: '4', name: 'ChatGPT Plus', category: 'Productivity', subcategory: 'AI', amount: 1650, billingCycle: BillingCycle.MONTHLY, nextRenewalDate: '2024-11-28', autoPay: true, status: SubscriptionStatus.ACTIVE, createdAt: '2024-05-10', paymentSource: 'UPI ID • @axl', usageScore: 98 },
  { id: '5', name: 'Adobe Creative Cloud', category: 'Design', subcategory: 'Professional', amount: 4230, billingCycle: BillingCycle.MONTHLY, nextRenewalDate: '2024-11-10', autoPay: true, status: SubscriptionStatus.ACTIVE, createdAt: '2024-03-15', paymentSource: 'ICICI Bank • 8821', usageScore: 12 },
  { id: '6', name: 'Old Gym', category: 'Health', subcategory: 'Fitness', amount: 2500, billingCycle: BillingCycle.MONTHLY, nextRenewalDate: '2024-11-10', autoPay: false, status: SubscriptionStatus.CANCELLED, createdAt: '2024-01-15' },
  { id: '7', name: 'Premium News', category: 'Education', subcategory: 'News', amount: 299, billingCycle: BillingCycle.MONTHLY, nextRenewalDate: '2024-11-10', autoPay: false, status: SubscriptionStatus.CANCELLED, createdAt: '2023-11-15' },
];

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'Varun', balance: 1250 },
  { id: 'f2', name: 'Rohan', balance: -450 },
  { id: 'f3', name: 'Isha', balance: 0 },
];

const MOCK_SHARED_EXPENSES: SharedExpense[] = [
  { id: 's1', description: 'Dinner at Social', amount: 3000, paidBy: 'me', date: '2024-11-05', involvedFriends: ['f1', 'f2'] },
  { id: 's2', description: 'Movie Tickets', amount: 900, paidBy: 'f2', date: '2024-11-04', involvedFriends: ['f1', 'me'] },
];

const MOCK_BANKS: BankAccount[] = [
  { id: 'b1', bankName: 'ICICI Bank', accountType: 'Savings', balance: 142500, lastFour: '8821' },
  { id: 'b2', bankName: 'HDFC Bank', accountType: 'Savings', balance: 28400, lastFour: '1024' },
];

const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', name: 'Blue Tokai Coffee', category: 'Food', subcategory: 'Cafe', tags: ['work'], amount: 350, date: '2024-11-04', paymentMethod: PaymentMethod.UPI },
  { id: 'e2', name: 'Grocery Run', category: 'Essentials', subcategory: 'Groceries', tags: ['home'], amount: 1200, date: '2024-11-03', paymentMethod: PaymentMethod.CARD },
  { id: 'e3', name: 'Rickshaw Ride', category: 'Transport', subcategory: 'Commute', tags: ['travel'], amount: 60, date: '2024-11-04', paymentMethod: PaymentMethod.CASH },
];

const MOCK_GOALS: Goal[] = [
  { id: 'g1', type: GoalType.SAVINGS, targetAmount: 50000, period: 'monthly', currentProgress: 12500 },
];

const MOCK_EMIS: EMI[] = [
  { id: 'm1', name: 'MacBook Air EMI', monthlyAmount: 5500, dueDate: '2024-11-05' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [isSecureMode, setIsSecureMode] = useState(false);
  const [userName] = useState('Aryan Singh');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(MOCK_SUBS);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [goals, setGoals] = useState<Goal[]>(MOCK_GOALS);
  const [emis] = useState<EMI[]>(MOCK_EMIS);
  const [bankAccounts] = useState<BankAccount[]>(MOCK_BANKS);
  const [friends, setFriends] = useState<Friend[]>(MOCK_FRIENDS);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>(MOCK_SHARED_EXPENSES);
  const [cashBalance, setCashBalance] = useState<CashBalance>({ openingBalance: 10000, currentBalance: 8500 });

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
      userName, theme, setTheme, isSecureMode, toggleSecureMode, subscriptions, expenses, goals, emis, cashBalance, bankAccounts,
      friends, sharedExpenses, addSubscription, cancelSubscription, renewSubscription, addExpense, updateGoal, updateCashBalance,
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
