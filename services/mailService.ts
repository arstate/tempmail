
import { EmailMessage } from '../types';

const API_DOMAINS = [
  'https://www.1secmail.com/api/v1/',
  'https://www.1secmail.org/api/v1/',
  'https://www.1secmail.net/api/v1/'
];

// Daftar Proxy yang lebih luas dan dikelompokkan
const PROXY_TIERS = {
  highSpeed: [
    { name: 'Cloud-Relay', url: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
    { name: 'Edge-Tunnel', url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  ],
  standard: [
    { name: 'Node-Alpha', url: (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}` },
    { name: 'Node-Beta', url: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
    { name: 'Node-Gamma', url: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}` },
    { name: 'Node-Delta', url: (url: string) => `https://yacdn.org/proxy/${url}` },
  ],
  fallback: [
    { name: 'Legacy-Bridge', url: (url: string) => `https://cors-anywhere.herokuapp.com/${url}` }, // Biasanya butuh request access, tapi kita simpan sebagai last resort
    { name: 'Secret-Route', url: (url: string) => `https://buka-blokir.vercel.app/api/proxy?url=${encodeURIComponent(url)}` } // Simulasi route custom
  ]
};

let lastSuccessfulProxy = 'Auto-Detect';
let connectionHealth = 100;

const shuffle = <T>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

async function fetchWithTimeout(url: string, timeout = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    // Tambahkan cache buster untuk menghindari hasil error yang tersimpan di proxy
    const connector = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${connector}cb=${Date.now()}`;
    
    const response = await fetch(finalUrl, { 
      signal: controller.signal,
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function tryProxyGroup(proxies: any[], fullUrl: string): Promise<any> {
  const promises = proxies.map(async (proxy) => {
    try {
      const proxiedUrl = proxy.url(fullUrl);
      const res = await fetchWithTimeout(proxiedUrl, 8000);
      if (res.ok) {
        const text = await res.text();
        if (!text || text.length < 2) throw new Error('Empty response');
        
        let json;
        try {
          json = JSON.parse(text);
        } catch (e) {
          // Beberapa proxy mengembalikan JSON dalam string 'contents'
          const wrapped = JSON.parse(text);
          json = typeof wrapped.contents === 'string' ? JSON.parse(wrapped.contents) : wrapped.contents;
        }
        
        lastSuccessfulProxy = proxy.name;
        connectionHealth = 100;
        return json;
      }
    } catch (e) { /* silent fail for parallel */ }
    throw new Error('Group Fail');
  });

  // Gunakan Promise.any atau race yang difilter
  try {
    return await (Promise as any).any(promises);
  } catch (e) {
    throw new Error('All proxies in group failed');
  }
}

async function robustFetch(path: string): Promise<any> {
  const isXagora = path.includes('xagora.com');
  let lastErr = '';

  for (const apiBase of shuffle(API_DOMAINS)) {
    const fullUrl = `${apiBase}${path}`;
    
    try {
      // TIER 1: Mencoba jalur High Speed (Parallel)
      return await tryProxyGroup(PROXY_TIERS.highSpeed, fullUrl);
    } catch (e) {
      try {
        // TIER 2: Mencoba Standard Node (Parallel)
        return await tryProxyGroup(shuffle(PROXY_TIERS.standard).slice(0, 3), fullUrl);
      } catch (e2) {
        lastErr = 'Firewall API terlalu ketat saat ini.';
      }
    }
  }

  connectionHealth = Math.max(0, connectionHealth - 25);
  throw new Error(isXagora 
    ? `Server xagora.com memblokir akses proxy kami. Coba gunakan domain .net atau .org yang ada di daftar.` 
    : `Koneksi Terputus: ${lastErr}. Silakan tekan tombol 'Perbaiki Koneksi'.`);
}

export const mailService = {
  getActiveProxyName(): string {
    return lastSuccessfulProxy;
  },

  getConnectionHealth(): number {
    return connectionHealth;
  },

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

  async checkMessages(login: string, domain: string): Promise<EmailMessage[]> {
    const path = `?action=getMessages&login=${login}&domain=${domain}`;
    return await robustFetch(path);
  },

  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    const path = `?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
    return await robustFetch(path);
  }
};
