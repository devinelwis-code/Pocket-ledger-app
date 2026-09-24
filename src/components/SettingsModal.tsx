import React, { useState } from 'react';
import { AppSettings, Transaction } from '../types/finance';
import { getAppsScriptDeploymentCode } from '../services/sheetsSync';
import {
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  Code,
  Download,
  Upload,
  RefreshCw,
  Coins,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  transactions: Transaction[];
  onImportBackup: (txs: Transaction[]) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  transactions,
  onImportBackup,
  onResetData,
}) => {
  const [appsScriptUrl, setAppsScriptUrl] = useState(settings.appsScriptUrl);
  const [spreadsheetId, setSpreadsheetId] = useState(settings.spreadsheetId);
  const [paddedFormat, setPaddedFormat] = useState(settings.paddedFormat);
  const [securityPin, setSecurityPin] = useState(settings.securityPin || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = () => {
    onUpdateSettings({
      ...settings,
      appsScriptUrl: appsScriptUrl.trim(),
      spreadsheetId: spreadsheetId.trim(),
      paddedFormat,
      securityPin: securityPin.trim() || null,
    });
    setSaveStatus('Settings updated successfully!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleCopyScriptCode = async () => {
    const code = getAppsScriptDeploymentCode(spreadsheetId);
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch {
      alert('Unable to copy code to clipboard.');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Pocket_Ledger_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          onImportBackup(json);
          alert(`Successfully imported ${json.length} transaction records!`);
        }
      } catch {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4 pb-12">
      {saveStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* 1. Google Sheets & Free Apps Script Setup */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              GS
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Google Sheets Sync (Free)</h3>
              <p className="text-[11px] text-slate-500">Run for free with Google Apps Script without API keys</p>
            </div>
          </div>
          <a
            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>Open Sheet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Target Google Spreadsheet ID</label>
            <input
              type="text"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="18l67nRFpXUpbdOJjanCYDbXJdIlIHOj9n15DOEXPmYo"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Google Apps Script Web App URL (Optional for live sync)
            </label>
            <input
              type="url"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-800 focus:bg-white focus:ring-2 focus:ring-red-500"
            />
            <p className="text-[10px] text-slate-600 mt-1">
              Leave blank to use 100% offline encrypted local storage, or paste your deployed web app URL.
            </p>
          </div>

          {/* Copy Script Code Button & Quick Guide */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleCopyScriptCode}
              className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Code className="w-4 h-4" />}
              <span>{copiedCode ? 'Google Apps Script Code Copied!' : 'Copy Free Apps Script Code'}</span>
            </button>
          </div>

          {/* Collapsible 1-minute setup instruction */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <button
              type="button"
              onClick={() => setShowCodeGuide(!showCodeGuide)}
              className="w-full p-2.5 flex items-center justify-between text-left font-bold text-slate-700 text-[11px]"
            >
              <span>How to setup Google Apps Script for free in 2 mins</span>
              {showCodeGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showCodeGuide && (
              <div className="p-3 pt-0 text-[11px] text-slate-600 space-y-1.5 border-t border-slate-200/60 font-sans">
                <p>1. Open your Google Sheet.</p>
                <p>2. Click <strong>Extensions &gt; Apps Script</strong> in the top menu.</p>
                <p>3. Delete any default code, paste the copied code from above, and click Save (Floppy disk icon).</p>
                <p>4. Click <strong>Deploy &gt; New deployment</strong> &gt; Select type: <strong>Web app</strong>.</p>
                <p>5. Set <em>Execute as:</em> <strong>Me</strong> and <em>Who has access:</em> <strong>Anyone</strong>.</p>
                <p>6. Copy the resulting Web app URL and paste it into the box above!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Currency & Format Preference */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Currency &amp; Value Display</h3>
            <p className="text-[11px] text-slate-500">Configure Sri Lankan Rupees (Rs) formatting</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <div className="font-bold text-slate-800">Rupees Zero-Padded Format</div>
            <div className="text-[11px] text-slate-500">
              {paddedFormat ? 'Example: Rs 000,000,125,000.00' : 'Example: Rs 125,000.00'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPaddedFormat(!paddedFormat)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              paddedFormat ? 'bg-red-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
          </button>
        </div>
      </div>

      {/* 3. Database Privacy & AES-256 Encryption */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Data Privacy &amp; Encryption</h3>
            <p className="text-[11px] text-slate-500">Web Crypto AES-GCM 256-bit client-side cipher</p>
          </div>
        </div>

        <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Database Encryption Active</span>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              All transactions, balances, and receipt attachments are securely encrypted locally on your device.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Optional Passcode PIN (for extra privacy lock)
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              placeholder="e.g. 1234 (leave blank for auto-key)"
              value={securityPin}
              onChange={(e) => setSecurityPin(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-extrabold text-xs shadow-md shadow-red-600/25 active:scale-98 transition-all flex items-center justify-center gap-1.5"
      >
        <Check className="w-4 h-4" />
        <span>Save All Preferences</span>
      </button>

      {/* 4. Backup & Maintenance */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
          Backup, Export &amp; Maintenance
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={handleExportJSON}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download JSON</span>
          </button>

          <label className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-center">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to reset to initial seed data?')) {
              onResetData();
            }
          }}
          className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset to Demo Data</span>
        </button>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-2 text-xs text-slate-500 space-y-1">
        <div>
          <strong className="text-red-600">Pocket Ledger</strong> &bull; Income &amp; Expense System
        </div>
        <div className="text-[11px] text-slate-600">
          Powered by{' '}
          <a
            href="https://personal-infor.blogspot.com/"
            target="_blank"
            rel="noreferrer"
            className="font-bold text-slate-700 hover:underline"
          >
            THiNiTH Software Corporation
          </a>
        </div>
        <div className="text-[10px] text-slate-400">Deployable on GitHub &bull; Vercel Ready &bull; Zero API Key Cost</div>
      </div>
    </div>
  );
};
