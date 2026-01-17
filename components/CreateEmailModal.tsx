
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

  const getBadge = (d: string) => {
    if (d.includes('xagora')) return 'BLOCKED';
    if (d.includes('net') || d.includes('org')) return 'STABLE';
    if (d.includes('esiix') || d.includes('uorak')) return 'RARE';
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="fas fa-plus-circle text-indigo-500"></i>
            Buat Email Baru
          </h2>
          <p className="text-sm text-slate-400 mt-1">Gunakan domain yang jarang untuk bypass blokir.</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Username / Prefix</label>
            <div className="relative">
              <input 
                type="text" 
                value={login}
                onChange={(e) => setLogin(e.target.value.replace(/[^a-z0-9]/gi, '').toLowerCase())}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="misal: user.baru"
              />
              <button 
                onClick={() => setLogin(Math.random().toString(36).substring(2, 10))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 p-2"
                title="Acak"
              >
                <i className="fas fa-random text-xs"></i>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Pilihan Domain</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {availableDomains.map(d => (
                <div 
                  key={d}
                  onClick={() => setDomain(d)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    domain === d 
                      ? 'bg-indigo-600/20 border-indigo-500 text-white' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <span className="text-sm font-medium">@{d}</span>
                  <div className="flex gap-2">
                    {getBadge(d) && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${
                        getBadge(d) === 'STABLE' ? 'bg-green-500/20 text-green-400' : 
                        getBadge(d) === 'BLOCKED' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {getBadge(d)}
                      </span>
                    )}
                    {domain === d && <i className="fas fa-check-circle text-indigo-500"></i>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {domain.includes('xagora') && (
            <div className="bg-red-900/10 border border-red-500/20 p-3 rounded-lg">
              <p className="text-[11px] text-red-200/70 leading-relaxed">
                <i className="fas fa-exclamation-triangle mr-2 text-red-500"></i>
                Domain <b>xagora.com</b> kembali diaktifkan, namun server ini sering diblokir oleh banyak website dan mungkin tidak bisa menerima pesan secara normal.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-800/50 border-t border-slate-700 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={() => onConfirm(login, domain)}
            disabled={!login}
            className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium shadow-lg shadow-indigo-900/20 transition-all"
          >
            Buat Sekarang
          </button>
        </div>
      </div>
    </div>
  );
};
