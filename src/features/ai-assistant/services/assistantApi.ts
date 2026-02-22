import { apiPost } from "@/shared/api/client";
import type { ChartData } from "../types";

interface AIQueryResponse {
  answer: string;
  chart_data: ChartData | null;
}

export async function sendAssistantQuery(
  query: string
): Promise<{ text: string; chartData?: ChartData }> {
  const res = await apiPost<AIQueryResponse>("/ai/query", { query });
  return {
    text: res.answer,
    chartData: res.chart_data ?? undefined,
  };
}
