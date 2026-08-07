import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import fetch from "node-fetch";
import { getRuleBasedSeverity } from "../keyword-store";
import { TextProvider, VisionProvider, VisionResult } from "./interface";

let ai: GoogleGenAI | null = null;

function getGenAIClient(): GoogleGenAI | null {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is not configured. Add GEMINI_API_KEY to backend/.env to enable Gemini AI analysis.");
      return null;
    }
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return ai;
}

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

function getBase64FromDataUri(dataUri: string): string {
  if (dataUri.startsWith("data:")) {
    const base64Match = dataUri.match(/base64,(.*)$/);
    return base64Match ? base64Match[1] : dataUri;
  }
  return dataUri;
}

function getMimeType(dataUri: string): string {
  const mimeMatch = dataUri.match(/data:(.*?);base64/);
  return mimeMatch ? mimeMatch[1] : "image/jpeg";
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

async function analyzeImageWithGenAI(imageUrl: string): Promise<VisionResult> {
  const genai = getGenAIClient();
  if (!genai) {
    return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
  }

  try {
    let base64Image: string;
    let mimeType: string;

    if (imageUrl.startsWith("data:")) {
      base64Image = getBase64FromDataUri(imageUrl);
      mimeType = getMimeType(imageUrl);
    } else {
      const resolvedUrl = await resolveImageUrl(imageUrl);
      if (resolvedUrl.startsWith("data:")) {
        base64Image = getBase64FromDataUri(resolvedUrl);
        mimeType = getMimeType(resolvedUrl);
      } else {
        const response = await fetch(resolvedUrl);
        if (!response.ok) {
          console.error("Failed to fetch image:", response.status);
          return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
        }
        const buffer = await response.arrayBuffer();
        base64Image = Buffer.from(buffer).toString("base64");
        mimeType = "image/jpeg";
      }
    }

    const result = await genai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Image,
          },
        },
        {
          text: `Analyze this image for public safety hazards. Return JSON with:
{
  "description": "brief description of what you see",
  "hazards": ["list", "of", "identified", "hazards"],
  "severity_indicator": "LOW|MODERATE|HIGH"
}

Look for: fire, flooding, structural damage, accidents, debris, dangerous conditions, etc.`,
        },
      ],
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsed = parseJsonFromResponse(text);

    console.log("✅ Image analyzed with Gemini, hazards found:", parsed.hazards);
    return parsed;
  } catch (err: any) {
    const errorMsg = err.message || "";
    if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota")) {
      console.warn("⚠️ Gemini quota exceeded, falling back to rule-based analysis");
    } else {
      console.error("❌ Gemini vision analysis error:", errorMsg);
    }
    return { description: "AI quota exceeded - manual review needed", hazards: [], severity_indicator: "UNKNOWN" };
  }
}

export const geminiVisionProvider: VisionProvider = {
  async analyzeImage(image: string): Promise<VisionResult> {
    return analyzeImageWithGenAI(image);
  },

  async analyzeVideoMultiFrame(videoUrl: string, maxFrames: number = 5): Promise<VisionResult> {
    const genai = getGenAIClient();
    if (!genai) {
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }

    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const { spawn } = require("child_process");

    try {
      let videoBuffer: Buffer;
      if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
        const response = await fetch(videoUrl);
        if (!response.ok) {
          console.error("Failed to fetch video:", response.status);
          return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
        }
        videoBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        try {
          videoBuffer = fs.readFileSync(videoUrl);
        } catch {
          return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
        }
      }

      const tmpVideoPath = path.join(os.tmpdir(), `video_${Date.now()}.mp4`);
      const framesDir = path.join(os.tmpdir(), `frames_${Date.now()}`);

      fs.writeFileSync(tmpVideoPath, videoBuffer);
      fs.mkdirSync(framesDir, { recursive: true });

      return new Promise(async (resolve) => {
        const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
        const ffmpeg = spawn(ffmpegPath, [
          "-i", tmpVideoPath,
          "-vf", `fps=1/1`,
          "-q:v", "2",
          path.join(framesDir, "frame_%04d.jpg"),
        ]);

        ffmpeg.on("close", async (code: number) => {
          try {
            fs.unlinkSync(tmpVideoPath);

            if (code !== 0) {
              fs.rmSync(framesDir, { recursive: true, force: true });
              resolve({ description: "", hazards: [], severity_indicator: "UNKNOWN" });
              return;
            }

            const files = fs.readdirSync(framesDir)
              .filter((f: string) => f.startsWith("frame_") && f.endsWith(".jpg"))
              .sort()
              .slice(0, maxFrames);

            const allHazards: string[][] = [];
            let combinedDescription = "";

            for (const file of files) {
              const frameBuffer = fs.readFileSync(path.join(framesDir, file));
              const base64 = frameBuffer.toString("base64");

              try {
                const result = await genai.models.generateContent({
                  model: "gemini-2.5-flash",
                  contents: [
                    { inlineData: { mimeType: "image/jpeg", data: base64 } },
                    { text: `Analyze this video frame for public safety hazards. Return JSON with description and hazards.` },
                  ],
                });

                const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
                const parsed = parseJsonFromResponse(text);
                
                allHazards.push(parsed.hazards);
                combinedDescription += `${parsed.description}. `;
              } catch (err: any) {
                console.error("Frame analysis error:", err.message);
              }
            }

            fs.rmSync(framesDir, { recursive: true, force: true });
            resolve({
              description: combinedDescription,
              hazards: allHazards.flat(),
              severity_indicator: await getRuleBasedSeverity(combinedDescription, "", ""),
            });
          } catch (err: any) {
            console.error("Video processing error:", err.message);
            resolve({ description: "", hazards: [], severity_indicator: "UNKNOWN" });
          }
        });

        ffmpeg.on("error", (err: any) => {
          console.error("FFmpeg error:", err.message);
          resolve({ description: "", hazards: [], severity_indicator: "UNKNOWN" });
        });
      });
    } catch (err: any) {
      console.error("Video analysis error:", err.message);
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }
  },
};

export const geminiTextProvider: TextProvider = {
   async generateInsights(
    title: string,
    description: string,
    severity: string,
    hazardsDetected?: string[],
    audioTranscript?: string,
    category?: string
  ): Promise<string> {
    const genai = getGenAIClient();
    if (!genai) {
      throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in backend/.env to enable AI analysis.");
    }

    const prompt = `You are a public safety analysis AI. Provide a concise actionable analysis (2-3 sentences) of this report:

Title: ${title}
Description: ${description}
Severity: ${severity}
${category ? `Category: ${category}` : ""}
${hazardsDetected?.length ? `Detected Hazards: ${hazardsDetected.join(", ")}` : ""}
${audioTranscript ? `Audio Report: ${audioTranscript}` : ""}

Include:
1. Key observations
2. Recommended response priority
3. Immediate safety concerns`;

    try {
      const result = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
      });

      return result.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis unavailable.";
    } catch (err: any) {
      console.error("❌ Gemini insights error:", err.message);
      return "Analysis unavailable due to API error.";
    }
  },

  async classifySeverity(
    title: string,
    description: string,
    transcribedAudio?: string,
    imageAnalysis?: VisionResult,
    category?: string
  ): Promise<string> {
    const genai = getGenAIClient();
    if (!genai) {
      throw new Error("Gemini API key not configured. Set GEMINI_API_KEY in backend/.env to enable AI analysis.");
    }

    let fullDescription = `Title: ${title}\nDescription: ${description}`;
    if (category) {
      fullDescription += `\nReport Category: ${category}`;
    }

    if (transcribedAudio) {
      fullDescription += `\n\nTranscribed Audio Report: ${transcribedAudio}`;
    }

    if (imageAnalysis && imageAnalysis.hazards.length > 0) {
      fullDescription += `\n\nImage Analysis - Identified Hazards: ${imageAnalysis.hazards.join(", ")}`;
      fullDescription += `\nImage Context: ${imageAnalysis.description}`;
    }

    const prompt = `You are a public safety AI used in a citizen reporting system.

Classify the SEVERITY of this incident based on ALL provided information.

SEVERITY LEVELS:

LOW
- litter, graffiti
- small potholes
- noise complaints
- minor flooding (< 1 foot, localized)
- minor public nuisance

MODERATE
- broken streetlights
- significant flooding (1-3 feet)
- traffic accidents (minor)
- damaged roads (medium)
- power outages
- blocked drains
- hazardous materials spills (small)

HIGH
- FIRE, FLAMES, SMOKE, BURNING (ALWAYS HIGH)
- large uncontrolled fires
- explosions or explosion risk
- violence or assault
- major structural damage
- major accidents with injuries
- collapsed structures
- hazmat spills (large)
- trapped persons
- flooding > 3 feet
- active crime scenes

CRITICAL RULES:
1. If ANY mention of fire, flames, smoke, burning → MUST be HIGH
2. If injuries or danger to life → MUST be HIGH
3. Multiple serious issues → escalate severity
4. If audio/image shows emergency → override text severity

ANALYSIS:
${fullDescription}

Return ONLY the word: LOW | MODERATE | HIGH`;

    try {
      const result = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
      });

      const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const trimmed = text.trim().toUpperCase();

      if (trimmed.includes("HIGH")) return "HIGH";
      if (trimmed.includes("MODERATE")) return "MODERATE";
      return "LOW";
    } catch (err: any) {
      console.error("❌ Gemini severity analysis error:", err.message);
      return getRuleBasedSeverity(title, description, transcribedAudio, category);
    }
  },
};

export const geminiAudioProvider = {
  async transcribe(audioUrl: string): Promise<string> {
    return "";
  },
};