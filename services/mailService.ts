
import { EmailMessage } from '../types';

const API_BASE = 'https://www.1secmail.com/api/v1/';

/**
 * List of public CORS proxies to rotate through if direct requests fail.
 */
const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

/**
 * Robust fetcher that tries direct access first, then falls back to multiple proxies.
 * It also validates that the response is actually JSON before parsing.
 */
async function robustFetch(url: string): Promise<any> {
  // Try direct first
  try {
    const response = await fetch(url);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
    }
  } catch (e) {
    console.warn(`Direct fetch failed for ${url}, trying proxies...`);
  }

  // Try proxies
  for (const proxyFn of PROXIES) {
    try {
      const proxiedUrl = proxyFn(url);
      const response = await fetch(proxiedUrl);
      if (response.ok) {
        // Some proxies might not pass the content-type correctly, 
        // so we try to parse and catch errors.
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (jsonErr) {
          if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
            throw new Error('Received HTML instead of JSON');
          }
          throw jsonErr;
        }
      }
    } catch (proxyErr) {
      console.warn(`Proxy failed:`, proxyErr);
      continue;
    }
  }

  throw new Error('All fetch methods failed to retrieve valid data');
}

export const mailService = {
  async getAvailableDomains(): Promise<string[]> {
    const fallbackDomains = ["1secmail.com", "1secmail.org", "1secmail.net", "wwjmp.com", "esiix.com", "xagora.com", "uorak.com"];
    try {
      const domains = await robustFetch(`${API_BASE}?action=getDomainList`);
      return Array.isArray(domains) ? domains : fallbackDomains;
    } catch (e) {
      console.error("Failed to fetch domain list, using fallbacks", e);
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
    } catch (e) {
      console.error("Error checking mail:", e);
      throw new Error('Inboxes are currently unreachable. The mail server might be under heavy load or blocked.');
    }
  },

  async getMessageDetails(login: string, domain: string, id: number): Promise<EmailMessage> {
    const url = `${API_BASE}?action=readMessage&login=${login}&domain=${domain}&id=${id}`;
    try {
      return await robustFetch(url);
    } catch (e) {
      console.error("Error reading message:", e);
      throw new Error('Failed to load the message content. Please try again.');
    }
  }
};
