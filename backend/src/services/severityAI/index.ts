import { getRuleBasedSeverity, getHazardSeverity } from './keyword-store';
import {
    getAudioProvider,
    getTextProvider,
    getVisionProvider,
} from "./providers";
import type { VisionResult } from "./providers/interface";

export { SEVERITY_DESCRIPTIONS } from "./keywords";
export type { SeverityLevel } from "./keywords";
export { getAudioProvider, getTextProvider, getVisionProvider };

export async function generateAITitle(
  title: string,
  description: string,
  hazardsDetected?: string[],
  category?: string
): Promise<string> {
  const textProvider = getTextProvider();
  try {
    return await textProvider.generateAITitle(title, description, hazardsDetected, category);
  } catch (err: any) {
    console.error("❌ AI title generation failed, using original title:", err.message);
    return title;
  }
}

export interface MediaItem {
    type: string;
    url: string;
}

function normalizeMediaList(
    mediaType?: string,
    mediaUrl?: string,
    mediaItems?: MediaItem[]
): MediaItem[] {
    const list: MediaItem[] = [];
    if (mediaItems && mediaItems.length) {
        for (const m of mediaItems) {
            if (m && m.type && m.url) {
                list.push({ type: m.type.toUpperCase(), url: m.url });
            }
        }
    } else if (mediaType && mediaType !== "TEXT" && mediaUrl) {
        list.push({ type: mediaType.toUpperCase(), url: mediaUrl });
    }
    return list;
}

function mergeVisionResults(results: VisionResult[]): VisionResult | null {
    if (!results.length) return null;
    const hazards = Array.from(new Set(results.flatMap((r) => r.hazards || [])));
    const descriptions = results.map((r) => r.description).filter(Boolean);
    const primary = results[0];
    return {
        description: descriptions.join(". ").slice(0, 2000),
        hazards,
        severity_indicator: primary.severity_indicator,
        frameBase64: primary.frameBase64,
        allHazards: results.map((r) => r.hazards || []),
    };
}

async function analyzeMediaItems(items: MediaItem[]) {
    const audioProvider = getAudioProvider();
    const visionProvider = getVisionProvider();

    let combinedTranscript = "";
    const visionResults: VisionResult[] = [];

    for (const item of items) {
        const t = item.type.toUpperCase();
        if (!item.url) continue;
        try {
            if (t === "IMAGE") {
                console.log("📷 Analyzing image...");
                visionResults.push(await visionProvider.analyzeImage(item.url));
            } else if (t === "VIDEO") {
                console.log("🎥 Analyzing video...");
                visionResults.push(await visionProvider.analyzeVideoMultiFrame(item.url));
            } else if (t === "AUDIO") {
                console.log("🎙️ Transcribing audio...");
                const tr = await audioProvider.transcribe(item.url);
                if (tr) combinedTranscript += (combinedTranscript ? " " : "") + tr;
            }
        } catch (err: any) {
            console.error(`❌ Media analysis failed for ${t}:`, err.message);
        }
    }

    return {
        combinedTranscript,
        imageAnalysis: mergeVisionResults(visionResults),
    };
}

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
    mediaItems,
    category,
}: {
    title: string;
    description: string;
    mediaType?: string;
    mediaUrl?: string;
    mediaItems?: MediaItem[];
    category?: string;
}): Promise<string> {
    const items = normalizeMediaList(mediaType, mediaUrl, mediaItems);
    const textProvider = getTextProvider();

    let combinedTranscript = "";
    let imageAnalysis: any = undefined;

    if (items.length) {
        const result = await analyzeMediaItems(items);
        combinedTranscript = result.combinedTranscript;
        imageAnalysis = result.imageAnalysis;
    }

    let aiSeverity: string | null = null;
    try {
        aiSeverity = await textProvider.classifySeverity(
            title,
            description,
            combinedTranscript || undefined,
            imageAnalysis || undefined,
            category
        );
    } catch (err: any) {
        console.error("❌ AI severity classification failed, falling back to rule-based:", err.message);
    }

    const ruleBasedSeverity = await getRuleBasedSeverity(
        title,
        description,
        combinedTranscript || undefined,
        category
    );
    const hazardSeverity = imageAnalysis?.hazards?.length
        ? await getHazardSeverity(imageAnalysis.hazards)
        : "LOW";

    const severities = [aiSeverity, ruleBasedSeverity, hazardSeverity].filter(Boolean) as string[];

    if (severities.includes("HIGH")) return "HIGH";
    if (severities.includes("MODERATE")) return "MODERATE";
    return "LOW";
}

export async function generateAIInsights({
    title,
    description,
    mediaType,
    mediaUrl,
    mediaItems,
    currentSeverity,
    category,
}: {
    title: string;
    description: string;
    mediaType?: string;
    mediaUrl?: string;
    mediaItems?: MediaItem[];
    currentSeverity: string;
    category?: string;
}): Promise<string> {
    const items = normalizeMediaList(mediaType, mediaUrl, mediaItems);

    if (!process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY) {
        console.warn("⚠️ No AI API key set - AI insights disabled");
    }

    let combinedTranscript = "";
    const visionResults: VisionResult[] = [];

    if (items.length) {
        const result = await analyzeMediaItems(items);
        combinedTranscript = result.combinedTranscript;
        if (result.imageAnalysis) visionResults.push(result.imageAnalysis);
    }

    const hazardsDetected = Array.from(new Set(visionResults.flatMap((r) => r.hazards || [])));
    const textProvider = getTextProvider();

    try {
        return await textProvider.generateInsights(
            title,
            description,
            currentSeverity,
            hazardsDetected.length > 0 ? hazardsDetected : undefined,
            combinedTranscript || undefined,
            category
        );
    } catch (err: any) {
        console.error("❌ AI insights generation failed, using fallback:", err.message);
        return "AI analysis not available.";
    }
}