
import { EmailMessage } from '../types';

const API_DOMAINS = [
  'https://www.1secmail.com/api/v1/',
  'https://www.1secmail.org/api/v1/',
  'https://www.1secmail.net/api/v1/'
];

// Mendapatkan API Key dari environment (Vercel)
const VERCEL_API_KEY = process.env.API_KEY || '';

const PROXY_TIERS = {
  // Jika ada API_KEY, kita bisa arahkan ke layanan proxy berbayar yang lebih stabil
  premium: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}&apikey=${VERCEL_API_KEY}`,
  highSpeed: [
    { name: 'Cloud-Relay', url: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
    { name: 'Edge-Tunnel', url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  ],
  standard: [
    { name: 'Node-Alpha', url: (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}` },
    { name: 'Node-Beta', url: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
    { name: 'Node-Gamma', url: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}` },
    { name: 'Node-Delta', url: (url: string) => `https://yacdn.org/proxy/${url}` },
  ]
};

let lastSuccessfulProxy = VERCEL_API_KEY ? 'Premium Tunnel' : 'Auto-Detect';
let connectionHealth = 100;

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

async function fetchWithTimeout(url: string, timeout = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const connector = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${connector}cb=${Date.now()}`;
    
    const response = await fetch(finalUrl, { 
      signal: controller.signal,
      headers: { 
        'X-Requested-With': 'XMLHttpRequest',
        // Jika ada API_KEY, kirimkan sebagai header otorisasi (standar untuk banyak proxy berbayar)
        ...(VERCEL_API_KEY ? { 'Authorization': `Bearer ${VERCEL_API_KEY}` } : {})
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function tryProxyGroup(proxies: any[], fullUrl: string): Promise<any> {
  // Jika ada API_KEY, prioritaskan jalur premium terlebih dahulu
  if (VERCEL_API_KEY) {
    try {
      const res = await fetchWithTimeout(PROXY_TIERS.premium(fullUrl), 10000);
      if (res.ok) {
        const text = await res.text();
        const json = JSON.parse(text);
        lastSuccessfulProxy = 'Premium Tunnel';
        return json.contents ? JSON.parse(json.contents) : json;
      }
    } catch (e) { console.debug("Premium tunnel failed, falling back..."); }
  }

  const promises = proxies.map(async (proxy) => {
    try {
      const proxiedUrl = proxy.url(fullUrl);
      const res = await fetchWithTimeout(proxiedUrl, 8000);
      if (res.ok) {
        const text = await res.text();
        if (!text || text.length < 2) throw new Error('Empty');
        
        let json;
        try {
          const wrapped = JSON.parse(text);
          json = wrapped.contents ? (typeof wrapped.contents === 'string' ? JSON.parse(wrapped.contents) : wrapped.contents) : wrapped;
        } catch (e) {
          json = JSON.parse(text);
        }
        
        lastSuccessfulProxy = proxy.name;
        connectionHealth = 100;
        return json;
      }
    } catch (e) { }
    throw new Error('Fail');
  });

  try {
    return await (Promise as any).any(promises);
  } catch (e) {
    throw new Error('Semua jalur proxy terblokir.');
  }
}

async function robustFetch(path: string): Promise<any> {
  for (const apiBase of shuffle(API_DOMAINS)) {
    const fullUrl = `${apiBase}${path}`;
    try {
      return await tryProxyGroup(PROXY_TIERS.highSpeed, fullUrl);
    } catch (e) {
      try {
        return await tryProxyGroup(shuffle(PROXY_TIERS.standard).slice(0, 3), fullUrl);
      } catch (e2) { continue; }
    }
  }

  connectionHealth = Math.max(0, connectionHealth - 20);
  throw new Error(`Gagal menembus filter email. Pastikan API_KEY di Vercel sudah benar.`);
}

export const mailService = {
  getActiveProxyName(): string {
    return lastSuccessfulProxy;
  },
  getConnectionHealth(): number {
    return connectionHealth;
  },
  isPremium(): boolean {
    return !!VERCEL_API_KEY;
  },
  async getAvailableDomains(): Promise<string[]> {
    const fallbackDomains = ["1secmail.com", "1secmail.org", "1secmail.net", "xagora.com"];
    try {
      const domains = await robustFetch(`?action=getDomainList`);
      return Array.isArray(domains) ? domains : fallbackDomains;
    } catch (e) {
      return fallbackDomains;
    }
  },
  async checkMessages(login: string, domain: string): Promise<EmailMessage[]> {
    return await robustFetch(`?action=getMessages&login=${login}&domain=${domain}`);
  },
  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    return await robustFetch(`?action=readMessage&login=${login}&domain=${domain}&id=${id}`);
  }
};
