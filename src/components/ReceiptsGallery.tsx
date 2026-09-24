import React, { useState } from 'react';
import { Transaction } from '../types/finance';
import { formatRs, formatDateDisplay } from '../utils/currency';
import { FileText, Search, ZoomIn, Calendar, Receipt } from 'lucide-react';

interface ReceiptsGalleryProps {
  transactions: Transaction[];
  onOpenLightbox: (url: string, isPdf: boolean, title?: string) => void;
  paddedFormat?: boolean;
}

export const ReceiptsGallery: React.FC<ReceiptsGalleryProps> = ({
  transactions,
  onOpenLightbox,
  paddedFormat,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const documents = transactions.filter(
    (t) => t.receipt && t.receipt.trim().length > 0
  );

  const filteredDocs = documents.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.description.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term) ||
      d.date.includes(term)
    );
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Search Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Bills &amp; Receipts Vault</h2>
            <p className="text-[11px] text-slate-500">Secure proof of purchase &amp; financial audit documents</p>
          </div>
          <span className="px-2.5 py-1 bg-red-100 text-red-700 font-extrabold text-xs rounded-full">
            {documents.length} Attachments
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search receipts by bill name, category, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Grid of Receipts */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-800">No Receipts Found</div>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
              {searchTerm
                ? 'No documents matched your search filter.'
                : 'Whenever you add an expense, tap the camera icon to attach an invoice or receipt!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredDocs.map((tx) => {
            const isPdf =
              tx.receiptType === 'pdf' ||
              (tx.receipt && tx.receipt.toLowerCase().includes('application/pdf')) ||
              (tx.receipt && tx.receipt.toLowerCase().includes('.pdf'));

            return (
              <div
                key={tx.id}
                onClick={() => onOpenLightbox(tx.receipt!, !!isPdf, tx.description)}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer group flex flex-col"
              >
                {/* Thumbnail */}
                <div className="aspect-4/3 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                  {isPdf ? (
                    <div className="flex flex-col items-center gap-1 text-red-600 p-3 text-center">
                      <FileText className="w-8 h-8" />
                      <span className="text-[10px] font-black uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded-sm">
                        PDF Document
                      </span>
                    </div>
                  ) : (
                    <img
                      src={tx.receipt}
                      alt={tx.description}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {/* Hover Zoom badge */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/90 backdrop-blur-xs text-slate-900 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
                      <ZoomIn className="w-3.5 h-3.5" /> View
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1">
                  <div>
                    <div className="text-xs font-extrabold text-slate-900 line-clamp-1">
                      {tx.description}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{tx.category}</div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-black text-red-600">
                      {formatRs(tx.amount, { padded: paddedFormat })}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDateDisplay(tx.date)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
