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
}) {
  const client = getOpenAIClient();
  if (!client) {
    console.log("OpenAI not configured, using rule-based severity analysis");
    return getRuleBasedSeverity(title, description);
  }

  try {
    const basePrompt = `You are a public safety AI used in a citizen reporting system.

Classify the severity of the incident.

Severity levels:

LOW
- litter
- small potholes
- noise complaints
- minor public nuisance

MODERATE
- broken streetlights
- flooding
- traffic accidents
- damaged roads

HIGH
- fire
- smoke from buildings
- explosions
- violence
- structural damage
- large accidents
- dangerous crimes

IMPORTANT RULE:
If the report mentions fire, flames, smoke, burning buildings, or uncontrolled fire,
the severity MUST be HIGH.

Return ONLY one word:
LOW
MODERATE
HIGH

Report Title: ${title}
Description: ${description}
`;

    const messages: any[] = [
      {
        role: "system",
        content: "You are an AI that classifies incident severity based on text and visual content.",
      },
    ];

    if (mediaType === "IMAGE" && mediaUrl) {
      // Use GPT-4 Vision for image analysis
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: basePrompt + "\nMedia Type: IMAGE\nPlease analyze the image for additional context about the incident severity.",
          },
          {
            type: "image_url",
            image_url: {
              url: mediaUrl,
            },
          },
        ],
      });
    } else {
      // Text-only analysis
      messages.push({
        role: "user",
        content: basePrompt + `\nMedia Type: ${mediaType || "none"}`,
      });
    }

    // Use GPT-4o for vision capabilities
    const model = mediaType === "IMAGE" && mediaUrl ? "gpt-4o" : "gpt-4o-mini";

    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0,
    });

    const result = response.choices[0].message.content?.trim().toUpperCase() || "";

    if (result.includes("HIGH") || result.includes("high")) return "HIGH";
    if (result.includes("MODERATE") || result.includes("moderate")) return "MODERATE";
    if (result.includes("LOW") || result.includes("low")) return "LOW";

    return "LOW";
  } catch (err: any) {
    console.log("AI severity error:", err.message);

    // Check if it's a quota/rate limit error
    if (err.code === 'insufficient_quota' || err.status === 429) {
      console.log("OpenAI quota exceeded, falling back to rule-based severity analysis");
      return getRuleBasedSeverity(title, description);
    }

    return "LOW";
  }
}

function getRuleBasedSeverity(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  // HIGH severity keywords
  if (text.includes('fire') || text.includes('flames') || text.includes('burning') ||
      text.includes('explosion') || text.includes('violence') || text.includes('emergency') ||
      text.includes('trapped') || text.includes('injured') || text.includes('collapsed') ||
      text.includes('structural damage') || text.includes('unconscious')) {
    return "HIGH";
  }

  // MODERATE severity keywords
  if (text.includes('flood') || text.includes('accident') || text.includes('damage') ||
      text.includes('broken') || text.includes('leak') || text.includes('power outage') ||
      text.includes('traffic') || text.includes('blockage')) {
    return "MODERATE";
  }

  // Default to LOW
  return "LOW";
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
}) {
  const client = getOpenAIClient();
  if (!client) {
    return "AI analysis not available - OpenAI API key not configured.";
  }

  try {
    const basePrompt = `
You are a public safety AI assistant analyzing a citizen report.

Provide a brief analysis (2-3 sentences) of this incident including:
1. Key observations from the description
2. Any recommendations for response
3. Risk assessment

Keep it concise and actionable.

Report Title: ${title}
Description: ${description}
Current Severity: ${currentSeverity}
`;

    const messages: any[] = [
      {
        role: "system",
        content: "You are an AI assistant providing insights for public safety reports. Be helpful, concise, and professional.",
      },
    ];

    if (mediaType === "IMAGE" && mediaUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: basePrompt + "\nPlease also analyze the attached image for additional context.",
          },
          {
            type: "image_url",
            image_url: {
              url: mediaUrl,
            },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: basePrompt,
      });
    }

    const model = mediaType === "IMAGE" && mediaUrl ? "gpt-4o" : "gpt-4o-mini";

    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.3,
      max_tokens: 200,
    });

    return response.choices[0].message.content?.trim() || "No insights available.";
  } catch (err) {
    console.log("AI insights error:", err);
    return "Unable to generate AI insights at this time.";
  }
}