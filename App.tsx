
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { Inbox } from './components/Inbox';
import { CreateEmailModal } from './components/CreateEmailModal';
import { Mailbox, EmailMessage } from './types';
import { mailService } from './services/mailService';

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

  // Initialize: Load domains and saved mailboxes from local storage
  useEffect(() => {
    const init = async () => {
      const domains = await mailService.getAvailableDomains();
      setAvailableDomains(domains);

      const saved = localStorage.getItem('zombio_mailboxes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMailboxes(parsed);
          if (parsed.length > 0) {
            setActiveMailboxId(parsed[0].id);
          }
        } catch (e) {
          console.error("Failed to parse saved mailboxes", e);
        }
      }
    };
    init();
  }, []);

  // Persist mailboxes to localStorage
  useEffect(() => {
    if (mailboxes.length > 0) {
      localStorage.setItem('zombio_mailboxes', JSON.stringify(mailboxes));
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
    setMailboxes(prev => {
      const filtered = prev.filter(mb => mb.id !== id);
      if (activeMailboxId === id) {
        setActiveMailboxId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
    
    // Clear selection if deleted
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
      setMessages(msgs);
      setError(null);
    } catch (err: any) {
      console.error("Error in fetchMessages:", err);
      // Don't override if we already have messages, just log it
      if (messages.length === 0) {
        setError(err.message || "Failed to connect to the mail server.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeMailboxId, mailboxes, messages.length]);

  // Start/Stop Polling when active mailbox changes
  useEffect(() => {
    setMessages([]);
    setSelectedMessage(null);
    setError(null);
    fetchMessages();

    if (pollingRef.current) window.clearInterval(pollingRef.current);
    
    pollingRef.current = window.setInterval(() => {
      fetchMessages();
    }, 15000); // Poll every 15 seconds

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

    try {
      const details = await mailService.getMessageDetails(active.login, active.domain, id);
      setSelectedMessage(details);
      setError(null);
    } catch (err: any) {
      console.error("Error reading message:", err);
      setError(err.message || "Failed to load message content.");
    }
  };

  const activeMailbox = mailboxes.find(mb => mb.id === activeMailboxId) || null;

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
          activeMailbox={activeMailbox}
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
