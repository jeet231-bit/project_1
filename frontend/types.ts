
export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi'
}

export enum InsightType {
  SAVINGS = 'savings',
  RENEWAL = 'renewal',
  GOAL = 'goal'
}

export enum GoalType {
  SAVINGS = 'savings',
  EXPENSE_REDUCTION = 'expense_reduction'
}

export interface Subscription {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  amount: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  autoPay: boolean;
  status: SubscriptionStatus;
  createdAt: string;
  paymentSource?: string;
  usageScore?: number;
}

export interface Expense {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  tags: string[];
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: string;
  balance: number;
  lastFour: string;
}

export interface Goal {
  id: string;
  type: GoalType;
  targetAmount: number;
  period: 'weekly' | 'monthly';
  currentProgress: number;
}

export interface EMI {
  id: string;
  name: string;
  monthlyAmount: number;
  dueDate: string;
}

export interface CashBalance {
  openingBalance: number;
  currentBalance: number;
}

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  balance: number; // Positive: They owe me, Negative: I owe them
}

export interface SharedExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // 'me' or friendId
  date: string;
  involvedFriends: string[]; // Friend IDs
}
