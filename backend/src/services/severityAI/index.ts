import {
  analyzeSeverityMultimodal,
  analyzeImageWithVision,
  analyzeVideoWithVision,
  transcribeAudio,
  generateAIInsightsMultimodal,
} from "./whisper-vision-gpt";

export async function analyzeSeverity({
  title,
  description,
  mediaType,
  mediaUrl,
}: {
  title: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
}): Promise<string> {
  let transcribedAudio = "";
  let imageAnalysis = null;

  if (mediaType === "AUDIO" && mediaUrl) {
    console.log("🎙️ Transcribing audio with Whisper...");
    transcribedAudio = await transcribeAudio(mediaUrl);
  }

  if (mediaType === "IMAGE" && mediaUrl) {
    console.log("📷 Analyzing image with Vision...");
    imageAnalysis = await analyzeImageWithVision(mediaUrl);
  }

  if (mediaType === "VIDEO" && mediaUrl) {
    console.log("🎥 Analyzing video with Vision...");
    imageAnalysis = await analyzeVideoWithVision(mediaUrl);
  }

  return analyzeSeverityMultimodal({
    title,
    description,
    mediaType,
    mediaUrl,
    transcribedAudio,
    imageAnalysis,
  });
}

export async function generateAIInsights({
  title,
  description,
  mediaType,
  mediaUrl,
  currentSeverity,
}: {
  title: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
  currentSeverity: string;
}): Promise<string> {
  let transcribedAudio = "";
  let hazardsDetected: string[] = [];

  if (mediaType === "AUDIO" && mediaUrl) {
    transcribedAudio = await transcribeAudio(mediaUrl);
  }

  if (mediaType === "IMAGE" && mediaUrl) {
    const analysis = await analyzeImageWithVision(mediaUrl);
    hazardsDetected = analysis.hazards;
  }

  if (mediaType === "VIDEO" && mediaUrl) {
    const analysis = await analyzeVideoWithVision(mediaUrl);
    hazardsDetected = analysis.hazards;
  }

  return generateAIInsightsMultimodal({
    title,
    description,
    severity: currentSeverity,
    hazardsDetected: hazardsDetected.length > 0 ? hazardsDetected : undefined,
    audioTranscript: transcribedAudio || undefined,
  });
}