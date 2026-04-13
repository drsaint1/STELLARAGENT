import { GoogleGenAI } from "@google/genai";

export async function braveSearch(query) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const ai = new GoogleGenAI({ apiKey });

  // Use Gemini with Google Search grounding — free, no extra API key needed
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: `Search the web for: ${query}\n\nReturn 5 relevant results with title, url, and a short snippet for each. Format as JSON array.` }] }],
    config: {
      tools: [{ googleSearch: {} }],
      temperature: 0.2,
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";

  // Extract grounding metadata for real URLs
  const groundingMeta = response.candidates?.[0]?.groundingMetadata;
  const chunks = groundingMeta?.groundingChunks || [];
  const supportChunks = groundingMeta?.groundingSupport || [];

  const results = [];

  if (chunks.length > 0) {
    // Use grounding chunks for real sourced results
    for (const chunk of chunks.slice(0, 5)) {
      const web = chunk.web;
      if (web) {
        results.push({
          title: web.title || "Search Result",
          url: web.uri || "",
          snippet: web.title || "",
        });
      }
    }
  }

  // If we got grounding results, add the AI summary as context
  if (results.length > 0) {
    return { query, results, summary: text.substring(0, 500) };
  }

  // Fallback: parse the AI's text response
  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        query,
        results: parsed.slice(0, 5).map(r => ({
          title: r.title || "Result",
          url: r.url || "",
          snippet: r.snippet || r.description || "",
        })),
      };
    }
  } catch {
    // If JSON parsing fails, return the raw text as a single result
  }

  return {
    query,
    results: [{ title: "AI Search Summary", url: "", snippet: text.substring(0, 300) }],
  };
}
