
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { Inbox } from './components/Inbox';
import { CreateEmailModal } from './components/CreateEmailModal';
import { Mailbox, EmailMessage } from './types';
import { mailService } from './services/mailService';

const STORAGE_KEY = 'tempmail_private_boxes';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const App: React.FC = () => {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [activeMailboxId, setActiveMailboxId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const pollingRef = useRef<number | null>(null);
  const consecutiveErrors = useRef(0);

  const loadDomains = async () => {
    const domains = await mailService.getAvailableDomains();
    setAvailableDomains(domains);
    return domains;
  };

  // Load Initial Data
  useEffect(() => {
    const init = async () => {
      await loadDomains();

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMailboxes(parsed);
            setActiveMailboxId(parsed[0].id);
          }
        } catch (e) {
          console.error("Storage corrupt", e);
        }
      }
    };
    init();
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mailboxes));
  }, [mailboxes]);

  const handleAddMailbox = (login: string, domain: string) => {
    const newMailbox: Mailbox = {
      id: `${login}-${domain}-${Date.now()}`,
      address: `${login}@${domain}`,
      login,
      domain,
      createdAt: Date.now()
    };
    
    setMailboxes(prev => [newMailbox, ...prev]);
    setActiveMailboxId(newMailbox.id);
    setIsModalOpen(false);
    setError(null);
    consecutiveErrors.current = 0;
  };

  const handleDeleteMailbox = (id: string) => {
    const confirmed = window.confirm("Hapus kotak masuk ini?");
    if (!confirmed) return;

    setMailboxes(prev => {
      const filtered = prev.filter(mb => mb.id !== id);
      if (activeMailboxId === id) {
        setActiveMailboxId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    
    if (activeMailboxId === id) {
      setMessages([]);
      setSelectedMessage(null);
    }
  };

  const fetchMessages = useCallback(async (force = false) => {
    if (!activeMailboxId) return;
    const active = mailboxes.find(mb => mb.id === activeMailboxId);
    if (!active) return;

    if (force) setIsLoading(true);
    
    try {
      const msgs = await mailService.checkMessages(active.login, active.domain);
      
      const now = Date.now();
      const freshMsgs = msgs.filter(msg => {
        try {
          const msgDate = new Date(msg.date.replace(' ', 'T')).getTime();
          return (now - msgDate) < ONE_DAY_MS;
        } catch(e) { return true; }
      });

      setMessages(freshMsgs);
      setError(null);
      consecutiveErrors.current = 0;
    } catch (err: any) {
      consecutiveErrors.current += 1;
      if (consecutiveErrors.current > 1 || force) {
        setError(err.message || "Masalah koneksi. Mencoba jalur alternatif...");
      }
      // If we are getting many errors, try to re-fetch domains in background
      if (consecutiveErrors.current % 5 === 0) loadDomains();
    } finally {
      setIsLoading(false);
    }
  }, [activeMailboxId, mailboxes]);

  const handleFixConnection = async () => {
    setIsLoading(true);
    setError("Sedang mereset jalur koneksi...");
    await loadDomains();
    await fetchMessages(true);
  };

  // Polling logic
  useEffect(() => {
    if (!activeMailboxId) return;

    setMessages([]);
    setSelectedMessage(null);
    setError(null);
    consecutiveErrors.current = 0;
    fetchMessages(true);

    if (pollingRef.current) window.clearTimeout(pollingRef.current);
    
    const getDelay = () => (consecutiveErrors.current > 2 ? 30000 : 15000);

    const runPolling = () => {
      pollingRef.current = window.setTimeout(async () => {
        await fetchMessages();
        runPolling();
      }, getDelay()) as unknown as number;
    };

    runPolling();

    return () => {
      if (pollingRef.current) window.clearTimeout(pollingRef.current);
    };
  }, [activeMailboxId, fetchMessages]);

  const handleSelectMessage = async (id: number) => {
    if (id === -1) {
      setSelectedMessage(null);
      return;
    }

    const active = mailboxes.find(mb => mb.id === activeMailboxId);
    if (!active) return;

    setIsLoading(true);
    try {
      const details = await mailService.getMessageDetails(active.login, active.domain, id);
      setSelectedMessage(details);
      setError(null);
    } catch (err: any) {
      setError("Gagal memuat detail email. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Layout 
        sidebar={
          <Sidebar 
            mailboxes={mailboxes}
            activeMailboxId={activeMailboxId}
            onSelect={setActiveMailboxId}
            onAdd={() => setIsModalOpen(true)}
            onDelete={handleDeleteMailbox}
          />
        }
      >
        <Inbox 
          activeMailbox={mailboxes.find(mb => mb.id === activeMailboxId) || null}
          messages={messages}
          onRefresh={() => fetchMessages(true)}
          onSelectMessage={handleSelectMessage}
          selectedMessage={selectedMessage}
          isLoading={isLoading}
          error={error}
          onFixConnection={handleFixConnection}
        />
      </Layout>

      <CreateEmailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        availableDomains={availableDomains}
        onConfirm={handleAddMailbox}
      />
    </>
  );
};

export default App;
