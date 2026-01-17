
import { EmailMessage } from '../types';

const API_BASE = 'https://www.1secmail.com/api/v1/';

/**
 * Daftar proxy CORS publik yang lebih luas untuk bypass pemblokiran browser/ISP.
 */
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://proxy.cors.sh/${url}`, // Kadang butuh header, tapi dicoba dulu
];

async function robustFetch(url: string): Promise<any> {
  // 1. Coba Akses Langsung
  try {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn("Direct fetch blocked, trying proxies...");
  }

  // 2. Coba Lewat Proxy secara bergantian
  for (const proxyFn of PROXIES) {
    try {
      const proxiedUrl = proxyFn(url);
      const response = await fetch(proxiedUrl);
      if (response.ok) {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (jsonErr) {
          // Jika hasil bukan JSON (mungkin HTML error page), skip ke proxy berikutnya
          continue;
        }
      }
    } catch (proxyErr) {
      console.error(`Proxy Error:`, proxyErr);
      continue;
    }
  }

  throw new Error('Server email tidak dapat dijangkau. Coba ganti koneksi atau aktifkan VPN.');
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
      return fallbackDomains;
    }
  },

  generateRandomLogin(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  async checkMessages(login: string, domain: string): Promise<EmailMessage[]> {
    const url = `${API_BASE}?action=getMessages&login=${login}&domain=${domain}`;
    try {
      const messages = await robustFetch(url);
      return Array.isArray(messages) ? messages : [];
    } catch (e) {
      throw new Error('Gagal memeriksa pesan. Koneksi API terganggu.');
    }
  },

  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    const url = `${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
    try {
      return await robustFetch(url);
    } catch (e) {
      throw new Error('Gagal memuat isi email.');
    }
  }
};
