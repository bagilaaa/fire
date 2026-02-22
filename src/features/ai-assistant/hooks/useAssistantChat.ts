import { useState, useCallback } from "react";
import type { ChatMessage } from "../types";
import { sendAssistantQuery } from "../services/assistantApi";

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Здравствуйте! Я AI-ассистент системы FIRE. Задайте вопрос о распределении обращений, и я помогу вам с анализом данных.",
};

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim()) return;
    const userMessage: ChatMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    try {
      const response = await sendAssistantQuery(query);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.text,
          chartData: response.chartData,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Произошла ошибка. Попробуйте позже." },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { messages, loading, sendMessage };
}
