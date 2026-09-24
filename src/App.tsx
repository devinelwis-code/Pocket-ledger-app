// @ts-nocheck
/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Transaction,
  Category,
  AppSettings,
  MonthlySummary,
} from './types/finance';
import {
  loadTransactions,
  saveTransactions,
  loadSettings,
  saveSettings,
  loadCategories,
  saveCategories,
  loadOfflineQueue,
  saveOfflineQueue,
  INITIAL_TRANSACTIONS,
} from './utils/storage';
import { syncTransactionToGoogleSheet, syncOfflineQueue } from './services/sheetsSync';
import { Dashboard } from './components/Dashboard';
import { VisualTrends } from './components/VisualTrends';
import { AddRecordModal } from './components/AddRecordModal';
import { ReportsModal } from './components/ReportsModal';
import { ReceiptsGallery } from './components/ReceiptsGallery';
import { SettingsModal } from './components/SettingsModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { Lightbox } from './components/Lightbox';
import {
  Home,
  BarChart3,
  Plus,
  FileSpreadsheet,
  Receipt,
  Settings,
  CheckCircle2,
  AlertCircle,
  Lock,
} from 'lucide-react';

export default function App(// --- GOOGLE SHEETS 2-MINUTE AUTO-PULL ---
  useEffect(() => {
    const autoPullFromSheet = async () => {
      // Your active deployment URL
      const appScriptUrl = 'https://script.google.com/macros/s/AKfycbzljX2BunJ5IgZ1firso1KZhSk53Uyi42--Vas_mkReMR5x9idQ11MvyIG5SEey6wbF/exec';
      
      if (!navigator.onLine) return; // Skip if phone has no internet
      
      try {
        const res = await fetch(appScriptUrl);
        const remoteData = await res.json();
        
        if (Array.isArray(remoteData)) {
          // 1. Get current local data to protect any unsynced offline records
          const localData = JSON.parse(localStorage.getItem('pocket_ledger_vault_tx') || '[]');
          const pending = localData.filter((tx: { syncStatus: string }) => tx.syncStatus === 'pending');
          
          // 2. Overwrite the local vault with Sheet data, but keep offline pending records
          const merged = [...remoteData, ...pending];
          localStorage.setItem('pocket_ledger_vault_tx', JSON.stringify(merged));
          
          // 3. Trigger the app to refresh the screen visually
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {
        console.error('Auto-pull failed', e);
      }
    };

    autoPullFromSheet(); // Run instantly when the app is opened
    
    // Set timer to run every 120,000 milliseconds (2 minutes)
    const interval = setInterval(autoPullFromSheet, 120000); 
    return () => clearInterval(interval);
  }, []);
  // ----------------------------------------) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trends' | 'reports' | 'files' | 'settings'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    url: string | null;
    isPdf: boolean;
    title?: string;
  }>({
    isOpen: false,
    url: null,
    isPdf: false,
  });

  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // App Lock State (if privacy PIN is enabled)
  const [isLocked, setIsLocked] = useState<boolean>(() => Boolean(settings.securityPin));
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      const txs = await loadTransactions();
      setTransactions(txs);
      setCategories(loadCategories());
      setOfflineQueueCount(loadOfflineQueue().length);
    };
    init();

    const handleOnline = () => {
      setIsOnline(true);
      showToast('Device reconnected online!', 'success');
      handleManualSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Device is offline. All records will be stored locally in encrypted vault.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Compute Monthly Summary
  const monthlySummary: MonthlySummary = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let inc = 0;
    let exp = 0;
    let txCount = 0;

    for (const tx of transactions) {
      const clean = tx.date.replace(/\./g, '-');
      const d = new Date(clean + 'T00:00:00');
      if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
        txCount++;
        if (tx.type === 'Income') inc += tx.amount;
        else exp += tx.amount;
      }
    }

    // Running balance is the balance of the newest transaction, or 0
    const totalBalance = transactions[0]?.balance ?? 0;
    const net = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;
    const daysSoFar = Math.max(now.getDate(), 1);

    return {
      totalBalance,
      monthlyIncome: inc,
      monthlyExpense: exp,
      netSavings: net,
      savingsRate: rate,
      txCount,
      avgDailyExpense: exp / daysSoFar,
    };
  }, [transactions]);

  // Recalculate running balance across all transactions in chronological order
  const recomputeBalances = (txList: Transaction[]): Transaction[] => {
    // Sort oldest first to calculate progressive balance
    const sorted = [...txList].sort((a, b) => a.createdAt - b.createdAt);
    let running = 0;
    for (const tx of sorted) {
      if (tx.type === 'Income') {
        running += tx.amount;
      } else {
        running -= tx.amount;
      }
      tx.balance = running;
    }
    // Return newest first for ledger view
    return sorted.reverse();
  };

  // Add a new transaction
  const handleAddTransaction = async (
    newTxData: Omit<Transaction, 'id' | 'balance' | 'createdAt' | 'syncStatus'>
  ) => {
    const newId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const createdAt = Date.now();

    const previousBalance = transactions[0]?.balance ?? 0;
    const computedBalance =
      newTxData.type === 'Income'
        ? previousBalance + newTxData.amount
        : previousBalance - newTxData.amount;

    const newTx: Transaction = {
      ...newTxData,
      id: newId,
      balance: computedBalance,
      createdAt,
      syncStatus: isOnline && settings.appsScriptUrl ? 'synced' : 'pending',
    };

    const updated = [newTx, ...transactions];
    const finalTransactions = recomputeBalances(updated);
    setTransactions(finalTransactions);
    await saveTransactions(finalTransactions);

    // Sync to Google Sheets
    if (isOnline && settings.appsScriptUrl) {
      setIsSyncing(true);
      const res = await syncTransactionToGoogleSheet(newTx, settings);
      setIsSyncing(false);
      if (res.success) {
        showToast('Record saved & synced to Google Sheet!', 'success');
      } else {
        // Enqueue offline
        const queue = loadOfflineQueue();
        queue.push(newTx);
        saveOfflineQueue(queue);
        setOfflineQueueCount(queue.length);
        showToast('Saved locally in encrypted storage (sync queued)', 'info');
      }
    } else {
      const queue = loadOfflineQueue();
      queue.push(newTx);
      saveOfflineQueue(queue);
      setOfflineQueueCount(queue.length);
      showToast('Record saved to offline encrypted database!', 'success');
    }
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    const remaining = transactions.filter((t) => t.id !== id);
    const finalTransactions = recomputeBalances(remaining);
    setTransactions(finalTransactions);
    await saveTransactions(finalTransactions);
    showToast('Record removed.', 'info');
  };

  // Manual Trigger Sync
  const handleManualSync = async () => {
    if (!isOnline) {
      showToast('Device is offline. Connect to network to sync.', 'error');
      return;
    }
    if (!settings.appsScriptUrl) {
      showToast('Please add your Google Apps Script URL in Settings.', 'info');
      setActiveTab('settings');
      return;
    }

    setIsSyncing(true);
    const res = await syncOfflineQueue(settings);
    setIsSyncing(false);
    setOfflineQueueCount(loadOfflineQueue().length);
    const refreshed = await loadTransactions();
    setTransactions(refreshed);

    if (res.success) {
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    showToast('Settings saved successfully!', 'success');
  };

  // Add Custom Category
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...newCat,
      id: `custom_${Date.now()}`,
    };
    const updated = [...categories, newCategory];
    setCategories(updated);
    saveCategories(updated);
    showToast(`Added category: ${newCat.emoji} ${newCat.name}`, 'success');
  };

  // Delete Category
  const handleDeleteCategory = (catId: string) => {
    const updated = categories.filter((c) => c.id !== catId);
    setCategories(updated);
    saveCategories(updated);
    showToast('Category deleted.', 'info');
  };

  // Unlock App
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === settings.securityPin) {
      setIsLocked(false);
      setPinError(null);
      setPinInput('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  // Reset to Demo Data
  const handleResetData = async () => {
    setTransactions(INITIAL_TRANSACTIONS);
    await saveTransactions(INITIAL_TRANSACTIONS);
    saveOfflineQueue([]);
    setOfflineQueueCount(0);
    showToast('Reset to demo seed data.', 'success');
  };

  // Import Backup
  const handleImportBackup = async (importedTxs: Transaction[]) => {
    const recomputed = recomputeBalances(importedTxs);
    setTransactions(recomputed);
    await saveTransactions(recomputed);
    showToast(`Imported ${importedTxs.length} records!`, 'success');
  };

  // App Lock Screen
  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-6 w-full max-w-xs text-center space-y-4 shadow-2xl border border-slate-700 animate-fadeIn">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Pocket Ledger</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your 4-digit Passcode PIN to access the encrypted financial ledger</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              maxLength={8}
              autoFocus
              inputMode="numeric"
              placeholder="&bull;&bull;&bull;&bull;"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError(null);
              }}
              className="w-full text-center tracking-widest text-2xl font-black py-2.5 bg-slate-50 border border-slate-300 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
            />
            {pinError && <p className="text-xs text-red-600 font-bold">{pinError}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md transition-all active:scale-98"
            >
              Unlock Vault
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex justify-center selection:bg-red-600 selection:text-white">
      {/* Mobile-first centered shell */}
      <div className="w-full max-w-lg min-h-screen bg-slate-50 flex flex-col relative shadow-2xl border-x border-slate-200/80">
        {/* Main Screen Views */}
        <main className="flex-1 p-4 pb-24 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={transactions}
              totalBalance={monthlySummary.totalBalance}
              monthlyIncome={monthlySummary.monthlyIncome}
              monthlyExpense={monthlySummary.monthlyExpense}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onOpenLightbox={(url, isPdf, title) =>
                setLightboxData({ isOpen: true, url, isPdf, title })
              }
              onDeleteTransaction={handleDeleteTransaction}
              onManualSync={handleManualSync}
              isSyncing={isSyncing}
              isOnline={isOnline}
              offlineCount={offlineQueueCount}
              paddedFormat={settings.paddedFormat}
            />
          )}

          {activeTab === 'trends' && (
            <VisualTrends transactions={transactions} paddedFormat={settings.paddedFormat} />
          )}

          {activeTab === 'reports' && (
            <ReportsModal
              transactions={transactions}
              spreadsheetId={settings.spreadsheetId}
              paddedFormat={settings.paddedFormat}
            />
          )}

          {activeTab === 'files' && (
            <ReceiptsGallery
              transactions={transactions}
              onOpenLightbox={(url, isPdf, title) =>
                setLightboxData({ isOpen: true, url, isPdf, title })
              }
              paddedFormat={settings.paddedFormat}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsModal
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              transactions={transactions}
              onImportBackup={handleImportBackup}
              onResetData={handleResetData}
            />
          )}
        </main>

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xs w-full px-3 animate-fadeIn pointer-events-none">
            <div
              className={`p-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white border ${
                toastMessage.type === 'success'
                  ? 'bg-slate-900/95 border-emerald-500/50'
                  : toastMessage.type === 'error'
                  ? 'bg-red-900/95 border-red-500/50'
                  : 'bg-slate-900/95 border-slate-700'
              }`}
            >
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 max-w-lg w-full bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-2 flex items-center justify-around z-40 shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'dashboard' ? 'text-red-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('trends')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'trends' ? 'text-red-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-[10px]">Trends</span>
          </button>

          {/* Center Prominent Add Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-red-700 text-white shadow-lg shadow-red-600/40 hover:scale-105 active:scale-95 transition-all -translate-y-2 border border-red-500/50"
            title="Add New Financial Entry"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'files' ? 'text-red-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span className="text-[10px]">Receipts</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              activeTab === 'reports' ? 'text-red-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px]">Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-2xl transition-all ${
              activeTab === 'settings' ? 'text-red-600 font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px]">Settings</span>
          </button>
        </nav>

        {/* Add Record Modal */}
        <AddRecordModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          categories={categories}
          onAddTransaction={handleAddTransaction}
          onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
        />

        {/* Category Manager Modal */}
        <CategoryManagerModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        {/* Fullscreen Lightbox Modal */}
        <Lightbox
          isOpen={lightboxData.isOpen}
          url={lightboxData.url}
          isPdf={lightboxData.isPdf}
          title={lightboxData.title}
          onClose={() => setLightboxData({ isOpen: false, url: null, isPdf: false })}
        />
      </div>
    </div>
  );
}
