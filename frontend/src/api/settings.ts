import { apiClient } from "@/api/client";
import type { AIProcessingSettings, AIProcessingSettingsUpdate } from "@/api/types";

export async function getAIProcessingSettings(): Promise<AIProcessingSettings> {
  const { data } = await apiClient.get<AIProcessingSettings>("/settings/ai-processing");
  return data;
}

export async function updateAIProcessingSettings(
  payload: AIProcessingSettingsUpdate,
): Promise<AIProcessingSettings> {
  const { data } = await apiClient.put<AIProcessingSettings>(
    "/settings/ai-processing",
    payload,
  );
  return data;
}