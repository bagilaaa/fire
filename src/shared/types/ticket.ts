/** Обращение (тикет) */
export interface Ticket {
  id: string;
  segment: string;
  type: string;
  sentiment: string;
  priority: number;
  language: string;
  office: string;
  manager: string;
  status: string;
  /** ИИ Summary: описание заявки и рекомендация менеджеру (1–2 предложения) */
  aiSummary?: string;
}

/** Расширенные данные обращения для страницы детализации */
export interface TicketDetail extends Ticket {
  guid?: string;
  summary?: string;
  recommendation?: string;
  attachments?: string[];
  clientInfo?: {
    gender?: string;
    birthDate?: string;
    address?: string;
    coordinates?: string;
  };
}
