
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

export interface CategoryBudget {
  id: string;
  category: string;
  monthlyLimit: number;
  createdAt: string;
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

// --- Lex Intelligence Types ---

export type ModelTier = 'gpt-4o-mini' | 'gpt-4o';

export interface LexMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LexConversation {
  id: string;
  title: string;
  model: ModelTier;
  created_at: string;
  updated_at: string;
}

export interface LexAction {
  type: 'cancel_subscription' | 'reduce_budget' | 'switch_plan' | 'reallocate_surplus' | 'set_commitment' | 'invest_freed_capital';
  label: string;
  metadata: Record<string, any>;
}

export interface ActionResult {
  label: string;
  status: 'success' | 'failed' | 'skipped' | 'error';
  detail?: string;
  reason?: string;
}

export interface LexMeta {
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

export type LexBucket = 'money' | 'commitment' | 'behavior' | 'action' | 'spending' | 'debts';

// --- Proactive Intelligence Types (Phase 4) ---

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'maturity_drop'
  | 'maturity_surge'
  | 'burden_spike'
  | 'burden_critical'
  | 'volatility_surge'
  | 'persona_shift'
  | 'drift_increase'
  | 'maturity_forecast';

export interface ProactiveAlert {
  id: number;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric_deltas: Record<string, any>;
  suggested_action: string | null;
  suggested_action_type: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface MaturityForecast {
  current_score: number;
  slope: number;
  r_squared: number;
  confidence: 'high' | 'medium' | 'low';
  trajectory: 'improving' | 'declining' | 'stable';
  trajectory_label: string;
  predictions: number[];
  periods_ahead: number;
  data_points_used: number;
  historical_scores: number[];
}
