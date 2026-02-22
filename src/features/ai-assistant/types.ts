export interface ChartData {
  chart_type: string;
  title: string;
  labels: string[];
  values: number[];
  x_label: string;
  y_label: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  chartData?: ChartData;
}
