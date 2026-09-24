import React, { useState, useMemo } from 'react';
import { Transaction, CategoryBreakdown, DayData, WeekData } from '../types/finance';
import { formatRs } from '../utils/currency';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart2, Calendar, Award } from 'lucide-react';

interface VisualTrendsProps {
  transactions: Transaction[];
  paddedFormat?: boolean;
}

export const VisualTrends: React.FC<VisualTrendsProps> = ({ transactions, paddedFormat }) => {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'line' | 'bar' | 'category'>('line');
  const [hoveredDay, setHoveredDay] = useState<DayData | null>(null);

  // Compute selected target date
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const monthName = targetDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();

  // Filter transactions for this month
  const monthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const clean = tx.date.replace(/\./g, '-');
      const d = new Date(clean + 'T00:00:00');
      return !isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
    });
  }, [transactions, targetYear, targetMonth]);

  // Aggregate monthly metrics
  const { totalIncome, totalExpense, netCashflow, savingsRate, dailyData, weeklyData, categoryBreakdown } =
    useMemo(() => {
      let income = 0;
      let expense = 0;
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

      const dayMap: { [day: number]: { income: number; expense: number } } = {};
      const catMap: { [cat: string]: { amount: number; emoji: string; type: 'Income' | 'Expense' } } = {};
      const weekMap: { [wk: number]: { income: number; expense: number } } = {
        1: { income: 0, expense: 0 },
        2: { income: 0, expense: 0 },
        3: { income: 0, expense: 0 },
        4: { income: 0, expense: 0 },
      };

      for (let i = 1; i <= daysInMonth; i++) {
        dayMap[i] = { income: 0, expense: 0 };
      }

      for (const tx of monthTransactions) {
        const clean = tx.date.replace(/\./g, '-');
        const d = new Date(clean + 'T00:00:00');
        const day = d.getDate();
        const amt = tx.amount || 0;
        const weekNum = Math.min(Math.ceil(day / 7), 4);

        if (tx.type === 'Income') {
          income += amt;
          if (dayMap[day]) dayMap[day].income += amt;
          if (weekMap[weekNum]) weekMap[weekNum].income += amt;
        } else {
          expense += amt;
          if (dayMap[day]) dayMap[day].expense += amt;
          if (weekMap[weekNum]) weekMap[weekNum].expense += amt;

          // Categorize expenses
          const cat = tx.category || '📦 Other Expenses';
          const emoji = cat.split(' ')[0] || '📦';
          if (!catMap[cat]) {
            catMap[cat] = { amount: 0, emoji, type: 'Expense' };
          }
          catMap[cat].amount += amt;
        }
      }

      const daily: DayData[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const inc = dayMap[day]?.income || 0;
        const exp = dayMap[day]?.expense || 0;
        daily.push({
          day,
          dateStr: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          income: inc,
          expense: exp,
          net: inc - exp,
        });
      }

      const weekly: WeekData[] = [
        { week: 'Week 1 (Day 1-7)', income: weekMap[1].income, expense: weekMap[1].expense, net: weekMap[1].income - weekMap[1].expense },
        { week: 'Week 2 (Day 8-14)', income: weekMap[2].income, expense: weekMap[2].expense, net: weekMap[2].income - weekMap[2].expense },
        { week: 'Week 3 (Day 15-21)', income: weekMap[3].income, expense: weekMap[3].expense, net: weekMap[3].income - weekMap[3].expense },
        { week: 'Week 4+ (Day 22-end)', income: weekMap[4].income, expense: weekMap[4].expense, net: weekMap[4].income - weekMap[4].expense },
      ];

      const categories: CategoryBreakdown[] = Object.keys(catMap)
        .map((catKey) => ({
          category: catKey,
          emoji: catMap[catKey].emoji,
          amount: catMap[catKey].amount,
          percentage: expense > 0 ? (catMap[catKey].amount / expense) * 100 : 0,
          type: 'Expense' as const,
        }))
        .sort((a, b) => b.amount - a.amount);

      const net = income - expense;
      const rate = income > 0 ? Math.round((net / income) * 100) : 0;

      return {
        totalIncome: income,
        totalExpense: expense,
        netCashflow: net,
        savingsRate: rate,
        dailyData: daily,
        weeklyData: weekly,
        categoryBreakdown: categories,
      };
    }, [monthTransactions, targetYear, targetMonth]);

  // Compute graph coordinates for the Line Graph
  const graphCoords = useMemo(() => {
    const width = 340;
    const height = 140;
    const paddingX = 14;
    const paddingY = 16;

    const maxVal = Math.max(
      ...dailyData.map((d) => Math.max(d.income, d.expense)),
      5000
    );

    const stepX = (width - paddingX * 2) / (dailyData.length - 1 || 1);

    const incomePoints = dailyData.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = height - paddingY - (d.income / maxVal) * (height - paddingY * 2);
      return { x, y, day: d };
    });

    const expensePoints = dailyData.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = height - paddingY - (d.expense / maxVal) * (height - paddingY * 2);
      return { x, y, day: d };
    });

    const incomePath = incomePoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const expensePath = expensePoints.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    // Area paths
    const lastX = paddingX + (dailyData.length - 1) * stepX;
    const bottomY = height - paddingY;
    const incomeAreaPath = `${incomePath} L ${lastX} ${bottomY} L ${paddingX} ${bottomY} Z`;
    const expenseAreaPath = `${expensePath} L ${lastX} ${bottomY} L ${paddingX} ${bottomY} Z`;

    return {
      width,
      height,
      incomePoints,
      expensePoints,
      incomePath,
      expensePath,
      incomeAreaPath,
      expenseAreaPath,
      maxVal,
    };
  }, [dailyData]);

  // Max value for bar graphs
  const maxBarVal = Math.max(
    ...dailyData.map((d) => Math.max(d.income, d.expense)),
    1000
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs">
        <button
          onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
          title="Previous Month"
        >
          <span className="text-sm font-bold">&larr;</span>
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5" />
            <span>Monthly Insights</span>
          </div>
          <div className="text-base font-extrabold text-slate-900">{monthName}</div>
        </div>
        <button
          onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
          disabled={selectedMonthOffset >= 0}
          className={`p-2 rounded-xl transition-colors ${
            selectedMonthOffset >= 0 ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="Next Month"
        >
          <span className="text-sm font-bold">&rarr;</span>
        </button>
      </div>

      {/* Top 3 High-Impact KPI Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Inflow</span>
          </div>
          <div className="mt-1 text-xs sm:text-sm font-extrabold text-emerald-700 truncate">
            {formatRs(totalIncome, { padded: paddedFormat })}
          </div>
        </div>

        <div className="bg-red-50/80 border border-red-200/80 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-red-800">
            <TrendingDown className="w-3.5 h-3.5 text-red-600" />
            <span>Outflow</span>
          </div>
          <div className="mt-1 text-xs sm:text-sm font-extrabold text-red-700 truncate">
            {formatRs(totalExpense, { padded: paddedFormat })}
          </div>
        </div>

        <div
          className={`rounded-2xl p-3 flex flex-col justify-between border ${
            netCashflow >= 0
              ? 'bg-blue-50/80 border-blue-200/80 text-blue-900'
              : 'bg-amber-50/80 border-amber-200/80 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-1 text-[11px] font-semibold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>Net Flow</span>
          </div>
          <div
            className={`mt-1 text-xs sm:text-sm font-extrabold truncate ${
              netCashflow >= 0 ? 'text-blue-700' : 'text-amber-700'
            }`}
          >
            {formatRs(netCashflow, { padded: paddedFormat, sign: true })}
          </div>
        </div>
      </div>

      {/* Graph View Selector Pills */}
      <div className="flex bg-slate-200/70 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('line')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'line' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span>Line Trend</span>
        </button>
        <button
          onClick={() => setActiveTab('bar')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'bar' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-red-600" />
          <span>Bar Comparison</span>
        </button>
        <button
          onClick={() => setActiveTab('category')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'category' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 text-indigo-600" />
          <span>Categories</span>
        </button>
      </div>

      {/* TAB 1: INTERACTIVE LINE GRAPH */}
      {activeTab === 'line' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">Daily Cashflow Trajectory</div>
              <div className="text-[11px] text-slate-500">Tap points along the line to inspect daily balance</div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Income
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Expense
              </span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative w-full overflow-hidden select-none">
            <svg
              viewBox={`0 0 ${graphCoords.width} ${graphCoords.height}`}
              className="w-full h-44 overflow-visible"
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Horizontal Guide Lines */}
              <line
                x1="10"
                y1={graphCoords.height - 16}
                x2={graphCoords.width - 10}
                y2={graphCoords.height - 16}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <line
                x1="10"
                y1={graphCoords.height / 2}
                x2={graphCoords.width - 10}
                y2={graphCoords.height / 2}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />

              {/* Shaded Areas */}
              <path d={graphCoords.incomeAreaPath} fill="url(#incomeGradient)" />
              <path d={graphCoords.expenseAreaPath} fill="url(#expenseGradient)" />

              {/* Line Strokes */}
              <path
                d={graphCoords.incomePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={graphCoords.expensePath}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points */}
              {graphCoords.incomePoints.map((pt, i) =>
                pt.day.income > 0 ? (
                  <circle
                    key={`inc_${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDay?.day === pt.day.day ? '5' : '3.5'}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all hover:scale-125"
                    onClick={() => setHoveredDay(pt.day)}
                  />
                ) : null
              )}

              {graphCoords.expensePoints.map((pt, i) =>
                pt.day.expense > 0 ? (
                  <circle
                    key={`exp_${i}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredDay?.day === pt.day.day ? '5' : '3.5'}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all hover:scale-125"
                    onClick={() => setHoveredDay(pt.day)}
                  />
                ) : null
              )}
            </svg>

            {/* X-Axis Day Markers */}
            <div className="flex justify-between text-[10px] text-slate-600 font-medium px-2 pt-1">
              <span>Day 1</span>
              <span>Day 7</span>
              <span>Day 14</span>
              <span>Day 21</span>
              <span>Day {dailyData.length}</span>
            </div>
          </div>

          {/* Interactive Inspection Card when a day is hovered / tapped */}
          {hoveredDay ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex items-center justify-between animate-fadeIn">
              <div>
                <span className="font-bold text-slate-800">Day {hoveredDay.day} Breakdown:</span>
                <span className="text-slate-500 ml-1">({hoveredDay.dateStr})</span>
              </div>
              <div className="flex gap-3">
                <span className="text-emerald-700 font-bold">+{formatRs(hoveredDay.income)}</span>
                <span className="text-red-700 font-bold">-{formatRs(hoveredDay.expense)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-1 text-[11px] text-slate-600 italic">
              Tap any green or red point above to preview that day's financial movement
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE BAR GRAPH */}
      {activeTab === 'bar' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Daily Activity Bars</div>
            <div className="text-[11px] text-slate-500">Compare incoming vs outgoing volume per calendar day</div>
          </div>

          {/* Daily dual bars scrollable */}
          <div className="overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-end gap-1.5 h-36 min-w-[500px] px-2 border-b border-slate-200">
              {dailyData.map((d) => {
                const incHeight = d.income > 0 ? Math.max(Math.round((d.income / maxBarVal) * 110), 6) : 2;
                const expHeight = d.expense > 0 ? Math.max(Math.round((d.expense / maxBarVal) * 110), 6) : 2;
                const isHovered = hoveredDay?.day === d.day;

                return (
                  <div
                    key={d.day}
                    onClick={() => setHoveredDay(d)}
                    className={`flex flex-col items-center flex-1 cursor-pointer group ${
                      isHovered ? 'bg-slate-100/80 rounded-t-lg' : ''
                    }`}
                  >
                    <div className="flex items-end gap-0.5 h-30 w-full justify-center">
                      <div
                        style={{ height: `${incHeight}px` }}
                        className={`w-1.5 sm:w-2 rounded-t-sm transition-all ${
                          d.income > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-transparent'
                        }`}
                        title={`Day ${d.day} Income: Rs ${d.income}`}
                      />
                      <div
                        style={{ height: `${expHeight}px` }}
                        className={`w-1.5 sm:w-2 rounded-t-sm transition-all ${
                          d.expense > 0 ? 'bg-red-500 group-hover:bg-red-600' : 'bg-transparent'
                        }`}
                        title={`Day ${d.day} Expense: Rs ${d.expense}`}
                      />
                    </div>
                    <span className="text-[9px] text-slate-600 group-hover:text-slate-900 font-medium mt-1">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Aggregation Comparison */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800">Weekly Net Inflow / Outflow</div>
            <div className="space-y-2">
              {weeklyData.map((w, idx) => {
                const isPositive = w.net >= 0;
                return (
                  <div key={idx} className="bg-slate-50 rounded-xl p-2.5 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
                      />
                      <span className="font-semibold text-slate-800">{w.week}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-[11px] text-slate-500">
                        <span className="text-emerald-600 font-semibold">+{formatRs(w.income)}</span> /{' '}
                        <span className="text-red-600 font-semibold">-{formatRs(w.expense)}</span>
                      </div>
                      <span
                        className={`font-extrabold ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}
                      >
                        {formatRs(w.net, { sign: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORY SPENDING BREAKDOWN */}
      {activeTab === 'category' && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">Spending by Category</div>
              <div className="text-[11px] text-slate-500">Visualizing where your funds were allocated</div>
            </div>
            {categoryBreakdown.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                {categoryBreakdown.length} Categories
              </span>
            )}
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No expense records recorded for this month yet.
            </div>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 truncate max-w-[200px]">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="truncate">{cat.category.replace(/^[^\s]+\s*/, '')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">
                        {formatRs(cat.amount, { padded: paddedFormat })}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-md min-w-[36px] text-right">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(cat.percentage, 3)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Financial Health & Habit Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-red-950 text-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Pocket Ledger Financial Health</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
            <div className="text-slate-300 text-[11px]">Monthly Savings Rate</div>
            <div
              className={`text-lg font-black mt-0.5 ${
                savingsRate >= 20 ? 'text-emerald-400' : savingsRate >= 0 ? 'text-amber-400' : 'text-red-400'
              }`}
            >
              {savingsRate}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {savingsRate >= 20 ? ' Excellent surplus' : savingsRate >= 0 ? ' Moderate surplus' : ' Deficit alert'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-xl p-2.5">
            <div className="text-slate-300 text-[11px]">Daily Burn Rate</div>
            <div className="text-lg font-black text-white mt-0.5">
              {formatRs(totalExpense / (dailyData.length || 1))}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Avg expense per day</div>
          </div>
        </div>
      </div>
    </div>
  );
};
