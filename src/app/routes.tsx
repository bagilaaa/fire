import { createBrowserRouter } from "react-router";
import { Layout } from "./layout";
import { ImportDataPage } from "@/features/tickets/pages/ImportDataPage";
import { RequestsPage } from "@/features/tickets/pages/RequestsPage";
import { ManagersPage } from "@/features/managers/pages/ManagersPage";
import { AIAssistantPage } from "@/features/ai-assistant/pages/AIAssistantPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: ImportDataPage },
      { path: "requests", Component: RequestsPage },
      { path: "managers", Component: ManagersPage },
      { path: "ai-assistant", Component: AIAssistantPage },
    ],
  },
]);
