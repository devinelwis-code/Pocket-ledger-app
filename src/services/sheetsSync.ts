import { Transaction, AppSettings } from '../types/finance';
import { loadOfflineQueue, saveOfflineQueue, saveTransactions, loadTransactions } from '../utils/storage';

export interface SyncResult {
  success: boolean;
  message: string;
  syncedCount?: number;
  newBalance?: number;
}

/**
 * Syncs a single transaction to Google Apps Script Web App
 */
export async function syncTransactionToGoogleSheet(
  tx: Transaction,
  settings: AppSettings
): Promise<{ success: boolean; balance?: number; error?: string }> {
  if (!settings.appsScriptUrl || !settings.appsScriptUrl.startsWith('http')) {
    // No web app url configured yet; keep in offline / local state
    return { success: false, error: 'Google Apps Script Web App URL not set' };
  }

  try {
    const payload = {
      action: 'addTransaction',
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      category: tx.category,
      date: tx.date,
      receipt: tx.receipt || '',
      spreadsheetId: settings.spreadsheetId,
      sheetName: settings.sheetName || 'Sheet1',
    };

    // Google Apps Script Web App POST
    const response = await fetch(settings.appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // text/plain prevents CORS preflight issues with Google Apps Script
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      try {
        const json = await response.json();
        return {
          success: json.success ?? true,
          balance: json.balance,
        };
      } catch {
        return { success: true };
      }
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Processes any queued offline transactions
 */
export async function syncOfflineQueue(
  settings: AppSettings,
  onProgress?: (synced: number, total: number) => void
): Promise<SyncResult> {
  const queue = loadOfflineQueue();
  if (queue.length === 0) {
    return { success: true, message: 'All transactions are already synced.', syncedCount: 0 };
  }

  if (!navigator.onLine) {
    return { success: false, message: 'Device is offline. Will sync when reconnected.', syncedCount: 0 };
  }

  if (!settings.appsScriptUrl) {
    return { success: false, message: 'Google Apps Script URL is not set in Settings.', syncedCount: 0 };
  }

  let synced = 0;
  const remaining: Transaction[] = [];
  const currentTransactions = await loadTransactions();

  for (const item of queue) {
    const res = await syncTransactionToGoogleSheet(item, settings);
    if (res.success) {
      synced++;
      // Mark as synced in local transaction list
      const idx = currentTransactions.findIndex((t) => t.id === item.id);
      if (idx !== -1) {
        currentTransactions[idx].syncStatus = 'synced';
      }
    } else {
      remaining.push(item);
    }
    if (onProgress) onProgress(synced, queue.length);
  }

  saveOfflineQueue(remaining);
  await saveTransactions(currentTransactions);

  return {
    success: remaining.length === 0,
    message: `Synced ${synced} record${synced === 1 ? '' : 's'}${remaining.length > 0 ? `, ${remaining.length} pending` : ''}`,
    syncedCount: synced,
  };
}

/**
 * Returns complete, ready-to-deploy Google Apps Script Code
 * so users can paste directly into https://script.google.com for free with zero API keys.
 */
export function getAppsScriptDeploymentCode(spreadsheetId: string, sheetName = 'Sheet1'): string {
  return `// ============================================================
// POCKET LEDGER - Google Apps Script Backend (FREE - ZERO API KEY)
// Columns:
// A=TimeStamp | B=Income source | C=Income Amount |
// D=Expences  | E=Expense Amount | F=Balance | G=Attachment
// ============================================================

const SPREADSHEET_ID = '${spreadsheetId}';
const SHEET_NAME = '${sheetName}';

// Handle CORS Preflight and Web Requests
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getTransactions') {
    return createJsonResponse(getTransactions());
  } else if (action === 'getSummary') {
    return createJsonResponse(getSummary());
  }
  return createJsonResponse({ status: 'Pocket Ledger Backend Active', timestamp: new Date() });
}

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    if (contents.action === 'addTransaction') {
      const res = addTransaction(contents);
      return createJsonResponse(res);
    }
    return createJsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['TimeStamp', 'Income source', 'Amount', 'Expences', 'Amount', 'Balance', 'Attachment']);
    sheet.getRange(1, 1, 1, 7)
      .setFontWeight('bold')
      .setBackground('#8B0000')
      .setFontColor('#FFD700');
  }
  return sheet;
}

function getLastBalance() {
  try {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 0;
    const balCol = sheet.getRange(2, 6, lastRow - 1, 1).getValues();
    for (let i = balCol.length - 1; i >= 0; i--) {
      const raw = String(balCol[i][0]).replace(/[^0-9.\\-]/g, '');
      const val = parseFloat(raw);
      if (!isNaN(val) && val !== 0) return val;
    }
    return 0;
  } catch(e) {
    return 0;
  }
}

function addTransaction(data) {
  try {
    const sheet = getSheet();
    const lastBal = getLastBalance();
    const amount = parseFloat(data.amount) || 0;
    let newBalance;
    let rowData;

    const now = new Date();
    const tsString = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy.MM.dd HH:mm:ss');
    const desc = (data.category ? data.category + ' - ' : '') + (data.description || '');

    if (data.type === 'Income') {
      newBalance = lastBal + amount;
      rowData = [tsString, desc, amount, '', '', newBalance, data.receipt || ''];
    } else {
      newBalance = lastBal - amount;
      rowData = [tsString, '', '', desc, amount, newBalance, data.receipt || ''];
    }

    sheet.appendRow(rowData);
    const lastRow = sheet.getLastRow();
    if (data.type === 'Income') {
      sheet.getRange(lastRow, 3).setNumberFormat('#,##0.00');
    } else {
      sheet.getRange(lastRow, 5).setNumberFormat('#,##0.00');
    }
    sheet.getRange(lastRow, 6).setNumberFormat('"Rs "#,##0.00');

    return { success: true, id: 'row' + lastRow, balance: newBalance };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function getTransactions() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const list = [];
  data.forEach((row, i) => {
    const incAmt = parseFloat(String(row[2]).replace(/[^0-9.]/g, '')) || 0;
    const expAmt = parseFloat(String(row[4]).replace(/[^0-9.]/g, '')) || 0;
    const bal = parseFloat(String(row[5]).replace(/[^0-9.\\-]/g, '')) || 0;
    if (incAmt > 0) {
      list.push({ id: 'row' + (i+2), date: String(row[0]), type: 'Income', description: row[1], amount: incAmt, balance: bal, receipt: row[6] });
    } else if (expAmt > 0) {
      list.push({ id: 'row' + (i+2), date: String(row[0]), type: 'Expense', description: row[3], amount: expAmt, balance: bal, receipt: row[6] });
    }
  });
  return list.reverse();
}
`;
}
