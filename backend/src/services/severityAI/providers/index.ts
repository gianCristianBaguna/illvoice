import { geminiVisionProvider, geminiTextProvider, geminiAudioProvider } from "./gemini";
import { ollamaVisionProvider } from "./ollama";
import { openaiVisionProvider, openaiTextProvider, openaiAudioProvider } from "./openai";
import { VisionProvider, TextProvider, AudioProvider, AIProviderType } from "./interface";

function getProvider(): AIProviderType {
  return (process.env.AI_PROVIDER as AIProviderType) || "gemini";
}

export function getVisionProvider(): VisionProvider {
  const provider = getProvider();

  switch (provider) {
    case "gemini":
      return geminiVisionProvider;
    case "openai":
      return openaiVisionProvider;
    case "ollama":
      return ollamaVisionProvider;
    case "hybrid":
    default:
      if (process.env.GEMINI_API_KEY) return geminiVisionProvider;
      if (process.env.OPENAI_API_KEY) return openaiVisionProvider;
      if (process.env.OLLAMA_ENDPOINT) return ollamaVisionProvider;
      return geminiVisionProvider;
  }
}

export function getTextProvider(): TextProvider {
  const provider = getProvider();

  switch (provider) {
    case "gemini":
      return geminiTextProvider;
    case "openai":
      return openaiTextProvider;
    case "ollama":
    case "hybrid":
    default:
      if (process.env.GEMINI_API_KEY) return geminiTextProvider;
      if (process.env.OPENAI_API_KEY) return openaiTextProvider;
      return geminiTextProvider;
  }
}

export function getAudioProvider(): AudioProvider {
  const provider = getProvider();

  switch (provider) {
    case "gemini":
    case "openai":
      return openaiAudioProvider;
    case "ollama":
      return { transcribe: async () => "" };
    case "hybrid":
    default:
      if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
        return openaiAudioProvider;
      }
      if (process.env.USE_LOCAL_WHISPER === "true") {
        return {
          transcribe: async (audioUrl: string): Promise<string> => {
            const fetch = require("node-fetch");
            const fs = require("fs");
            const { spawn } = require("child_process");
            const { join, tmpdir } = require("path");
            const path = require("path");

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
                whisper.stdout.on("data", (data: Buffer) => { output += data.toString(); });
                whisper.on("close", (code: number) => {
                  try { fs.unlinkSync(tmpAudioPath); } catch { }
                  resolve(code === 0 ? output.trim() : "");
                });
                whisper.on("error", () => { resolve(""); });
              });
            } catch {
              return "";
            }
          },
        };
      }
      return openaiAudioProvider;
  }
}