
import { EmailMessage } from '../types';

const API_DOMAINS = [
  'https://www.1secmail.com/api/v1/',
  'https://www.1secmail.org/api/v1/',
  'https://www.1secmail.net/api/v1/'
];

const PROXIES = [
  {
    name: 'AllOrigins',
    url: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'CorsProxy',
    url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  },
  {
    name: 'Cors-LOL',
    url: (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  },
  {
    name: 'Codetabs',
    url: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  },
  {
    name: 'ThingProxy',
    url: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  }
];

// Shuffle array helper to prevent hitting the same rate-limited proxy first
const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

async function fetchWithTimeout(url: string, options: any = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function robustFetch(path: string): Promise<any> {
  let lastError = '';
  const shuffledProxies = shuffle(PROXIES);
  const shuffledDomains = shuffle(API_DOMAINS);

  for (const apiBase of shuffledDomains) {
    const fullUrl = `${apiBase}${path}`;

    // 1. Quick Direct Attempt (3s timeout)
    try {
      const response = await fetchWithTimeout(fullUrl, { method: 'GET' }, 3000);
      if (response.ok) return await response.json();
    } catch (e) { /* skip */ }

    // 2. Proxied Attempts
    for (const proxy of shuffledProxies) {
      try {
        const proxiedUrl = proxy.url(fullUrl);
        const response = await fetchWithTimeout(proxiedUrl);
        
        if (response.ok) {
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (parseErr) {
            // Some proxies wrap results
            const json = JSON.parse(text);
            if (json.contents) return JSON.parse(json.contents);
            return json;
          }
        }
      } catch (err: any) {
        lastError = err.message || 'Network Error';
        continue;
      }
    }
  }

  throw new Error(`Koneksi Gagal: ${lastError}. Coba ganti domain email atau gunakan VPN.`);
}

export const mailService = {
  async getAvailableDomains(): Promise<string[]> {
    const fallbackDomains = [
      "1secmail.com", "1secmail.org", "1secmail.net", 
      "wwjmp.com", "esiix.com", "uorak.com", 
      "vjuum.com", "laafd.com", "tx97.net", "xagora.com"
    ];
    try {
      const domains = await robustFetch(`?action=getDomainList`);
      return Array.isArray(domains) ? domains : fallbackDomains;
    } catch (e) {
      return fallbackDomains;
    }
  },

  generateRandomLogin(): string {
    return Math.random().toString(36).substring(2, 12);
  },

  async checkMessages(login: string, domain: string): Promise<EmailMessage[]> {
    const path = `?action=getMessages&login=${login}&domain=${domain}`;
    return await robustFetch(path);
  },

  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    const path = `?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
    return await robustFetch(path);
  }
};
