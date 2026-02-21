import { apiPost } from "@/shared/api/client";

interface AIQueryResponse {
  answer: string;
  chart_data: Record<string, unknown> | null;
}

export async function sendAssistantQuery(
  query: string
): Promise<{ text: string; hasChart?: boolean; chartData?: unknown }> {
  const res = await apiPost<AIQueryResponse>("/ai/query", { query });
  return {
    text: res.answer,
    hasChart: res.chart_data != null,
    chartData: res.chart_data ?? undefined,
  };
}
