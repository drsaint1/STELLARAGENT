import { GoogleGenAI } from "@google/genai";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function generateCode(language, description) {
  const ai = getAI();
  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Generate clean, well-commented ${language} code for the following task:\n\n${description}\n\nRespond with ONLY a JSON object in this exact format (no markdown, no code fences):\n{"language": "${language}", "code": "...the code...", "explanation": "...brief explanation..."}`,
          },
        ],
      },
    ],
    config: { temperature: 0.3 },
  });

  const text = resp.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { language, code: text, explanation: "Generated code (raw response)" };
  }
}

export async function explainCode(code, language) {
  const ai = getAI();
  const resp = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Explain the following ${language || ""} code in detail. Include what it does, how it works, and any suggestions for improvement.\n\nCode:\n${code}\n\nRespond with ONLY a JSON object in this exact format (no markdown, no code fences):\n{"explanation": "...detailed explanation...", "suggestions": ["suggestion 1", "suggestion 2"]}`,
          },
        ],
      },
    ],
    config: { temperature: 0.3 },
  });

  const text = resp.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { explanation: text, suggestions: [] };
  }
}
