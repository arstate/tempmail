
import React, { useState, useEffect } from 'react';
import { EmailMessage, Mailbox } from '../types';
import { mailService } from '../services/mailService';

interface InboxProps {
  activeMailbox: Mailbox | null;
  messages: EmailMessage[];
  onRefresh: () => void;
  onSelectMessage: (id: number) => void;
  selectedMessage: EmailMessage | null;
  isLoading: boolean;
  error?: string | null;
  onFixConnection?: () => void;
}

export const Inbox: React.FC<InboxProps> = ({
  activeMailbox,
  messages,
  onRefresh,
  onSelectMessage,
  selectedMessage,
  isLoading,
  error,
  onFixConnection
}) => {
  const [copying, setCopying] = useState(false);
  const [proxyInfo, setProxyInfo] = useState({ name: 'Auto', health: 100 });

  useEffect(() => {
    const timer = setInterval(() => {
      setProxyInfo({
        name: mailService.getActiveProxyName(),
        health: mailService.getConnectionHealth()
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    if (activeMailbox) {
      navigator.clipboard.writeText(activeMailbox.address);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  if (!activeMailbox) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-slate-900">
        <div className="bg-slate-800 p-10 rounded-full mb-6 border border-slate-700 shadow-2xl">
          <i className="fas fa-envelope-open-text text-7xl text-indigo-500"></i>
        </div>
        <h2 className="text-2xl font-bold text-white">Kotak Masuk Kosong</h2>
        <p className="max-w-xs text-center mt-3 text-slate-400">Pilih email di samping atau buat baru untuk mulai menerima pesan secara anonim.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-800/30 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 truncate">
              <span className="text-indigo-400"><i className="fas fa-at"></i></span> 
              <span className="text-slate-100">{activeMailbox.address}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button 
                onClick={handleCopy}
                className="text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-4 py-1.5 rounded-full transition-all flex items-center gap-2"
              >
                <i className={`fas ${copying ? 'fa-check' : 'fa-copy'}`}></i>
                {copying ? 'Tersalin!' : 'Salin Email'}
              </button>
              <button 
                onClick={onRefresh}
                disabled={isLoading}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-1.5 rounded-full transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
                {isLoading ? 'Menghubungkan...' : 'Segarkan'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
             <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${error ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
               <span className={`w-1.5 h-1.5 mr-2 rounded-full ${error ? 'bg-red-500' : 'bg-indigo-500 animate-pulse'}`}></span>
               {error ? 'Connection Lost' : `Signal: ${proxyInfo.health}%`}
             </div>
             <span className="text-[9px] text-slate-500 font-mono tracking-tighter">via {proxyInfo.name}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-slate-800 border-l-4 border-red-500 rounded-r-xl flex flex-col md:flex-row md:items-center gap-4 text-slate-200 text-sm shadow-2xl animate-in slide-in-from-top duration-300">
          <div className="bg-red-500/20 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
             <i className="fas fa-exclamation-triangle text-red-500"></i>
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-400">Gangguan Jalur Private</p>
            <p className="opacity-70 text-xs leading-tight">{error}</p>
          </div>
          <div className="flex gap-2">
            {onFixConnection && (
              <button 
                onClick={onFixConnection} 
                className="bg-red-600/20 border border-red-500/50 px-4 py-2 rounded-lg text-red-300 text-xs font-bold hover:bg-red-600 hover:text-white transition-all whitespace-nowrap"
              >
                <i className="fas fa-tools mr-2"></i> Perbaiki Koneksi
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Messages List */}
        <div className={`w-full ${selectedMessage ? 'hidden md:block md:w-80 lg:w-96' : 'w-full'} border-r border-slate-800 overflow-y-auto bg-slate-900/50`}>
          {messages.length === 0 ? (
            <div className="p-10 text-center">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-b-2 border-indigo-500 rounded-full animate-spin"></div>
                      <i className="fas fa-satellite absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400"></i>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs font-medium animate-pulse">Menembus Firewall...</p>
                </div>
              ) : (
                <div className="space-y-4 py-12">
                   <div className="bg-slate-800 w-20 h-20 rounded-full mx-auto flex items-center justify-center border border-slate-700">
                      <i className="fas fa-comment-slash text-3xl text-slate-600"></i>
                   </div>
                   <div className="space-y-1">
                      <p className="text-slate-100 font-bold">Menunggu Pesan</p>
                      <p className="text-slate-500 text-[11px] max-w-[200px] mx-auto">Kirim email ke alamat di atas dan tunggu 10-30 detik.</p>
                   </div>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  onClick={() => onSelectMessage(msg.id)}
                  className={`p-5 cursor-pointer transition-all border-l-4 ${
                    selectedMessage?.id === msg.id 
                      ? 'bg-indigo-600/10 border-indigo-500' 
                      : 'hover:bg-slate-800/50 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-indigo-300 truncate w-3/4">{msg.from}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{msg.date.split(' ')[1] || msg.date}</span>
                  </div>
                  <h4 className={`text-sm mb-1 truncate ${selectedMessage?.id === msg.id ? 'text-white' : 'text-slate-300'}`}>
                    {msg.subject || '(Tanpa Subjek)'}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_5px_#6366f1]"></span>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Pesan Baru</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Content View */}
        <div className={`flex-1 ${!selectedMessage ? 'hidden md:flex' : 'flex'} flex-col bg-slate-900 overflow-hidden relative`}>
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-800 flex items-center bg-slate-800/20">
                 <button 
                  onClick={() => onSelectMessage(-1)}
                  className="md:hidden text-slate-400 p-2 hover:bg-slate-800 rounded mr-2"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-100 truncate">{selectedMessage.subject}</h3>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-900">
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 pb-8 border-b border-slate-800">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg text-xl">
                      {selectedMessage.from.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-100">{selectedMessage.from}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Kepada: {activeMailbox.address}</p>
                    </div>
                    <div className="text-xs text-slate-500 font-mono bg-slate-800 px-3 py-1 rounded-full">{selectedMessage.date}</div>
                  </div>

                  <div className="mail-body">
                    {selectedMessage.htmlBody ? (
                      <div 
                        dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }} 
                        className="bg-white text-slate-900 p-6 rounded-2xl overflow-auto shadow-inner min-h-[300px] prose prose-sm max-w-none"
                      />
                    ) : (
                      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-inner">
                        <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed text-sm">
                          {selectedMessage.body || selectedMessage.textBody || "Tidak ada konten pesan."}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-8">
                 <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full"></div>
                 <i className="fas fa-shield-alt text-[100px] text-slate-800 relative z-10"></i>
                 <i className="fas fa-lock absolute bottom-0 right-0 text-3xl text-indigo-500 bg-slate-900 p-2 rounded-lg border border-slate-700"></i>
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2">Enkripsi Proxy Aktif</h3>
              <p className="text-slate-500 text-sm max-w-sm">Pilih pesan di panel kiri untuk membukanya. Semua pesan akan dihapus otomatis dari server dalam 24 jam demi keamanan Anda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
