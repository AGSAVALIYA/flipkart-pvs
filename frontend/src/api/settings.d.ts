import type { AIProcessingSettings, AIProcessingSettingsUpdate } from "@/api/types";
export declare function getAIProcessingSettings(): Promise<AIProcessingSettings>;
export declare function updateAIProcessingSettings(payload: AIProcessingSettingsUpdate): Promise<AIProcessingSettings>;
