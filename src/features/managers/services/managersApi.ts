import { apiGet } from "@/shared/api/client";
import type { Manager } from "../types";

interface ManagerOut {
  id: number;
  full_name: string;
  position: string | null;
  office_name: string | null;
  skills: string | null;
  workload: number;
}

function mapManager(m: ManagerOut): Manager {
  return {
    id: String(m.id),
    name: m.full_name,
    office: m.office_name ?? "",
    skills: m.skills
      ? m.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    activeRequests: m.workload,
  };
}

export async function fetchManagers(): Promise<Manager[]> {
  const data = await apiGet<ManagerOut[]>("/managers");
  return data.map(mapManager);
}
