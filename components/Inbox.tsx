
import React, { useState } from 'react';
import { EmailMessage, Mailbox } from '../types';

interface InboxProps {
  activeMailbox: Mailbox | null;
  messages: EmailMessage[];
  onRefresh: () => void;
  onSelectMessage: (id: number) => void;
  selectedMessage: EmailMessage | null;
  isLoading: boolean;
  error?: string | null;
}

export const Inbox: React.FC<InboxProps> = ({
  activeMailbox,
  messages,
  onRefresh,
  onSelectMessage,
  selectedMessage,
  isLoading,
  error
}) => {
  const [copying, setCopying] = useState(false);

  const handleCopy = () => {
    if (activeMailbox) {
      navigator.clipboard.writeText(activeMailbox.address);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  if (!activeMailbox) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <div className="bg-slate-800 p-8 rounded-full mb-4">
          <i className="fas fa-envelope-open text-6xl"></i>
        </div>
        <h2 className="text-xl font-semibold">Select an Inbox</h2>
        <p className="max-w-xs text-center mt-2">Pick an email from the left or create a new one to start receiving messages.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header Info */}
      <div className="p-6 border-b border-slate-800 bg-slate-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-indigo-400">Inbox:</span> {activeMailbox.address}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <button 
                onClick={handleCopy}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors flex items-center gap-2"
              >
                <i className={`fas ${copying ? 'fa-check text-green-400' : 'fa-copy'}`}></i>
                {copying ? 'Copied!' : 'Copy Address'}
              </button>
              <button 
                onClick={onRefresh}
                disabled={isLoading}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
                Refresh
              </button>
            </div>
          </div>
          <div className="hidden lg:block text-right">
             <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${error ? 'bg-red-900/30 text-red-400' : 'bg-green-100 text-green-800'}`}>
              <span className={`w-2 h-2 mr-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-green-500 animate-pulse'}`}></span>
              {error ? 'Connection Error' : 'Live Connection Active'}
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-300 text-sm">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={onRefresh} className="ml-auto underline hover:text-white">Try Again</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Messages List */}
        <div className={`w-full ${selectedMessage ? 'hidden md:block md:w-1/3' : 'w-full'} border-r border-slate-800 overflow-y-auto`}>
          {messages.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <span>Checking for mail...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                   <i className="fas fa-wind text-4xl opacity-20 mb-2"></i>
                   <p>No messages received yet.</p>
                   <p className="text-xs mb-4">Waiting for incoming traffic...</p>
                   <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-left">
                     <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Status Check</p>
                     <p className="text-xs text-slate-400">If your site says "Address not allowed", try creating a new email with a different domain like <b>esiix.com</b> or <b>uorak.com</b>.</p>
                   </div>
                </div>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                onClick={() => onSelectMessage(msg.id)}
                className={`p-4 border-b border-slate-800 cursor-pointer transition-colors ${
                  selectedMessage?.id === msg.id ? 'bg-indigo-900/20' : 'hover:bg-slate-800'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-semibold text-indigo-400 truncate w-2/3">{msg.from}</span>
                  <span className="text-[10px] text-slate-500">{msg.date}</span>
                </div>
                <h4 className="text-sm font-medium text-slate-200 truncate">{msg.subject || '(No Subject)'}</h4>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">Click to view content...</p>
              </div>
            ))
          )}
        </div>

        {/* Message Content */}
        <div className={`flex-1 ${!selectedMessage ? 'hidden md:flex' : 'flex'} flex-col bg-slate-900 overflow-hidden relative`}>
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                 <button 
                  onClick={() => onSelectMessage(-1)} // Signal close
                  className="md:hidden text-slate-400 p-2 hover:bg-slate-800 rounded"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <h3 className="font-bold text-lg truncate flex-1 ml-2 md:ml-0">{selectedMessage.subject}</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
                <div className="mb-6 pb-6 border-b border-slate-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                      {selectedMessage.from.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200">{selectedMessage.from}</p>
                      <p className="text-xs text-slate-500">To: {activeMailbox.address}</p>
                    </div>
                  </div>
                </div>

                {/* Render Body */}
                <div className="prose prose-invert max-w-none text-slate-300">
                  {selectedMessage.htmlBody ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }} 
                      className="bg-white text-slate-900 p-4 rounded-lg overflow-auto"
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans bg-slate-800 p-4 rounded-lg border border-slate-700">
                      {selectedMessage.body || selectedMessage.textBody || "No content available."}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-700 opacity-30">
              <i className="fas fa-envelope text-9xl"></i>
              <p className="mt-4 text-xl">Select a message to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
