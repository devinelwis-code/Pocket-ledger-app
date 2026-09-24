import React, { useState, useMemo } from 'react';
import { Transaction, MonthlyReportData, CategoryBreakdown, DayData, WeekData } from '../types/finance';
import { formatRs } from '../utils/currency';
import { exportToCSV, copyForGoogleSheets } from '../utils/csvExport';
import { generateMonthlyPDFReport } from '../utils/pdfExport';
import { Download, FileText, Check, ExternalLink, Calendar, Copy } from 'lucide-react';

interface ReportsModalProps {
  transactions: Transaction[];
  spreadsheetId: string;
  paddedFormat?: boolean;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ transactions, spreadsheetId, paddedFormat }) => {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Target reporting date
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Monthly report data compilation
  const reportData: MonthlyReportData = useMemo(() => {
    const monthTx = transactions.filter((tx) => {
      const clean = tx.date.replace(/\./g, '-');
      const d = new Date(clean + 'T00:00:00');
      return !isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const dayMap: { [day: number]: { income: number; expense: number } } = {};
    const catMap: { [cat: string]: { amount: number; emoji: string } } = {};
    const weekMap: { [wk: number]: { income: number; expense: number } } = {
      1: { income: 0, expense: 0 },
      2: { income: 0, expense: 0 },
      3: { income: 0, expense: 0 },
      4: { income: 0, expense: 0 },
    };

    for (let i = 1; i <= daysInMonth; i++) dayMap[i] = { income: 0, expense: 0 };

    let highestDay = { day: 1, amount: 0 };

    for (const tx of monthTx) {
      const clean = tx.date.replace(/\./g, '-');
      const d = new Date(clean + 'T00:00:00');
      const day = d.getDate();
      const weekNum = Math.min(Math.ceil(day / 7), 4);
      const amt = tx.amount || 0;

      if (tx.type === 'Income') {
        totalIncome += amt;
        dayMap[day].income += amt;
        weekMap[weekNum].income += amt;
      } else {
        totalExpense += amt;
        dayMap[day].expense += amt;
        weekMap[weekNum].expense += amt;

        if (dayMap[day].expense > highestDay.amount) {
          highestDay = { day, amount: dayMap[day].expense };
        }

        const cat = tx.category || '📦 Other';
        const emoji = cat.split(' ')[0] || '📦';
        if (!catMap[cat]) catMap[cat] = { amount: 0, emoji };
        catMap[cat].amount += amt;
      }
    }

    const dailyData: DayData[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dailyData.push({
        day: d,
        dateStr: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        income: dayMap[d].income,
        expense: dayMap[d].expense,
        net: dayMap[d].income - dayMap[d].expense,
      });
    }

    const weeklyData: WeekData[] = [
      { week: 'Week 1 (1st - 7th)', income: weekMap[1].income, expense: weekMap[1].expense, net: weekMap[1].income - weekMap[1].expense },
      { week: 'Week 2 (8th - 14th)', income: weekMap[2].income, expense: weekMap[2].expense, net: weekMap[2].income - weekMap[2].expense },
      { week: 'Week 3 (15th - 21st)', income: weekMap[3].income, expense: weekMap[3].expense, net: weekMap[3].income - weekMap[3].expense },
      { week: 'Week 4 (22nd - End)', income: weekMap[4].income, expense: weekMap[4].expense, net: weekMap[4].income - weekMap[4].expense },
    ];

    const categoryBreakdown: CategoryBreakdown[] = Object.keys(catMap)
      .map((catKey) => ({
        category: catKey,
        emoji: catMap[catKey].emoji,
        amount: catMap[catKey].amount,
        percentage: totalExpense > 0 ? (catMap[catKey].amount / totalExpense) * 100 : 0,
        type: 'Expense' as const,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      monthName,
      year: targetYear,
      monthIndex: targetMonth,
      totalIncome,
      totalExpense,
      netCashflow: totalIncome - totalExpense,
      dailyData,
      weeklyData,
      categoryBreakdown,
      transactions: monthTx,
      topExpenseCategory: categoryBreakdown[0]?.category,
      highestExpenseDay: highestDay.amount > 0 ? highestDay : undefined,
    };
  }, [transactions, targetYear, targetMonth, monthName]);

  const handleExportPDF = () => {
    generateMonthlyPDFReport(reportData, transactions);
  };

  const handleExportCSV = () => {
    exportToCSV(reportData.transactions, `Pocket_Ledger_${targetYear}_${reportData.monthName.replace(/\s+/g, '_')}.csv`);
  };

  const handleCopyTSV = async () => {
    const success = await copyForGoogleSheets(reportData.transactions);
    if (success) {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  const googleSheetsDirectUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="space-y-4 pb-12">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors font-bold text-sm"
        >
          &larr;
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Statement</span>
          </div>
          <div className="text-base font-extrabold text-slate-900">{monthName}</div>
        </div>
        <button
          onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
          disabled={selectedMonthOffset >= 0}
          className={`p-2 rounded-xl transition-colors font-bold text-sm ${
            selectedMonthOffset >= 0 ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          &rarr;
        </button>
      </div>

      {/* Export Action Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 py-3 px-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-red-600/20 active:scale-98 transition-all"
        >
          <FileText className="w-4 h-4" />
          <span>Download PDF</span>
        </button>

        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-md active:scale-98 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={handleCopyTSV}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-3 px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-2xl font-bold text-xs shadow-xs active:scale-98 transition-all"
        >
          {copiedNotification ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              <span>Copy for Sheet</span>
            </>
          )}
        </button>
      </div>

      {/* Google Sheet Live Connection Link */}
      <a
        href={googleSheetsDirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between p-3.5 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold transition-all group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
            GS
          </div>
          <div>
            <div className="font-extrabold text-slate-900">Connected Google Sheet</div>
            <div className="text-[11px] text-emerald-700">ID: {spreadsheetId.slice(0, 16)}...</div>
          </div>
        </div>
        <div className="flex items-center gap-1 font-bold text-emerald-700 group-hover:underline">
          <span>Open Sheet</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </a>

      {/* Automated Monthly Audit Summary Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <div className="text-sm font-extrabold text-slate-900">Pocket Ledger Financial Statement Audit</div>
          <div className="text-[11px] text-slate-500">Automated compilation of revenue &amp; operational expenses</div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500 font-semibold">Total Revenue / Inflow</div>
            <div className="text-base font-extrabold text-emerald-600 mt-1">
              {formatRs(reportData.totalIncome, { padded: paddedFormat })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {reportData.transactions.filter((t) => t.type === 'Income').length} credits recorded
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[11px] text-slate-500 font-semibold">Total Operational Expenses</div>
            <div className="text-base font-extrabold text-red-600 mt-1">
              {formatRs(reportData.totalExpense, { padded: paddedFormat })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {reportData.transactions.filter((t) => t.type === 'Expense').length} debits recorded
            </div>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Net Margin</div>
            <div
              className={`text-xs font-black mt-1 ${
                reportData.netCashflow >= 0 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {formatRs(reportData.netCashflow, { sign: true })}
            </div>
          </div>

          <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Top Expense</div>
            <div className="text-xs font-black text-slate-800 mt-1 truncate">
              {reportData.topExpenseCategory ? reportData.topExpenseCategory.split(' ')[0] + ' ' + reportData.topExpenseCategory.split(' ')[1] : 'None'}
            </div>
          </div>

          <div className="text-center p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Peak Day</div>
            <div className="text-xs font-black text-slate-800 mt-1">
              {reportData.highestExpenseDay ? `Day ${reportData.highestExpenseDay.day}` : '-'}
            </div>
          </div>
        </div>

        {/* Weekly Breakdown Table */}
        <div className="pt-2">
          <div className="text-xs font-bold text-slate-800 mb-2">Weekly Summary Breakdown</div>
          <div className="space-y-1.5">
            {reportData.weeklyData.map((wk, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100"
              >
                <span className="font-semibold text-slate-700">{wk.week}</span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 font-semibold">+{formatRs(wk.income)}</span>
                  <span className="text-red-600 font-semibold">-{formatRs(wk.expense)}</span>
                  <span className={`font-extrabold ${wk.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatRs(wk.net, { sign: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
