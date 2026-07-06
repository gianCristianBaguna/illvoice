export interface VisionResult {
  description: string;
  hazards: string[];
  severity_indicator: string;
  frameBase64?: string;
  allHazards?: string[][];
}

export interface VisionProvider {
  analyzeImage(image: string): Promise<VisionResult>;
  analyzeVideoMultiFrame(videoUrl: string, maxFrames?: number): Promise<VisionResult>;
}

export interface TextProvider {
  generateInsights(
    title: string,
    description: string,
    severity: string,
    hazardsDetected?: string[],
    audioTranscript?: string
  ): Promise<string>;
  
  classifySeverity(
    title: string,
    description: string,
    transcribedAudio?: string,
    imageAnalysis?: VisionResult
  ): Promise<string>;
}

export interface AudioProvider {
  transcribe(audioUrl: string): Promise<string>;
}

export type AIProviderType = "gemini" | "openai" | "ollama" | "hybrid";