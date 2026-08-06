import fs from "fs";
import fetch from "node-fetch";
import { getRuleBasedSeverity } from "../keyword-store";
import { VisionProvider, VisionResult } from "./interface";

async function resolveImageUrl(imageUrl: string): Promise<string> {
  if (!imageUrl) return imageUrl;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://") || imageUrl.startsWith("data:")) {
    return imageUrl;
  }
  try {
    if (fs.existsSync(imageUrl)) {
      const buffer = fs.readFileSync(imageUrl);
      const ext = imageUrl.split(".").pop()?.toLowerCase() || "png";
      const mimeMap: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
      const mime = mimeMap[ext] || "image/png";
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }
  } catch {
    console.error("Failed to read local image file:", imageUrl);
  }
  return imageUrl;
}

async function extractVideoFrames(videoUrl: string): Promise<string[]> {
  const fs = require("fs");
  const { spawn } = require("child_process");
  const path = require("path");
  const { tmpdir } = require("os");

  let videoBuffer: Buffer;
  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error("Failed to fetch video:", response.status);
      return [];
    }
    videoBuffer = Buffer.from(await response.arrayBuffer());
  } else {
    try {
      videoBuffer = fs.readFileSync(videoUrl);
    } catch {
      console.error("Failed to read local video file:", videoUrl);
      return [];
    }
  }
  const tmpVideoPath = path.join(tmpdir(), `video_${Date.now()}.mp4`);
  const framesDir = path.join(tmpdir(), `frames_${Date.now()}`);

  fs.writeFileSync(tmpVideoPath, videoBuffer);
  fs.mkdirSync(framesDir, { recursive: true });

  return new Promise((resolve) => {
    const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
    const ffmpeg = spawn(ffmpegPath, [
      "-i", tmpVideoPath,
      "-vf", "fps=1/1",
      path.join(framesDir, "frame_%04d.jpg"),
    ]);

    ffmpeg.on("close", (code: number) => {
      try {
        fs.unlinkSync(tmpVideoPath);

        if (code === 0) {
          const files = fs.readdirSync(framesDir)
            .filter((f: string) => f.startsWith("frame_") && f.endsWith(".jpg"))
            .sort();

          const frames: string[] = [];
          for (const file of files) {
            const frameBuffer = fs.readFileSync(path.join(framesDir, file));
            frames.push(`data:image/jpeg;base64,${frameBuffer.toString("base64")}`);
          }

          fs.rmSync(framesDir, { recursive: true, force: true });
          resolve(frames);
        } else {
          fs.rmSync(framesDir, { recursive: true, force: true });
          resolve([]);
        }
      } catch (err: any) {
        console.error("Frame extraction error:", err.message);
        resolve([]);
      }
    });

    ffmpeg.on("error", () => {
      try { fs.unlinkSync(tmpVideoPath); } catch { }
      try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch { }
      resolve([]);
    });
  });
}

function getBase64FromDataUri(dataUri: string): string {
  if (dataUri.startsWith("data:")) {
    const base64Match = dataUri.match(/base64,(.*)$/);
    return base64Match ? base64Match[1] : dataUri;
  }
  return dataUri;
}

function parseJsonFromResponse(text: string): VisionResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return { description: "", hazards: [], severity_indicator: "LOW" };
    }
  }
  return { description: "", hazards: [], severity_indicator: "LOW" };
}

async function analyzeWithOllama(imageBase64: string, prompt: string): Promise<VisionResult> {
  const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "http://localhost:11434";

  try {
    const response = await fetch(`${ollamaEndpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llava",
        messages: [
          {
            role: "user",
            content: prompt,
            images: [imageBase64],
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Ollama request failed:", response.status);
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }

    const data = await response.json();
    const text = (data as any).message?.content || "{}";
    return parseJsonFromResponse(text);
  } catch (err: any) {
    console.error("Ollama vision error:", err.message);
    return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
  }
}

export const ollamaVisionProvider: VisionProvider = {
  async analyzeImage(image: string): Promise<VisionResult> {
    const resolved = await resolveImageUrl(image);
    const base64 = resolved.startsWith("data:") ? getBase64FromDataUri(resolved) : resolved;

    const prompt = `Analyze this image for public safety hazards. Return JSON with:
{
  "description": "brief description of what you see",
  "hazards": ["list", "of", "identified", "hazards"],
  "severity_indicator": "LOW|MODERATE|HIGH"
}

Look for: fire, flooding, structural damage, accidents, debris, dangerous conditions, etc.`;

    const result = await analyzeWithOllama(base64, prompt);
    console.log("✅ Image analyzed with Ollama, hazards found:", result.hazards);
    return result;
  },

  async analyzeVideoMultiFrame(videoUrl: string, maxFrames: number = 5): Promise<VisionResult> {
    const frames = await extractVideoFrames(videoUrl);
    const framesToAnalyze = frames.slice(0, maxFrames);

    if (framesToAnalyze.length === 0) {
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }

    const allHazards: string[][] = [];
    let combinedDescription = "";

    const prompt = `Analyze this video frame for public safety hazards. Return JSON with:
{
  "description": "brief description of what you see in the frame",
  "hazards": ["list", "of", "identified", "hazards"],
  "severity_indicator": "LOW|MODERATE|HIGH"
}

Look for: fire, flooding, structural damage, accidents, debris, dangerous conditions, etc.`;

    for (const frame of framesToAnalyze) {
      const base64 = frame.startsWith("data:") ? getBase64FromDataUri(frame) : frame;
      const result = await analyzeWithOllama(base64, prompt);

      allHazards.push(result.hazards);
      combinedDescription += `${result.description}. Hazards: ${result.hazards.join(", ")}. `;

      if (result.severity_indicator === "HIGH") {
        return {
          description: combinedDescription,
          hazards: result.hazards,
          severity_indicator: "HIGH",
          allHazards,
        };
      }
    }

    const combinedHazards = allHazards.flat();
    const ruleBasedSeverity = await getRuleBasedSeverity(combinedDescription, "", "");

    return {
      description: combinedDescription,
      hazards: combinedHazards,
      severity_indicator: ruleBasedSeverity,
      allHazards,
    };
  },
};