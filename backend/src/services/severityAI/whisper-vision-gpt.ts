import { spawn } from "child_process";
import fs from "fs";
import fetch from "node-fetch";
import OpenAI from "openai";
import { tmpdir } from "os";
import { join } from "path";
import { SEVERITY_KEYWORDS } from "./keywords";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY is not configured. AI analysis is disabled. Add OPENAI_API_KEY to backend/.env to enable.");
      return null;
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Extract a frame from a video URL and return as base64 image (data URI)
 */
export async function extractVideoFrame(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error("Failed to fetch video:", response.status);
      return null;
    }

    const videoBuffer = await response.arrayBuffer();
    const tmpVideoPath = join(tmpdir(), `video_${Date.now()}.mp4`);
    const tmpFramePath = join(tmpdir(), `frame_${Date.now()}.jpg`);

    fs.writeFileSync(tmpVideoPath, Buffer.from(videoBuffer));

    return new Promise((resolve) => {
      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      const ffmpeg = spawn(ffmpegPath, [
        "-i", tmpVideoPath,
        "-ss", "00:00:01",
        "-vframes", "1",
        "-q:v", "2",
        tmpFramePath
      ]);

      ffmpeg.on("close", (code: number) => {
        try {
          fs.unlinkSync(tmpVideoPath);
          if (code === 0 && fs.existsSync(tmpFramePath)) {
            const frameBuffer = fs.readFileSync(tmpFramePath);
            const base64 = `data:image/jpeg;base64,${frameBuffer.toString("base64")}`;
            fs.unlinkSync(tmpFramePath);
            resolve(base64);
          } else {
            if (fs.existsSync(tmpFramePath)) fs.unlinkSync(tmpFramePath);
            resolve(null);
          }
        } catch (err) {
          console.error("Frame extraction error:", err);
          resolve(null);
        }
      });

      ffmpeg.on("error", (err: any) => {
        console.error("FFmpeg error:", err.message);
        try { fs.unlinkSync(tmpVideoPath); } catch (e: any) { console.error("Cleanup error:", e.message); }
        resolve(null);
      });
    });
  } catch (err: any) {
    console.error("Video frame extraction error:", err.message);
    return null;
  }
}

export async function extractVideoFramesEverySecond(videoUrl: string, intervalSeconds: number = 1): Promise<string[]> {
  try {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.error("Failed to fetch video:", response.status);
      return [];
    }

    const videoBuffer = await response.arrayBuffer();
    const tmpVideoPath = join(tmpdir(), `video_${Date.now()}.mp4`);
    const framesDir = join(tmpdir(), `frames_${Date.now()}`);

    fs.writeFileSync(tmpVideoPath, Buffer.from(videoBuffer));
    fs.mkdirSync(framesDir, { recursive: true });

    return new Promise((resolve) => {
      const ffmpegPath = process.env.FFMPEG_PATH || "ffmpeg";
      const ffmpeg = spawn(ffmpegPath, [
        "-i", tmpVideoPath,
        "-vf", `fps=1/${intervalSeconds}`,
        "-q:v", "2",
        join(framesDir, "frame_%04d.jpg")
      ]);

      ffmpeg.on("close", (code: number) => {
        try {
          fs.unlinkSync(tmpVideoPath);

          if (code === 0) {
            const files = fs.readdirSync(framesDir)
              .filter(f => f.startsWith("frame_") && f.endsWith(".jpg"))
              .sort();

            const frames: string[] = [];
            for (const file of files) {
              const frameBuffer = fs.readFileSync(join(framesDir, file));
              frames.push(`data:image/jpeg;base64,${frameBuffer.toString("base64")}`);
            }

            fs.rmSync(framesDir, { recursive: true, force: true });
            resolve(frames);
          } else {
            fs.rmSync(framesDir, { recursive: true, force: true });
            resolve([]);
          }
        } catch (err: any) {
          console.error("Multi-frame extraction error:", err.message);
          resolve([]);
        }
      });

      ffmpeg.on("error", (err: any) => {
        console.error("FFmpeg error:", err.message);
        try { fs.unlinkSync(tmpVideoPath); } catch (e: any) { }
        try { fs.rmSync(framesDir, { recursive: true, force: true }); } catch (e: any) { }
        resolve([]);
      });
    });
  } catch (err: any) {
    console.error("Video multi-frame extraction error:", err.message);
    return [];
  }
}

/**
 * Transcribe audio using local faster-whisper when available, fallback to OpenAI Whisper
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  if (process.env.USE_LOCAL_WHISPER === "true") {
    return await transcribeAudioLocal(audioUrl);
  }

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
    const fileExtension = audioUrl.includes(".mp3") || audioUrl.includes(".mpeg") ? "mp3" : "wav";
    const tmpAudioPath = join(tmpdir(), `audio_${Date.now()}.${fileExtension}`);
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
}

export async function transcribeAudioLocal(audioUrl: string): Promise<string> {
  try {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      console.error("Failed to fetch audio:", response.status);
      return "";
    }

    const audioBuffer = await response.arrayBuffer();
    const tmpAudioPath = join(tmpdir(), `audio_${Date.now()}.wav`);
    fs.writeFileSync(tmpAudioPath, Buffer.from(audioBuffer));

    return new Promise((resolve) => {
      const whisperPath = process.env.FASTER_WHISPER_PATH || "faster-whisper";
      const whisper = spawn(whisperPath, [
        "--model", "base",
        "--language", "auto",
        tmpAudioPath
      ]);

      let output = "";
      let errorOutput = "";

      whisper.stdout.on("data", (data) => {
        output += data.toString();
      });

      whisper.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      whisper.on("close", (code: number) => {
        try {
          fs.unlinkSync(tmpAudioPath);
        } catch (e) { }

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

/**
 * Analyze video by extracting a frame and using vision model
 */
export async function analyzeVideoWithVision(videoUrl: string): Promise<{
  description: string;
  hazards: string[];
  severity_indicator: string;
  frameBase64?: string;
}> {
  const frameBase64 = await extractVideoFrame(videoUrl);
  if (!frameBase64) {
    return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
  }

  try {
    const client = getOpenAIClient();
    if (!client) {
      return { description: "", hazards: [], severity_indicator: "UNKNOWN", frameBase64 };
    }

    const response = await client.chat.completions.create({
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
            {
              type: "image_url",
              image_url: { url: frameBase64 },
            },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      description: "",
      hazards: [],
      severity_indicator: "LOW",
    };

    console.log("✅ Video frame analyzed, hazards found:", result.hazards);
    return { ...result, frameBase64 };
  } catch (err: any) {
    console.error("❌ Video vision analysis error:", err.message);
    return { description: "", hazards: [], severity_indicator: "UNKNOWN", frameBase64 };
  }
}

export async function analyzeVideoWithVisionMultiFrame(
  videoUrl: string,
  maxFrames: number = 5
): Promise<{
  description: string;
  hazards: string[];
  severity_indicator: string;
  frameBase64?: string;
  allHazards?: string[][];
}> {
  const frames = await extractVideoFramesEverySecond(videoUrl, 1);
  const framesToAnalyze = frames.slice(0, maxFrames);

  if (framesToAnalyze.length === 0) {
    return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
  }

  const allHazards: string[][] = [];
  let combinedDescription = "";

  for (const frame of framesToAnalyze) {
    try {
      const client = getOpenAIClient();
      if (!client) continue;

      const response = await client.chat.completions.create({
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
              {
                type: "image_url",
                image_url: { url: frame },
              },
            ],
          },
        ],
      });

      const content = response.choices[0].message.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        description: "",
        hazards: [],
        severity_indicator: "LOW",
      };

      allHazards.push(result.hazards);
      combinedDescription += `Frame: ${result.description}. Hazards: ${result.hazards.join(", ")}. `;

      if (result.severity_indicator === "HIGH") {
        return {
          description: combinedDescription,
          hazards: result.hazards,
          severity_indicator: "HIGH",
          allHazards,
        };
      }
    } catch (err: any) {
      console.error("❌ Frame analysis error:", err.message);
    }
  }

  const combinedHazards = allHazards.flat();
  const ruleBasedSeverity = getRuleBasedSeverity(combinedDescription, "", "");

  return {
    description: combinedDescription,
    hazards: combinedHazards,
    severity_indicator: ruleBasedSeverity,
    allHazards,
  };
}

/**
 * Analyze image using Vision model to detect hazards
 */
export async function analyzeImageWithVision(imageUrl: string): Promise<{
  description: string;
  hazards: string[];
  severity_indicator: string;
}> {
  try {
    const client = getOpenAIClient();
    if (!client) {
      return { description: "", hazards: [], severity_indicator: "UNKNOWN" };
    }

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
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      description: "",
      hazards: [],
      severity_indicator: "LOW",
    };

    console.log("✅ Image analyzed, hazards found:", result.hazards);
    return result;
  } catch (err: any) {
    console.error("❌ Vision analysis error:", err.message);
    return {
      description: "",
      hazards: [],
      severity_indicator: "UNKNOWN",
    };
  }
}

/**
 * Comprehensive severity analysis combining text, audio, and vision
 */
export async function analyzeSeverityMultimodal({
  title,
  description,
  mediaType,
  mediaUrl,
  transcribedAudio,
  imageAnalysis,
}: {
  title: string;
  description: string;
  mediaType?: string;
  mediaUrl?: string;
  transcribedAudio?: string;
  imageAnalysis?: any;
}): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in backend/.env to enable AI analysis.");
  }

  try {
    // Combine all text sources
    let fullDescription = `Title: ${title}\nDescription: ${description}`;

    if (transcribedAudio) {
      fullDescription += `\n\nTranscribed Audio Report: ${transcribedAudio}`;
    }

    if (imageAnalysis?.hazards?.length > 0) {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert AI classifier for public safety incident severity. Respond only with the severity level.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
    });

    const result = response.choices[0].message.content?.trim().toUpperCase() || "LOW";

    if (result.includes("HIGH")) return "HIGH";
    if (result.includes("MODERATE")) return "MODERATE";
    return "LOW";
  } catch (err: any) {
    console.error("❌ Multimodal severity analysis error:", err.message);

    if (err.code === "insufficient_quota" || err.status === 429) {
      console.log("OpenAI quota exceeded, falling back to rule-based analysis");
      return getRuleBasedSeverity(title, description, transcribedAudio);
    }

    return getRuleBasedSeverity(title, description, transcribedAudio);
  }
}

export function getRuleBasedSeverity(title: string, description: string, audioText?: string): string {
  const text = `${title} ${description} ${audioText || ""}`.toLowerCase();

  const highMatch = SEVERITY_KEYWORDS.HIGH.some(k =>
    text.includes(k.toLowerCase())
  );
  if (highMatch) return "HIGH";

  const moderateMatch = SEVERITY_KEYWORDS.MODERATE.some(k =>
    text.includes(k.toLowerCase())
  );
  if (moderateMatch) return "MODERATE";

  const lowMatch = SEVERITY_KEYWORDS.LOW.some(k =>
    text.includes(k.toLowerCase())
  );
  if (lowMatch) return "LOW";

  return "LOW";
}

/**
 * Generate detailed AI insights for a report
 */
export async function generateAIInsightsMultimodal({
  title,
  description,
  severity,
  hazardsDetected,
  audioTranscript,
}: {
  title: string;
  description: string;
  severity: string;
  hazardsDetected?: string[];
  audioTranscript?: string;
}): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in backend/.env to enable AI analysis.");
  }

  try {
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

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert public safety analyst. Provide concise, actionable insights.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
    });

    return response.choices[0].message.content || "Analysis unavailable.";
  } catch (err: any) {
    console.error("❌ AI insights error:", err.message);
    return "Analysis unavailable due to API error.";
  }
}

