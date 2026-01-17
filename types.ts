
export interface Mailbox {
  id: string;
  address: string;
  login: string;
  domain: string;
  createdAt: number;
}

export interface EmailMessage {
  id: number;
  from: string;
  subject: string;
  date: string;
  body?: string;
  textBody?: string;
  htmlBody?: string;
}

export interface DomainOption {
  name: string;
  isEdu?: boolean;
}
