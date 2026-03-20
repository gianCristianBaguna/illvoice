import OpenAI from "openai";

let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Transcribe audio to text using Whisper
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  const client = getOpenAIClient();
  if (!client) {
    console.log("OpenAI not configured, cannot transcribe audio");
    return "";
  }

  try {
    // Download audio file
    const audioBuffer = await fetch(audioUrl).then(res => res.arrayBuffer());
    const audioFile = new File([audioBuffer], "audio.wav", { type: "audio/wav" });

    const transcript = await client.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
    });

    console.log("✅ Audio transcribed:", transcript.text.substring(0, 100));
    return transcript.text;
  } catch (err: any) {
    console.error("❌ Whisper transcription error:", err.message);
    return "";
  }
}

/**
 * Analyze image using Vision model to detect hazards
 */
export async function analyzeImageWithVision(imageUrl: string): Promise<{
  description: string;
  hazards: string[];
  severity_indicator: string;
}> {
  const client = getOpenAIClient();
  if (!client) {
    console.log("OpenAI not configured, cannot analyze image");
    return {
      description: "",
      hazards: [],
      severity_indicator: "UNKNOWN",
    };
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
    console.log("OpenAI not configured, using rule-based analysis");
    return getRuleBasedSeverity(title, description, transcribedAudio);
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

function getRuleBasedSeverity(title: string, description: string, audioText?: string): string {
  const text = `${title} ${description} ${audioText || ""}`.toLowerCase();

  // HIGH severity keywords
  const highKeywords = [
    "fire", "flames", "burning", "smoke",
    "explosion", "explosion risk",
    "violence", "assault", "stab", "shoot",
    "trapped", "injured", "injury", "unconscious",
    "collapsed", "collapse", "structural damage",
    "emergency", "critical",
  ];

  if (highKeywords.some(k => text.includes(k))) {
    return "HIGH";
  }

  // MODERATE severity keywords
  const moderateKeywords = [
    "flood", "flooding", "water",
    "accident", "accident",
    "damage", "damaged", "broken",
    "leak", "leaking",
    "power outage", "blackout",
    "traffic", "blockage", "blocked",
    "hazmat", "chemical spill",
  ];

  if (moderateKeywords.some(k => text.includes(k))) {
    return "MODERATE";
  }

  // Default to LOW
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
    return "AI analysis not available.";
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
