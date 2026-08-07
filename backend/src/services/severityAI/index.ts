import { getRuleBasedSeverity } from './keyword-store';
import {
    getAudioProvider,
    getTextProvider,
    getVisionProvider,
} from "./providers";

export { SEVERITY_DESCRIPTIONS } from "./keywords";
export type { SeverityLevel } from "./keywords";
export { getAudioProvider, getTextProvider, getVisionProvider };

export function extractVideoFramesEverySecond(videoUrl: string, intervalSeconds: number = 1): Promise<string[]> {
  const fs = require("fs");
  const { spawn } = require("child_process");
  const path = require("path");
  const os = require("os");
  const fetch = require("node-fetch");

  return new Promise(async (resolve) => {
    try {
      const response = await fetch(videoUrl);
      if (!response.ok) return resolve([]);
      const videoBuffer = await response.arrayBuffer();
      const tmpVideoPath = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
      const framesDir = path.join(os.tmpdir(), `frames_${Date.now()}`);
      fs.writeFileSync(tmpVideoPath, Buffer.from(videoBuffer));
      fs.mkdirSync(framesDir, { recursive: true });

      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      const ff = spawn(ffmpegPath, [
        "-i", tmpVideoPath,
        "-vf", `fps=1/${intervalSeconds}`,
        "-q:v", "2",
        path.join(framesDir, "frame_%04d.jpg"),
      ]);

      ff.on("close", (code: number) => {
        try {
          fs.unlinkSync(tmpVideoPath);
          if (code === 0) {
            const files = fs.readdirSync(framesDir).filter((f: string) => f.startsWith("frame_") && f.endsWith(".jpg")).sort();
            const frames: string[] = [];
            for (const file of files) {
              const frameBuffer = fs.readFileSync(path.join(framesDir, file));
              frames.push(`data:image/jpeg;base64,${frameBuffer.toString("base64")}`);
            }
            fs.rmSync(framesDir, { recursive: true, force: true });
            resolve(frames);
          } else resolve([]);
        } catch {
          resolve([]);
        }
      });
    } catch {
      resolve([]);
    }
  });
}

export async function transcribeAudioLocal(audioUrl: string): Promise<string> {
  const fs = require("fs");
  const { spawn } = require("child_process");
  const { join, tmpdir } = require("path");
  const fetch = require("node-fetch");

  try {
    const response = await fetch(audioUrl);
    if (!response.ok) return "";

    const audioBuffer = await response.arrayBuffer();
    const tmpAudioPath = join(tmpdir(), `audio_${Date.now()}.wav`);
    fs.writeFileSync(tmpAudioPath, Buffer.from(audioBuffer));

    return new Promise((resolve) => {
      const whisperPath = process.env.FASTER_WHISPER_PATH || "faster-whisper";
      const whisper = spawn(whisperPath, ["--model", "base", "--language", "auto", tmpAudioPath]);

      let output = "";
      let errorOutput = "";

      whisper.stdout.on("data", (data: Buffer) => { output += data.toString(); });
      whisper.stderr.on("data", (data: Buffer) => { errorOutput += data.toString(); });

      whisper.on("close", (code: number) => {
        try { fs.unlinkSync(tmpAudioPath); } catch { }
        if (code === 0) {
          console.log("✅ Local whisper transcribed:", output.substring(0, 100));
          resolve(output.trim());
        } else {
          console.error("❌ Local whisper error:", errorOutput);
          resolve("");
        }
      });

      whisper.on("error", (err: any) => {
        console.error("❌ Local whisper spawn error:", err.message);
        resolve("");
      });
    });
  } catch (err: any) {
    console.error("❌ Local whisper transcription error:", err.message);
    return "";
  }
}

export async function analyzeSeverityText(title: string, description: string): Promise<string> {
  return getRuleBasedSeverity(title, description);
}

export async function analyzeSeverityFromAudio(transcript: string): Promise<string> {
  return getRuleBasedSeverity("", transcript);
}

export async function analyzeSeverity({
  title,
  description,
  mediaType,
  mediaUrl,
  category,
}: {
  title: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
  category?: string;
}): Promise<string> {
  if (!mediaType || mediaType === "TEXT") {
    return getRuleBasedSeverity(title, description, undefined, category);
  }

  let transcribedAudio = "";
  let imageAnalysis = null;

  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn("⚠️ No AI API key set - falling back to rule-based analysis");
  }

  const audioProvider = getAudioProvider();
  const visionProvider = getVisionProvider();
  const textProvider = getTextProvider();

  if (mediaType === "AUDIO" && mediaUrl) {
    try {
      console.log("🎙️ Transcribing audio...");
      transcribedAudio = await audioProvider.transcribe(mediaUrl);
    } catch (err: any) {
      console.error("❌ Audio transcription failed:", err.message);
    }
  }

  if (mediaType === "IMAGE" && mediaUrl) {
    try {
      console.log("📷 Analyzing image...");
      imageAnalysis = await visionProvider.analyzeImage(mediaUrl);
    } catch (err: any) {
      console.error("❌ Image analysis failed:", err.message);
    }
  }

  if (mediaType === "VIDEO" && mediaUrl) {
    try {
      console.log("🎥 Analyzing video...");
      imageAnalysis = await visionProvider.analyzeVideoMultiFrame(mediaUrl);
    } catch (err: any) {
      console.error("❌ Video analysis failed:", err.message);
    }
  }

  try {
    return await textProvider.classifySeverity(title, description, transcribedAudio, imageAnalysis ?? undefined, category);
  } catch (err: any) {
    console.error("❌ AI analysis failed, falling back to rules:", err.message);
    return getRuleBasedSeverity(title, description, transcribedAudio, category);
  }
}

export async function generateAIInsights({
  title,
  description,
  mediaType,
  mediaUrl,
  currentSeverity,
  category,
}: {
  title: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
  currentSeverity: string;
  category?: string;
}): Promise<string> {
  let transcribedAudio = "";
  let hazardsDetected: string[] = [];

  if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
    console.warn("⚠️ No AI API key set - AI insights disabled");
  }

  const audioProvider = getAudioProvider();
  const visionProvider = getVisionProvider();
  const textProvider = getTextProvider();

  if (mediaType === "AUDIO" && mediaUrl) {
    try {
      transcribedAudio = await audioProvider.transcribe(mediaUrl);
    } catch (err: any) {
      console.error("❌ Audio transcription for insights failed:", err.message);
    }
  }

  if (mediaType === "IMAGE" && mediaUrl) {
    try {
      const analysis = await visionProvider.analyzeImage(mediaUrl);
      hazardsDetected = analysis.hazards;
    } catch (err: any) {
      console.error("❌ Image analysis for insights failed:", err.message);
    }
  }

  if (mediaType === "VIDEO" && mediaUrl) {
    try {
      const analysis = await visionProvider.analyzeVideoMultiFrame(mediaUrl);
      hazardsDetected = analysis.hazards;
    } catch (err: any) {
      console.error("❌ Video analysis for insights failed:", err.message);
    }
  }

  try {
    return await textProvider.generateInsights(
      title,
      description,
      currentSeverity,
      hazardsDetected.length > 0 ? hazardsDetected : undefined,
      transcribedAudio || undefined,
      category
    );
  } catch (err: any) {
    console.error("❌ AI insights generation failed, using fallback:", err.message);
    return "AI analysis not available.";
  }
}