
import { EmailMessage } from '../types';

// Rotasi domain API jika salah satu diblokir
const API_DOMAINS = [
  'https://www.1secmail.com/api/v1/',
  'https://www.1secmail.org/api/v1/',
  'https://www.1secmail.net/api/v1/'
];

/**
 * Daftar proxy CORS yang lebih luas dan andal.
 */
const PROXIES = [
  {
    name: 'AllOrigins-Raw',
    url: (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    isRaw: true
  },
  {
    name: 'CorsProxy.io',
    url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    isRaw: false
  },
  {
    name: 'Cors-LOL',
    url: (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
    isRaw: false
  },
  {
    name: 'Codetabs',
    url: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    isRaw: false
  }
];

async function fetchWithTimeout(url: string, options: any = {}, timeout = 10000) {
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

/**
 * Fungsi fetch yang sangat tangguh dengan rotasi domain dan proxy.
 */
async function robustFetch(path: string): Promise<any> {
  let lastError = '';

  // Iterasi melalui domain API yang berbeda
  for (const apiBase of API_DOMAINS) {
    const fullUrl = `${apiBase}${path}`;

    // 1. Coba Akses Langsung
    try {
      const response = await fetchWithTimeout(fullUrl, { method: 'GET' }, 3000);
      if (response.ok) return await response.json();
    } catch (e) { /* ignore and move to proxy */ }

    // 2. Coba melalui setiap Proxy
    for (const proxy of PROXIES) {
      try {
        console.log(`Menghubungkan ke ${apiBase} via ${proxy.name}...`);
        const proxiedUrl = proxy.url(fullUrl);
        const response = await fetchWithTimeout(proxiedUrl);
        
        if (response.ok) {
          // Jika menggunakan AllOrigins-Raw atau proxy transparan lainnya
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch (parseErr) {
            // Jika proxy mengembalikan wrapper JSON (beberapa proxy lama)
            const json = JSON.parse(text);
            if (json.contents) return JSON.parse(json.contents);
            return json;
          }
        }
      } catch (err: any) {
        lastError = err.message || 'Connection failed';
        console.warn(`${proxy.name} gagal untuk ${apiBase}:`, lastError);
        continue;
      }
    }
  }

  throw new Error(`Semua jalur koneksi (3 domain, 4 proxy) terblokir. Pesan terakhir: ${lastError}`);
}

export const mailService = {
  async getAvailableDomains(): Promise<string[]> {
    const fallbackDomains = [
      "1secmail.com", "1secmail.org", "1secmail.net", 
      "wwjmp.com", "esiix.com", "xagora.com", 
      "uorak.com", "vjuum.com", "laafd.com", "tx97.net"
    ];
    try {
      const domains = await robustFetch(`?action=getDomainList`);
      return Array.isArray(domains) ? domains : fallbackDomains;
    } catch (e) {
      console.error("Gagal mengambil domain, menggunakan cadangan.");
      return fallbackDomains;
    }
  },

  generateRandomLogin(): string {
    return Math.random().toString(36).substring(2, 12);
  },

  async checkMessages(login: string, domain: string): Promise<EmailMessage[]> {
    const path = `?action=getMessages&login=${login}&domain=${domain}`;
    try {
      const messages = await robustFetch(path);
      return Array.isArray(messages) ? messages : [];
    } catch (e: any) {
      throw new Error(e.message);
    }
  },

  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    const path = `?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
    try {
      return await robustFetch(path);
    } catch (e: any) {
      throw new Error(e.message);
    }
  }
};
