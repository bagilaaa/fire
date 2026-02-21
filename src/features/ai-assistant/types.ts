export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  hasChart?: boolean;
  chartData?: unknown;
}
