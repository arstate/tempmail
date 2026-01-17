
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

  // Load Initial Data & Prune Old Boxes
  useEffect(() => {
    const init = async () => {
      // Get domains
      const domains = await mailService.getAvailableDomains();
      setAvailableDomains(domains);

      // Load from LocalStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const now = Date.now();
            // FILTER: Hapus kotak masuk yang lebih lama dari 24 jam
            const freshMailboxes = parsed.filter(mb => (now - mb.createdAt) < ONE_DAY_MS);
            
            if (freshMailboxes.length > 0) {
              setMailboxes(freshMailboxes);
              setActiveMailboxId(freshMailboxes[0].id);
            }
            
            // Simpan kembali hasil filter jika ada yang terhapus
            if (freshMailboxes.length !== parsed.length) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(freshMailboxes));
            }
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
  };

  const handleDeleteMailbox = (id: string) => {
    const confirmed = window.confirm("Hapus kotak masuk ini? Pesan di dalamnya juga akan hilang.");
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

  const fetchMessages = useCallback(async () => {
    if (!activeMailboxId) return;
    const active = mailboxes.find(mb => mb.id === activeMailboxId);
    if (!active) return;

    setIsLoading(true);
    try {
      const msgs = await mailService.checkMessages(active.login, active.domain);
      
      // Filter pesan yang lebih lama dari 24 jam (secara lokal)
      const now = Date.now();
      const freshMsgs = msgs.filter(msg => {
        const msgDate = new Date(msg.date.replace(' ', 'T')).getTime();
        return (now - msgDate) < ONE_DAY_MS;
      });

      setMessages(freshMsgs);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (messages.length === 0) {
        setError("Koneksi bermasalah. Mencoba menghubungkan kembali...");
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeMailboxId, mailboxes, messages.length]);

  // Polling logic
  useEffect(() => {
    if (!activeMailboxId) return;

    setMessages([]);
    setSelectedMessage(null);
    setError(null);
    fetchMessages();

    if (pollingRef.current) window.clearInterval(pollingRef.current);
    
    pollingRef.current = window.setInterval(() => {
      fetchMessages();
    }, 10000); // Setiap 10 detik

    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
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
    } catch (err: any) {
      alert("Gagal memuat detail email.");
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
          onRefresh={fetchMessages}
          onSelectMessage={handleSelectMessage}
          selectedMessage={selectedMessage}
          isLoading={isLoading}
          error={error}
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
