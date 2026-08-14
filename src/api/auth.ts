import { apiClient, setToken } from "./client";
import type { Agent } from "../types/index";

export async function login(email: string, password: string): Promise<Agent> {
  const { data } = await apiClient.post("/api/auth/login", { email, password });
  setToken(data.access_token);
  return data.agent as Agent;
}

export async function fetchMe(): Promise<Agent> {
  const { data } = await apiClient.get("/api/auth/me");
  return data as Agent;
}

