
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { Inbox } from './components/Inbox';
import { CreateEmailModal } from './components/CreateEmailModal';
import { Mailbox, EmailMessage } from './types';
import { mailService } from './services/mailService';

const STORAGE_KEY = 'tempmail_private_boxes_v2'; // Versi baru storage
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
  const lastMailboxId = useRef<string | null>(null);

  const loadDomains = async () => {
    try {
      const domains = await mailService.getAvailableDomains();
      setAvailableDomains(domains);
      return domains;
    } catch (e) {
      return [];
    }
  };

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
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (mailboxes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mailboxes));
    }
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
  };

  const handleDeleteMailbox = (id: string) => {
    if (!window.confirm("Hapus kotak masuk ini secara permanen?")) return;

    setMailboxes(prev => {
      const filtered = prev.filter(mb => mb.id !== id);
      if (activeMailboxId === id) {
        setActiveMailboxId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
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
    } catch (err: any) {
      // Hanya tampilkan error jika ini bukan polling background atau jika error menetap
      if (force || error) {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeMailboxId, mailboxes, error]);

  const handleFixConnection = async () => {
    setIsLoading(true);
    setError("Sedang merotasi IP Proxy dan mencari jalur tunnel baru...");
    await new Promise(r => setTimeout(r, 1500));
    await loadDomains();
    await fetchMessages(true);
  };

  // Polling logic yang lebih cerdas
  useEffect(() => {
    if (!activeMailboxId) return;

    // Reset UI jika mailbox benar-benar berubah
    if (lastMailboxId.current !== activeMailboxId) {
      setMessages([]);
      setSelectedMessage(null);
      setError(null);
      lastMailboxId.current = activeMailboxId;
      fetchMessages(true);
    }

    if (pollingRef.current) window.clearTimeout(pollingRef.current);
    
    const runPolling = () => {
      pollingRef.current = window.setTimeout(async () => {
        await fetchMessages();
        runPolling();
      }, 10000) as unknown as number; // Poll setiap 10 detik
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
      setError("Gagal mendownload isi pesan. Proxy tujuan menolak koneksi.");
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
