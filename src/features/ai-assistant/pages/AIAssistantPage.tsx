import { useState, useMemo } from "react";
import { Send, Bot } from "lucide-react";
import { Input, Button } from "@/shared/ui";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAssistantChat } from "../hooks/useAssistantChat";
import type { ChatMessage, ChartData } from "../types";

const FOLLOW_UP_QUESTIONS = [
  "Покажи распределение по офисам",
  "Какие менеджеры наиболее загружены?",
  "Сколько обращений с приоритетом выше 8?",
  "Покажи обращения на русском языке",
  "Какой процент VIP обращений?",
  "Сравни нагрузку между офисами",
];

const CHART_COLORS = ["#16A34A", "#2563EB", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

function toRechartsData(chart: ChartData) {
  return chart.labels.map((label, i) => ({
    label,
    value: chart.values[i] ?? 0,
  }));
}

function AssistantChart({ chart }: { chart: ChartData }) {
  const data = useMemo(() => toRechartsData(chart), [chart]);

  const tooltipStyle = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: "6px",
    fontSize: "12px",
  };

  if (chart.chart_type === "pie") {
    return (
      <div className="mt-4 ml-11 bg-card border border-border rounded-lg p-4 max-w-[80%]">
        {chart.title && <p className="text-sm font-medium text-foreground mb-2">{chart.title}</p>}
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.chart_type === "line") {
    return (
      <div className="mt-4 ml-11 bg-card border border-border rounded-lg p-4 max-w-[80%]">
        {chart.title && <p className="text-sm font-medium text-foreground mb-2">{chart.title}</p>}
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6B7280" label={chart.x_label ? { value: chart.x_label, position: "insideBottom", offset: -5, fontSize: 12 } : undefined} />
            <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" label={chart.y_label ? { value: chart.y_label, angle: -90, position: "insideLeft", fontSize: 12 } : undefined} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="mt-4 ml-11 bg-card border border-border rounded-lg p-4 max-w-[80%]">
      {chart.title && <p className="text-sm font-medium text-foreground mb-2">{chart.title}</p>}
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#6B7280" label={chart.x_label ? { value: chart.x_label, position: "insideBottom", offset: -5, fontSize: 12 } : undefined} />
          <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" label={chart.y_label ? { value: chart.y_label, angle: -90, position: "insideLeft", fontSize: 12 } : undefined} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name={chart.y_label || "Значение"} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      {message.role === "assistant" && (
        <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <Bot size={16} className="text-foreground" />
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          message.role === "user" ? "bg-primary text-white" : "bg-muted text-foreground"
        }`}
      >
        <p className="text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

export function AIAssistantPage() {
  const [query, setQuery] = useState("");
  const { messages, loading, sendMessage } = useAssistantChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    sendMessage(query);
    setQuery("");
  };

  const handleQuestionClick = (q: string) => setQuery(q);

  return (
    <div className="p-8">
      <div className="max-w-[1440px] mx-auto">
        <h1 className="text-[32px] font-semibold text-foreground mb-8">AI-ассистент</h1>

        <div className="bg-card border border-border rounded-lg flex flex-col h-[calc(100vh-200px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                <MessageBubble message={message} />

                {message.chartData && <AssistantChart chart={message.chartData} />}

                {message.role === "assistant" && (
                  <div className="mt-4 ml-11 max-w-[80%]">
                    <p className="text-xs text-muted-foreground mb-3">Уточняющие вопросы</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3">
                      {FOLLOW_UP_QUESTIONS.map((question, qIndex) => (
                        <button
                          key={qIndex}
                          onClick={() => handleQuestionClick(question)}
                          className="text-left px-4 py-3 bg-white border border-[#E5E7EB] rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                placeholder="Задайте вопрос по распределению..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={loading}>
                <Send size={18} />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
