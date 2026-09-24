import React, { useState } from 'react';
import { Category, TransactionType } from '../types/finance';
import { X, Plus, Trash2 } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
}

const COMMON_EMOJIS = [
  '💼', '🏢', '📈', '🎁', '🤝', '🪙', '💰', '💵',
  '🛒', '🍔', '🚗', '⚡', '🏠', '💊', '🎬', '📚',
  '🛍️', '💳', '☕', '✈️', '🎮', '🐾', '💻', '🛠️',
  '🏥', '🏋️', '⛽', '📦', '🎓', '👶', '🍕', '🍻',
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onDeleteCategory,
}) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🛍️');
  const [type, setType] = useState<TransactionType>('Expense');
  const [activeListTab, setActiveListTab] = useState<TransactionType>('Expense');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCategory({
      name: name.trim(),
      emoji,
      type,
    });

    setName('');
  };

  const displayedList = categories.filter((c) => c.type === activeListTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Manage Categories</h2>
            <p className="text-[11px] text-slate-500">Custom categories with suitable financial emojis</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
          {/* Add Form */}
          <form onSubmit={handleSubmit} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-red-600" />
              <span>Create New Category</span>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setType('Expense')}
                className={`py-1.5 rounded-lg transition-colors ${
                  type === 'Expense' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('Income')}
                className={`py-1.5 rounded-lg transition-colors ${
                  type === 'Income' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income
              </button>
            </div>

            {/* Emoji Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 block mb-1">Select Suitable Emoji</label>
              <div className="flex gap-1.5 overflow-x-auto p-1.5 bg-white rounded-xl border border-slate-200 scrollbar-none">
                {COMMON_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setEmoji(em)}
                    className={`text-lg p-1.5 rounded-lg transition-all shrink-0 ${
                      emoji === em ? 'bg-red-100 scale-110 shadow-xs' : 'hover:bg-slate-100'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Name Input */}
            <div className="flex gap-2">
              <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-xl shrink-0">
                {emoji}
              </div>
              <input
                type="text"
                placeholder="Category Name (e.g. Pet Care, Internet)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 text-slate-900"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                Add
              </button>
            </div>
          </form>

          {/* Existing Categories List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800">Current Categories</span>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                <button
                  onClick={() => setActiveListTab('Expense')}
                  className={`px-2 py-0.5 rounded-md ${
                    activeListTab === 'Expense' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Expenses
                </button>
                <button
                  onClick={() => setActiveListTab('Income')}
                  className={`px-2 py-0.5 rounded-md ${
                    activeListTab === 'Income' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {displayedList.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="font-semibold text-slate-800">{cat.name}</span>
                  </div>
                  {/* Allow deleting custom categories */}
                  {cat.id.startsWith('custom_') && (
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
