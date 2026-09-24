import { Transaction, Category, AppSettings } from '../types/finance';
import { encryptData, decryptData } from './crypto';

const STORAGE_KEY_TX = 'pocket_ledger_vault_tx';
const STORAGE_KEY_SETTINGS = 'pocket_ledger_settings';
const STORAGE_KEY_CATEGORIES = 'pocket_ledger_categories';
const STORAGE_KEY_OFFLINE_QUEUE = 'pocket_ledger_offline_queue';

// Legacy keys for fallback migration
const LEGACY_STORAGE_KEY_TX = 'ssd_anuradhapura_vault_tx';
const LEGACY_STORAGE_KEY_SETTINGS = 'ssd_anuradhapura_settings';
const LEGACY_STORAGE_KEY_CATEGORIES = 'ssd_anuradhapura_categories';
const LEGACY_STORAGE_KEY_OFFLINE_QUEUE = 'ssd_anuradhapura_offline_queue';

export const DEFAULT_SETTINGS: AppSettings = {
  spreadsheetId: '1Bx92TL1K3U4q0l_0ocslKxavEmeyg1xFzp2BNkpB1LE',
  sheetName: 'Sheet1',
  appScriptUrl: 'https://script.google.com/macros/s/AKfycbzljX2BunJ5IgZ1firso1KZhSk53Uyi42--Vas_mkReMR5x9idQ11MvyIG5SEey6wbF/exec',
  autoSync: true,
  currencyPrefix: 'Rs',
  paddedFormat: false,
  securityPin: null,
  isEncrypted: true,
  theme: 'light',
};

export const DEFAULT_CATEGORIES: Category[] = [
  // Income
  { id: 'cat_sal', name: 'Salary & Wages', emoji: '💼', type: 'Income', color: '#16a34a' },
  { id: 'cat_biz', name: 'Business / Freelance Sales', emoji: '🏢', type: 'Income', color: '#0d9488' },
  { id: 'cat_inv', name: 'Investments / Returns', emoji: '📈', type: 'Income', color: '#2563eb' },
  { id: 'cat_gft', name: 'Gifts & Bonus', emoji: '🎁', type: 'Income', color: '#d97706' },
  { id: 'cat_inc_oth', name: 'Other Income', emoji: '🪙', type: 'Income', color: '#4b5563' },

  // Expenses
  { id: 'cat_groc', name: 'Groceries & Provisions', emoji: '🛒', type: 'Expense', color: '#dc2626' },
  { id: 'cat_food', name: 'Food & Dining', emoji: '🍔', type: 'Expense', color: '#ea580c' },
  { id: 'cat_trans', name: 'Fuel & Transport', emoji: '🚗', type: 'Expense', color: '#f59e0b' },
  { id: 'cat_bills', name: 'Utility & Power Bills', emoji: '⚡', type: 'Expense', color: '#ca8a04' },
  { id: 'cat_rent', name: 'Rent & Office Lease', emoji: '🏠', type: 'Expense', color: '#0284c7' },
  { id: 'cat_med', name: 'Health & Pharmacy', emoji: '💊', type: 'Expense', color: '#e11d48' },
  { id: 'cat_rep', name: 'Repairs & Maintenance', emoji: '🛠️', type: 'Expense', color: '#7c3aed' },
  { id: 'cat_ent', name: 'Entertainment & Leisure', emoji: '🎬', type: 'Expense', color: '#9333ea' },
  { id: 'cat_shpng', name: 'Shopping & Equipment', emoji: '🛍️', type: 'Expense', color: '#db2777' },
  { id: 'cat_debt', name: 'Bank Loan / EMI', emoji: '💳', type: 'Expense', color: '#475569' },
  { id: 'cat_exp_oth', name: 'Other Expenses', emoji: '📦', type: 'Expense', color: '#64748b' },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TX) || localStorage.getItem(LEGACY_STORAGE_KEY_TX);
    if (!raw) {
      // Initialize with seed data
      await saveTransactions(INITIAL_TRANSACTIONS);
      return INITIAL_TRANSACTIONS;
    }
    const decrypted = await decryptData<Transaction[]>(raw);
    if (decrypted && Array.isArray(decrypted)) {
      return decrypted;
    }
    return INITIAL_TRANSACTIONS;
  } catch (err) {
    console.error('Failed to load transactions:', err);
    return INITIAL_TRANSACTIONS;
  }
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  try {
    const encrypted = await encryptData(transactions);
    localStorage.setItem(STORAGE_KEY_TX, encrypted);
  } catch (err) {
    console.error('Failed to save transactions:', err);
    localStorage.setItem(STORAGE_KEY_TX, JSON.stringify(transactions));
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem(LEGACY_STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

export function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES) || localStorage.getItem(LEGACY_STORAGE_KEY_CATEGORIES);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (err) {
    console.error('Failed to save categories:', err);
  }
}

export function loadOfflineQueue(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_OFFLINE_QUEUE) || localStorage.getItem(LEGACY_STORAGE_KEY_OFFLINE_QUEUE);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: Transaction[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save offline queue:', err);
  }
}

/**
 * Image compressor for bill/receipt attachments
 * Compresses to max 1200px and 0.8 quality to keep browser storage fast and clean.
 */
export async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          base64: e.target?.result as string,
          mimeType: 'application/pdf',
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ base64: e.target?.result as string, mimeType: file.type });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        resolve({
          base64: compressedBase64,
          mimeType: 'image/jpeg',
        });
      };
      img.onerror = () => resolve({ base64: e.target?.result as string, mimeType: file.type });
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
