import { Transaction } from '../types/finance';

/**
 * Exports transactions to CSV matching Google Sheets columns:
 * TimeStamp | Income source | Amount | Expences | Amount | Balance | Attachment
 */
export function exportToCSV(transactions: Transaction[], filename = 'Pocket_Ledger_Transactions.csv'): void {
  // Sort oldest first for accounting ledger
  const sorted = [...transactions].sort((a, b) => a.createdAt - b.createdAt);

  const headers = ['TimeStamp', 'Income source', 'Amount', 'Expences', 'Amount', 'Balance', 'Attachment'];
  const rows: string[][] = [];

  for (const tx of sorted) {
    const isIncome = tx.type === 'Income';
    const timeStamp = tx.timestamp || tx.date;
    const incSource = isIncome ? tx.description : '';
    const incAmount = isIncome ? tx.amount.toFixed(2) : '';
    const expDesc = !isIncome ? tx.description : '';
    const expAmount = !isIncome ? tx.amount.toFixed(2) : '';
    const balance = tx.balance.toFixed(2);
    const attachment = tx.receipt || '';

    rows.push([
      `"${timeStamp}"`,
      `"${incSource.replace(/"/g, '""')}"`,
      incAmount,
      `"${expDesc.replace(/"/g, '""')}"`,
      expAmount,
      balance,
      `"${attachment.replace(/"/g, '""')}"`,
    ]);
  }

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies formatted TSV (Tab Separated Values) to clipboard for direct pasting into Google Sheets!
 */
export async function copyForGoogleSheets(transactions: Transaction[]): Promise<boolean> {
  const sorted = [...transactions].sort((a, b) => a.createdAt - b.createdAt);
  const rows: string[] = ['TimeStamp\tIncome source\tAmount\tExpences\tAmount\tBalance\tAttachment'];

  for (const tx of sorted) {
    const isIncome = tx.type === 'Income';
    const timeStamp = tx.timestamp || tx.date;
    const incSource = isIncome ? tx.description : '';
    const incAmount = isIncome ? tx.amount.toFixed(2) : '';
    const expDesc = !isIncome ? tx.description : '';
    const expAmount = !isIncome ? tx.amount.toFixed(2) : '';
    const balance = tx.balance.toFixed(2);
    const attachment = tx.receipt || '';

    rows.push(`${timeStamp}\t${incSource}\t${incAmount}\t${expDesc}\t${expAmount}\t${balance}\t${attachment}`);
  }

  try {
    await navigator.clipboard.writeText(rows.join('\n'));
    return true;
  } catch {
    return false;
  }
}
