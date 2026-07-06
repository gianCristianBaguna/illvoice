import { spawn } from "child_process";
import fs from "fs";
import fetch from "node-fetch";
import OpenAI from "openai";
import { tmpdir } from "os";
import { join } from "path";
import { SEVERITY_KEYWORDS } from "../keywords";
import { VisionResult, VisionProvider, TextProvider, AudioProvider } from "./interface";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is not configured.");
      return null;
    }
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export const openaiVisionProvider: VisionProvider = {
  async analyzeImage(imageUrl: string): Promise<VisionResult> {
    const client = getOpenAIClient();
    if (!client) {
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image for public safety hazards. Return JSON with:
{
  "description": "brief description of what you see",
  "hazards": ["list", "of", "identified", "hazards"],
  "severity_indicator": "LOW|MODERATE|HIGH"
}

Look for: fire, flooding, structural damage, accidents, debris, dangerous conditions, etc.`,
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { description: "", hazards: [], severity_indicator: "LOW" };

      console.log("✅ Image analyzed, hazards found:", result.hazards);
      return result;
    } catch (err: any) {
      console.error("❌ Vision analysis error:", err.message);
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }
  },

  async analyzeVideoMultiFrame(videoUrl: string, maxFrames: number = 5): Promise<VisionResult> {
    const client = getOpenAIClient();
    if (!client) {
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }

    const response = await fetch(videoUrl);
    if (!response.ok) return { description: "", hazards: [], severity_indicator: "UNKNOWN" };

    const videoBuffer = await response.arrayBuffer();
    const tmpVideoPath = join(tmpdir(), `video_${Date.now()}.mp4`);
    const framesDir = join(tmpdir(), `frames_${Date.now()}`);

    fs.writeFileSync(tmpVideoPath, Buffer.from(videoBuffer));
    fs.mkdirSync(framesDir, { recursive: true });

    return new Promise(async (resolve) => {
      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      const ffmpeg = spawn(ffmpegPath, [
        "-i", tmpVideoPath,
        "-vf", `fps=1/1`,
        "-q:v", "2",
        join(framesDir, "frame_%04d.jpg"),
      ]);

      const allHazards: string[][] = [];
      let combinedDescription = "";

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

          for (const file of files) {
            const frameBuffer = fs.readFileSync(join(framesDir, file));
            const base64 = `data:image/jpeg;base64,${frameBuffer.toString("base64")}`;

            try {
              const resp = await client.chat.completions.create({
                model: "gpt-4o",
                messages: [
                  {
                    role: "user",
                    content: [
                      {
                        type: "text",
                        text: `Analyze this video frame for public safety hazards. Return JSON with:
{
  "description": "brief description of what you see in the frame",
  "hazards": ["list", "of", "identified", "hazards"],
  "severity_indicator": "LOW|MODERATE|HIGH"
}

Look for: fire, flooding, structural damage, accidents, debris, dangerous conditions, etc.`,
                      },
                      { type: "image_url", image_url: { url: base64 } },
                    ],
                  },
                ],
              });

              const content = resp.choices[0].message.content || "{}";
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { description: "", hazards: [], severity_indicator: "LOW" };

              allHazards.push(parsed.hazards);
              combinedDescription += `${parsed.description}. Hazards: ${parsed.hazards.join(", ")}. `;

              if (parsed.severity_indicator === "HIGH") {
                fs.rmSync(framesDir, { recursive: true, force: true });
                resolve({ description: combinedDescription, hazards: parsed.hazards, severity_indicator: "HIGH", allHazards });
                return;
              }
            } catch (e: any) {
              console.error("Frame analysis error:", e.message);
            }
          }

          fs.rmSync(framesDir, { recursive: true, force: true });
          const combinedHazards = allHazards.flat();
          const ruleBasedSeverity = getRuleBasedSeverity(combinedDescription, "", "");

          resolve({ description: combinedDescription, hazards: combinedHazards, severity_indicator: ruleBasedSeverity, allHazards });
        } catch (err: any) {
          console.error("Multi-frame extraction error:", err.message);
          try { fs.unlinkSync(tmpVideoPath); } catch { }
          try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch { }
          resolve({ description: "", hazards: [], severity_indicator: "UNKNOWN" });
        }
      });

      ffmpeg.on("error", (err: any) => {
        console.error("FFmpeg error:", err.message);
        resolve({ description: "", hazards: [], severity_indicator: "UNKNOWN" });
      });
    });
  },
};

function getRuleBasedSeverity(title: string, description: string, audioText?: string): string {
  const text = `${title} ${description} ${audioText || ""}`.toLowerCase();

  const highMatch = SEVERITY_KEYWORDS.HIGH.some(k => text.includes(k.toLowerCase()));
  if (highMatch) return "HIGH";

  const moderateMatch = SEVERITY_KEYWORDS.MODERATE.some(k => text.includes(k.toLowerCase()));
  if (moderateMatch) return "MODERATE";

  const lowMatch = SEVERITY_KEYWORDS.LOW.some(k => text.includes(k.toLowerCase()));
  if (lowMatch) return "LOW";

  return "LOW";
}

export const openaiTextProvider: TextProvider = {
  async generateInsights(
    title: string,
    description: string,
    severity: string,
    hazardsDetected?: string[],
    audioTranscript?: string
  ): Promise<string> {
    const client = getOpenAIClient();
    if (!client) {
      throw new Error("OpenAI API key not configured.");
    }

    const prompt = `You are a public safety analysis AI. Provide a concise actionable analysis (2-3 sentences) of this report:

Title: ${title}
Description: ${description}
Severity: ${severity}
${hazardsDetected?.length ? `Detected Hazards: ${hazardsDetected.join(", ")}` : ""}
${audioTranscript ? `Audio Report: ${audioTranscript}` : ""}

Include:
1. Key observations
2. Recommended response priority
3. Immediate safety concerns`;

    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert public safety analyst. Provide concise, actionable insights." },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
      });

      return response.choices[0].message.content || "Analysis unavailable.";
    } catch (err: any) {
      console.error("❌ AI insights error:", err.message);
      return "Analysis unavailable due to API error.";
    }
  },

  async classifySeverity(
    title: string,
    description: string,
    transcribedAudio?: string,
    imageAnalysis?: VisionResult
  ): Promise<string> {
    const client = getOpenAIClient();
    if (!client) {
      throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in backend/.env to enable AI analysis.");
    }

    let fullDescription = `Title: ${title}\nDescription: ${description}`;

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
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an expert AI classifier for public safety incident severity. Respond only with the severity level." },
          { role: "user", content: prompt },
        ],
        temperature: 0,
      });

      const result = response.choices[0].message.content?.trim().toUpperCase() || "LOW";

      if (result.includes("HIGH")) return "HIGH";
      if (result.includes("MODERATE")) return "MODERATE";
      return "LOW";
    } catch (err: any) {
      console.error("❌ Multimodal severity analysis error:", err.message);
      return getRuleBasedSeverity(title, description, transcribedAudio);
    }
  },
};

export const openaiAudioProvider: AudioProvider = {
  async transcribe(audioUrl: string): Promise<string> {
    const client = getOpenAIClient();
    if (!client) {
      console.log("OpenAI not configured, cannot transcribe audio");
      return "";
    }

    try {
      const response = await fetch(audioUrl);
      if (!response.ok) {
        console.error("Failed to fetch audio:", response.status);
        return "";
      }

      const audioBuffer = await response.arrayBuffer();
      const tmpAudioPath = join(tmpdir(), `audio_${Date.now()}.mp3`);
      fs.writeFileSync(tmpAudioPath, Buffer.from(audioBuffer));

      const transcript = await client.audio.transcriptions.create({
        model: "whisper-1",
        file: fs.readFileSync(tmpAudioPath) as any,
      });

      fs.unlinkSync(tmpAudioPath);
      console.log("✅ Audio transcribed:", transcript.text.substring(0, 100));
      return transcript.text;
    } catch (err: any) {
      console.error("❌ Whisper transcription error:", err.message);
      return "";
    }
  },
};