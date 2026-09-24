export type TransactionType = 'Income' | 'Expense';

export interface Category {
  id: string;
  name: string;
  emoji: string;
  type: TransactionType;
  color?: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD or YYYY.MM.DD
  timestamp: string; // YYYY.MM.DD HH:mm:ss
  type: TransactionType;
  category: string;
  description: string;
  amount: number;
  balance: number; // running balance after this transaction
  receipt?: string; // base64 or cloud url
  receiptName?: string;
  receiptType?: 'image' | 'pdf' | string;
  syncStatus: 'synced' | 'pending' | 'offline';
  notes?: string;
  createdAt: number;
}

export interface MonthlySummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  savingsRate: number; // percentage
  txCount: number;
  avgDailyExpense: number;
}

export interface DayData {
  day: number;
  dateStr: string;
  income: number;
  expense: number;
  net: number;
}

export interface WeekData {
  week: string;
  income: number;
  expense: number;
  net: number;
}

export interface CategoryBreakdown {
  category: string;
  emoji: string;
  amount: number;
  percentage: number;
  type: TransactionType;
}

export interface MonthlyReportData {
  monthName: string;
  year: number;
  monthIndex: number; // 0-11
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  dailyData: DayData[];
  weeklyData: WeekData[];
  categoryBreakdown: CategoryBreakdown[];
  transactions: Transaction[];
  topExpenseCategory?: string;
  highestExpenseDay?: { day: number; amount: number };
}

export interface AppSettings {
  spreadsheetId: string;
  sheetName: string;
  appsScriptUrl: string;
  autoSync: boolean;
  currencyPrefix: string;
  paddedFormat: boolean; // Rs 000,000,000,000.00 vs Rs 1,000.00
  securityPin: string | null; // PIN for encrypted app lock
  isEncrypted: boolean;
  theme: 'light' | 'dark' | 'system';
}
