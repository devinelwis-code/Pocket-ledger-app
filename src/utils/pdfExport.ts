import { jsPDF } from 'jspdf';
import { Transaction, MonthlyReportData } from '../types/finance';
import { formatRs } from './currency';

export function generateMonthlyPDFReport(report: MonthlyReportData, transactions: Transaction[]): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Background Accent (Deep Navy & Crimson)
  doc.setFillColor(15, 23, 42); // slate-900 / navy
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setFillColor(204, 0, 0); // Crimson accent strip
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('POCKET LEDGER', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('Official Monthly Financial Statement & Ledger Report', margin, 18);
  doc.text(`Period: ${report.monthName} ${report.year}`, margin, 24);

  // Top right generation timestamp
  const dateGenerated = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${dateGenerated}`, pageWidth - margin, 12, { align: 'right' });
  doc.text('Currency: Sri Lankan Rupees (Rs)', pageWidth - margin, 18, { align: 'right' });

  let currentY = 38;

  // Key Financial Highlights Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 28, 3, 3, 'FD');

  const colWidth = (pageWidth - margin * 2) / 3;

  // Income Box
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INCOME', margin + 6, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(22, 163, 74); // green
  doc.text(formatRs(report.totalIncome), margin + 6, currentY + 16);

  // Expense Box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EXPENSES', margin + colWidth + 6, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(204, 0, 0); // red
  doc.text(formatRs(report.totalExpense), margin + colWidth + 6, currentY + 16);

  // Net Cash Flow
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('NET CASH FLOW', margin + colWidth * 2 + 6, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const isPos = report.netCashflow >= 0;
  doc.setTextColor(isPos ? 22 : 204, isPos ? 163 : 0, isPos ? 74 : 0);
  doc.text(formatRs(report.netCashflow), margin + colWidth * 2 + 6, currentY + 16);

  // Secondary subtext
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const savingsRate = report.totalIncome > 0 ? ((report.netCashflow / report.totalIncome) * 100).toFixed(1) : '0';
  doc.text(`Savings Rate: ${savingsRate}% | Records: ${report.transactions.length}`, margin + 6, currentY + 23);

  currentY += 36;

  // Transactions Ledger Table Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Transaction Details', margin, currentY);
  currentY += 4;

  const tableHeaders = ['Date', 'Type', 'Category / Details', 'Amount (Rs)', 'Balance (Rs)'];
  const colX = [margin, margin + 22, margin + 44, pageWidth - margin - 50, pageWidth - margin - 22];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  doc.text(tableHeaders[0], colX[0] + 2, currentY + 5);
  doc.text(tableHeaders[1], colX[1] + 2, currentY + 5);
  doc.text(tableHeaders[2], colX[2] + 2, currentY + 5);
  doc.text(tableHeaders[3], colX[3] + 16, currentY + 5, { align: 'right' });
  doc.text(tableHeaders[4], colX[4] + 18, currentY + 5, { align: 'right' });

  currentY += 8;

  // Sort monthly transactions chronologically
  const txList = [...report.transactions].sort((a, b) => (a.date > b.date ? 1 : -1));

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  for (let i = 0; i < txList.length; i++) {
    const tx = txList[i];

    // Check page overflow
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 18;

      // Table Header on new page
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, currentY, pageWidth - margin * 2, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(tableHeaders[0], colX[0] + 2, currentY + 5);
      doc.text(tableHeaders[1], colX[1] + 2, currentY + 5);
      doc.text(tableHeaders[2], colX[2] + 2, currentY + 5);
      doc.text(tableHeaders[3], colX[3] + 16, currentY + 5, { align: 'right' });
      doc.text(tableHeaders[4], colX[4] + 18, currentY + 5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      currentY += 8;
    }

    // Alternating row background
    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY - 1, pageWidth - margin * 2, 6.5, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.text(tx.date, colX[0] + 2, currentY + 3.5);

    // Type with color
    if (tx.type === 'Income') {
      doc.setTextColor(22, 163, 74);
      doc.text('+ Income', colX[1] + 2, currentY + 3.5);
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text('- Expense', colX[1] + 2, currentY + 3.5);
    }

    // Description truncated
    doc.setTextColor(15, 23, 42);
    const desc = tx.description || tx.category || 'Transaction';
    const cleanDesc = desc.length > 36 ? desc.substring(0, 34) + '...' : desc;
    doc.text(cleanDesc, colX[2] + 2, currentY + 3.5);

    // Amount
    if (tx.type === 'Income') {
      doc.setTextColor(22, 163, 74);
      doc.text(`+${formatRs(tx.amount)}`, colX[3] + 16, currentY + 3.5, { align: 'right' });
    } else {
      doc.setTextColor(220, 38, 38);
      doc.text(`-${formatRs(tx.amount)}`, colX[3] + 16, currentY + 3.5, { align: 'right' });
    }

    // Balance
    doc.setTextColor(71, 85, 105);
    doc.text(formatRs(tx.balance), colX[4] + 18, currentY + 3.5, { align: 'right' });

    currentY += 6.5;
  }

  // Footer on final page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text('Pocket Ledger Financial Tracker • Encrypted Personal Ledger', margin, pageHeight - 7);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // Save the document
  const fileName = `Pocket_Ledger_Report_${report.year}_${report.monthName.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
