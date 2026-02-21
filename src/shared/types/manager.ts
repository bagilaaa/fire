/** Менеджер */
export interface Manager {
  id?: string;
  name: string;
  office: string;
  skills: string[];
  activeRequests: number;
}
