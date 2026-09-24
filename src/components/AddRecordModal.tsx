import React, { useState } from 'react';
import { Transaction, TransactionType, Category } from '../types/finance';
import { compressImage } from '../utils/storage';
import { X, Camera, Paperclip, Check, Plus, AlertCircle } from 'lucide-react';

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddTransaction: (
    newTx: Omit<Transaction, 'id' | 'balance' | 'createdAt' | 'syncStatus'>
  ) => Promise<void>;
  onOpenCategoryManager?: () => void;
}

export const AddRecordModal: React.FC<AddRecordModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddTransaction,
  onOpenCategoryManager,
}) => {
  const [type, setType] = useState<TransactionType>('Expense');
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [receiptType, setReceiptType] = useState<'image' | 'pdf'>('image');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === type);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.type === 'application/pdf';
      setReceiptName(file.name);
      setReceiptType(isPdf ? 'pdf' : 'image');

      const compressed = await compressImage(file);
      setReceiptBase64(compressed.base64);
    } catch (err) {
      console.error('File compression failed:', err);
      setErrorMsg('Failed to process attachment file.');
    }
  };

  const handleQuickAddAmount = (addValue: number) => {
    const current = parseFloat(amount) || 0;
    setAmount((current + addValue).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setErrorMsg('Please enter a description for this record.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const timeStampString = `${date.replace(/-/g, '.')} ${now.toTimeString().slice(0, 8)}`;

      // Category fallback
      const catToUse =
        selectedCategory ||
        (filteredCategories[0] ? `${filteredCategories[0].emoji} ${filteredCategories[0].name}` : '📦 Other');

      await onAddTransaction({
        date,
        timestamp: timeStampString,
        type,
        category: catToUse,
        description: description.trim(),
        amount: numericAmount,
        receipt: receiptBase64 || '',
        receiptName: receiptName || undefined,
        receiptType: receiptType,
      });

      // Reset
      setAmount('');
      setDescription('');
      setReceiptBase64(null);
      setReceiptName(null);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Failed to save: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Add Financial Record</h2>
            <p className="text-[11px] text-slate-500">Record will sync to Google Sheet &amp; encrypted ledger</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {errorMsg && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Toggle: Income vs Expense */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setType('Expense');
                setSelectedCategory('');
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                type === 'Expense'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Expense (-)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType('Income');
                setSelectedCategory('');
              }}
              className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                type === 'Income'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Income (+)</span>
            </button>
          </div>

          {/* Amount Input with big display */}
          <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-200/70 p-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Enter Amount in Rupees
            </label>
            <div className="flex items-center justify-center gap-1">
              <span className="text-2xl font-extrabold text-slate-400">Rs</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className="w-48 text-3xl font-black text-slate-900 bg-transparent text-center focus:outline-hidden focus:ring-0 placeholder:text-slate-300"
              />
            </div>

            {/* Quick add pill buttons */}
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              {[500, 1000, 2500, 5000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2 py-1 text-[11px] font-bold bg-white text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Category Picker with Emojis */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Category</label>
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="text-[11px] font-bold text-red-600 hover:underline flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" /> New
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200/60 scrollbar-none">
              {filteredCategories.map((c) => {
                const isSelected = selectedCategory === `${c.emoji} ${c.name}`;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(`${c.emoji} ${c.name}`)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all truncate ${
                      isSelected
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200/70 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base shrink-0">{c.emoji}</span>
                    <span className="truncate">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description / Source */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              {type === 'Income' ? 'Income Source / Particulars' : 'Expense Description / Purpose'}
            </label>
            <input
              type="text"
              placeholder={type === 'Income' ? 'e.g. Client Payment, Salary, Sales' : 'e.g. Fuel, Supermarket bill, Rent'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Date Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Transaction Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900"
            />
          </div>

          {/* Receipt / Bill Attachment Upload */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Expense Bill / Receipt Attachment (Optional)
            </label>

            {receiptBase64 ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                <div className="flex items-center gap-2 truncate">
                  {receiptType === 'pdf' ? (
                    <span className="p-1.5 bg-red-100 text-red-700 rounded-md font-bold text-[10px]">PDF</span>
                  ) : (
                    <img
                      src={receiptBase64}
                      alt="receipt preview"
                      className="w-8 h-8 rounded-md object-cover border border-emerald-300"
                    />
                  )}
                  <span className="truncate font-semibold text-emerald-900">{receiptName || 'Attached Document'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptBase64(null);
                    setReceiptName(null);
                  }}
                  className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-200 hover:border-red-400 rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50/50 hover:bg-red-50/30 transition-all text-slate-500">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-red-600" />
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </div>
                <span className="text-[11px] font-semibold text-slate-600">
                  Tap to snap photo or upload receipt (JPEG, PNG, PDF)
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-extrabold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                type === 'Income'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 shadow-emerald-600/30 hover:brightness-105 active:scale-98'
                  : 'bg-gradient-to-r from-red-600 to-red-700 shadow-red-600/30 hover:brightness-105 active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
