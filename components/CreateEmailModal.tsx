
import React, { useState } from 'react';

interface CreateEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (login: string, domain: string) => void;
  availableDomains: string[];
}

export const CreateEmailModal: React.FC<CreateEmailModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableDomains
}) => {
  const [login, setLogin] = useState(Math.random().toString(36).substring(2, 10));
  const [domain, setDomain] = useState(availableDomains[0] || '1secmail.com');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-plus-circle text-indigo-500"></i>
            Create New Email
          </h2>
          <p className="text-sm text-slate-400 mt-1">Customize your temporary identity.</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Username / Prefix</label>
            <input 
              type="text" 
              value={login}
              onChange={(e) => setLogin(e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase())}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="e.g. john.doe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Domain Selection</label>
            <select 
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
            >
              {availableDomains.map(d => (
                <option key={d} value={d}>
                  @{d} {d.includes('edu') ? '🎓' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg">
            <p className="text-xs text-indigo-300">
              <i className="fas fa-lightbulb mr-2"></i>
              Tip: Use rare domains like <b>uorak.com</b> or <b>esiix.com</b> if the main ones are blocked.
            </p>
          </div>
        </div>

        <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(login, domain)}
            disabled={!login}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium shadow-lg shadow-indigo-900/20 transition-all"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
};
