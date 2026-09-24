import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/finance';
import { formatRs, formatDateDisplay } from '../utils/currency';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Paperclip,
  Trash2,
  Calendar,
  RotateCw,
  Wifi,
  WifiOff,
  CloudCheck,
  Plus,
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  onOpenAddModal: () => void;
  onOpenLightbox: (url: string, isPdf: boolean, title?: string) => void;
  onDeleteTransaction: (id: string) => void;
  onManualSync: () => void;
  isSyncing: boolean;
  isOnline: boolean;
  offlineCount: number;
  paddedFormat?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  totalBalance,
  monthlyIncome,
  monthlyExpense,
  onOpenAddModal,
  onOpenLightbox,
  onDeleteTransaction,
  onManualSync,
  isSyncing,
  isOnline,
  offlineCount,
  paddedFormat,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All');

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === 'All' ? true : t.type === filterType;
      const matchSearch = searchTerm
        ? t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.date.includes(searchTerm)
        : true;
      return matchType && matchSearch;
    });
  }, [transactions, filterType, searchTerm]);

  return (
    <div className="space-y-4 pb-12">
      {/* 1. Brand Header with Live Sync Status */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center font-black text-xs shadow-md shadow-red-600/30 border border-red-500/50">
            PL
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold text-slate-900 leading-tight">
                Pocket Ledger
              </h1>
              <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.5 rounded-md">
                PRO
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Income &amp; Expense Vault</span>
            </div>
          </div>
        </div>

        {/* Sync Status Button */}
        <button
          onClick={onManualSync}
          disabled={isSyncing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
            isSyncing
              ? 'bg-amber-100 text-amber-800'
              : offlineCount > 0
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : isOnline
              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
              : 'bg-slate-200 text-slate-700'
          }`}
          title="Tap to sync with Google Sheet"
        >
          {isSyncing ? (
            <>
              <RotateCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>Syncing...</span>
            </>
          ) : offlineCount > 0 ? (
            <>
              <RotateCw className="w-3.5 h-3.5 text-amber-600" />
              <span>{offlineCount} Pending</span>
            </>
          ) : isOnline ? (
            <>
              <CloudCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-slate-500" />
              <span>Offline</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Main Financial Hero Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 text-white p-5 shadow-xl border border-red-900/40">
        {/* Subtle background glow effect */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
              Total Running Balance
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              Sri Lankan Rupees
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {formatRs(totalBalance, { padded: paddedFormat })}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Encrypted Local Vault
            </div>
          </div>

          {/* Monthly Inflow & Outflow Pill Cards */}
          <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-300 uppercase">Monthly Income</div>
                <div className="text-xs sm:text-sm font-extrabold text-emerald-400 truncate">
                  {formatRs(monthlyIncome, { padded: paddedFormat })}
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-slate-300 uppercase">Monthly Expenses</div>
                <div className="text-xs sm:text-sm font-extrabold text-red-400 truncate">
                  {formatRs(monthlyExpense, { padded: paddedFormat })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Row */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAddModal}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-red-600/30 flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>New Entry</span>
        </button>

        <button
          onClick={onManualSync}
          disabled={isSyncing}
          className="py-3 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-98"
          title="Force Sync with Google Sheets"
        >
          <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-red-600' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>

      {/* 4. Search and Category Filter Strip */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search transactions by title, category, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex gap-1.5">
          {(['All', 'Expense', 'Income'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterType(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === filter
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'All' ? 'All Records' : filter === 'Expense' ? '💸 Expenses Only' : '💰 Income Only'}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Transactions Ledger List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Ledger Records ({filteredTransactions.length})
          </span>
          <span className="text-[11px] text-slate-500 font-semibold">Newest first</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center space-y-2 shadow-xs">
            <div className="text-2xl">📝</div>
            <div className="text-xs font-extrabold text-slate-700">No Transactions Found</div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Tap "New Entry" above to add your first income or expense record!'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIncome = tx.type === 'Income';
            const hasAttachment = Boolean(tx.receipt && tx.receipt.trim().length > 0);
            const isPdf =
              tx.receiptType === 'pdf' ||
              (tx.receipt && tx.receipt.toLowerCase().includes('.pdf'));

            return (
              <div
                key={tx.id}
                className="bg-white rounded-2xl p-3.5 border border-slate-200/80 hover:border-slate-300 shadow-xs flex items-center justify-between gap-3 transition-all group"
              >
                {/* Left: Category Icon & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 ${
                      isIncome
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                  >
                    <span>{tx.category ? tx.category.split(' ')[0] : isIncome ? '💰' : '💸'}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                      {tx.description}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span className="truncate">{tx.category}</span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-0.5 shrink-0 text-slate-600">
                        <Calendar className="w-3 h-3" />
                        {formatDateDisplay(tx.date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Running Balance + Attach Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-xs sm:text-sm font-black ${
                        isIncome ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatRs(tx.amount, { padded: paddedFormat })}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                      Bal: {formatRs(tx.balance)}
                    </div>
                  </div>

                  {/* Attachment Icon Button */}
                  {hasAttachment && (
                    <button
                      onClick={() => onOpenLightbox(tx.receipt!, !!isPdf, tx.description)}
                      className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                      title="View attached bill/receipt"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${tx.description}"?`)) {
                        onDeleteTransaction(tx.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
