import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';

interface LightboxProps {
  isOpen: boolean;
  onClose: () => void;
  url: string | null;
  isPdf: boolean;
  title?: string;
}

export const Lightbox: React.FC<LightboxProps> = ({
  isOpen,
  onClose,
  url,
  isPdf,
  title,
}) => {
  if (!isOpen || !url) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center"
      >
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between pb-3 text-white">
          <div className="font-bold text-sm truncate pr-4 text-slate-200">
            {title || 'Receipt Document Attachment'}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download="Pocket_Ledger_Receipt_Attachment"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Download or open original"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer content */}
        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-white/10 p-2">
          {isPdf ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-white space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <div className="text-base font-bold">PDF Document File</div>
                <p className="text-xs text-slate-400 mt-1">Tap below to view full document in your browser PDF viewer</p>
              </div>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg"
              >
                <span>Open PDF Document</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt="Receipt Preview"
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
            />
          )}
        </div>
      </div>
    </div>
  );
};
