
import React from 'react';
import { Mailbox } from '../types';

interface SidebarProps {
  mailboxes: Mailbox[];
  activeMailboxId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mailboxes,
  activeMailboxId,
  onSelect,
  onAdd,
  onDelete
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-700 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
          <i className="fas fa-bolt"></i> TempMail
        </h1>
        <button 
          onClick={onAdd}
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-all flex items-center justify-center w-10 h-10"
          title="Tambah Email Baru"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Kotak Masuk Anda</h3>
           <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">Permanen</span>
        </div>
        
        {mailboxes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 italic text-sm">
            Belum ada email yang dibuat.
          </div>
        ) : (
          mailboxes.map((mb) => (
            <div 
              key={mb.id}
              onClick={() => onSelect(mb.id)}
              className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                activeMailboxId === mb.id 
                  ? 'bg-slate-700 border-indigo-500 shadow-lg' 
                  : 'bg-slate-800 border-transparent hover:border-slate-600'
              }`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-medium truncate text-slate-200">{mb.address}</p>
                <p className="text-[10px] text-slate-500">Dibuat {new Date(mb.createdAt).toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(mb.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-opacity"
              >
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700">
        <div className="bg-slate-700/50 p-3 rounded-lg border border-slate-600 space-y-2">
          <p className="text-xs text-slate-400 leading-relaxed">
            <i className="fas fa-info-circle text-indigo-400 mr-1"></i> 
            Pesan dihapus otomatis setelah 1 hari.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            <i className="fas fa-shield-alt text-green-400 mr-1"></i> 
            Alamat email tersimpan permanen di browser ini.
          </p>
        </div>
      </div>
    </div>
  );
};
