
import { EmailMessage } from '../types';

const API_BASE = 'https://www.1secmail.com/api/v1/';

/**
 * Daftar proxy CORS dengan logika penanganan respon yang berbeda.
 */
const PROXIES = [
  {
    name: 'AllOrigins',
    url: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    parse: (data: any) => JSON.parse(data.contents)
  },
  {
    name: 'CorsProxy.io',
    url: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    parse: (data: any) => data
  },
  {
    name: 'Codetabs',
    url: (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    parse: (data: any) => data
  },
  {
    name: 'ThingProxy',
    url: (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
    parse: (data: any) => data
  }
];

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

async function robustFetch(url: string): Promise<any> {
  // 1. Coba Akses Langsung (Sering gagal di browser karena CORS, tapi bagus untuk testing)
  try {
    const response = await fetchWithTimeout(url, { method: 'GET' }, 3000);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    // Abaikan error langsung, lanjut ke proxy
  }

  // 2. Iterasi Proxy
  let lastError = '';
  for (const proxy of PROXIES) {
    try {
      console.log(`Menghubungkan via ${proxy.name}...`);
      const proxiedUrl = proxy.url(url);
      const response = await fetchWithTimeout(proxiedUrl);
      
      if (response.ok) {
        const rawData = await response.json();
        const parsedData = proxy.parse(rawData);
        
        // Validasi apakah data yang diparse sesuai harapan (bukan null/undefined)
        if (parsedData) return parsedData;
      }
    } catch (err: any) {
      lastError = err.message || 'Unknown Proxy Error';
      console.warn(`Proxy ${proxy.name} gagal:`, lastError);
      continue; // Coba proxy berikutnya
    }
  }

  throw new Error(`Semua jalur koneksi terblokir. Terakhir: ${lastError}`);
}

export const mailService = {
  async getAvailableDomains(): Promise<string[]> {
    const fallbackDomains = [
      "1secmail.com", "1secmail.org", "1secmail.net", 
      "wwjmp.com", "esiix.com", "xagora.com", 
      "uorak.com", "vjuum.com", "laafd.com", "tx97.net"
    ];
    try {
      const domains = await robustFetch(`${API_BASE}?action=getDomainList`);
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
    const url = `${API_BASE}?action=getMessages&login=${login}&domain=${domain}`;
    try {
      const messages = await robustFetch(url);
      return Array.isArray(messages) ? messages : [];
    } catch (e: any) {
      throw new Error(`Gagal memeriksa inbox: ${e.message}`);
    }
  },

  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    const url = `${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
    try {
      return await robustFetch(url);
    } catch (e: any) {
      throw new Error(`Gagal memuat isi email: ${e.message}`);
    }
  }
};
