import axios from "axios";
import { GoogleGenAI } from "@google/genai";

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function generateImage(prompt, style) {
  const fullPrompt = style ? `${prompt}, ${style} style` : prompt;

  // Try Replicate first
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const resp = await axios.post(
        "https://api.replicate.com/v1/predictions",
        {
          version: "black-forest-labs/flux-schnell",
          input: { prompt: fullPrompt, num_outputs: 1 },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          timeout: 120000,
        }
      );

      const output = resp.data.output;
      if (output && output.length > 0) {
        return { url: output[0], prompt: fullPrompt, provider: "replicate" };
      }
    } catch (err) {
      console.warn("Replicate failed, falling back to Gemini:", err.message);
    }
  }

  // Fallback: Gemini Imagen
  try {
    const resp = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an image description assistant. Since I cannot generate actual images, please provide a very detailed visual description of this image prompt that could be used as a placeholder:\n\n"${fullPrompt}"\n\nRespond with ONLY a JSON object: {"description": "...detailed visual description...", "prompt": "${fullPrompt}"}`,
            },
          ],
        },
      ],
      config: { temperature: 0.7 },
    });

    const text = resp.candidates?.[0]?.content?.parts?.[0]?.text || "";
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        url: null,
        description: parsed.description,
        prompt: fullPrompt,
        provider: "gemini-fallback",
      };
    } catch {
      return {
        url: null,
        description: text,
        prompt: fullPrompt,
        provider: "gemini-fallback",
      };
    }
  } catch (err) {
    throw new Error("Image generation failed: " + err.message);
  }
}

export async function editImage(imageUrl, instructions) {
  // Try Replicate first
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      const resp = await axios.post(
        "https://api.replicate.com/v1/predictions",
        {
          version: "timothybrooks/instruct-pix2pix",
          input: {
            image: imageUrl,
            prompt: instructions,
            num_outputs: 1,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            "Content-Type": "application/json",
            Prefer: "wait",
          },
          timeout: 120000,
        }
      );

      const output = resp.data.output;
      if (output && output.length > 0) {
        return { url: output[0], originalUrl: imageUrl, provider: "replicate" };
      }
    } catch (err) {
      console.warn("Replicate edit failed, falling back to Gemini:", err.message);
    }
  }

  // Fallback: Gemini description
  try {
    const resp = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Describe how you would edit an image with these instructions: "${instructions}". The original image is at: ${imageUrl}\n\nRespond with ONLY a JSON object: {"description": "...how the edited image would look...", "instructions": "${instructions}"}`,
            },
          ],
        },
      ],
      config: { temperature: 0.7 },
    });

    const text = resp.candidates?.[0]?.content?.parts?.[0]?.text || "";
    try {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        url: null,
        description: parsed.description,
        originalUrl: imageUrl,
        provider: "gemini-fallback",
      };
    } catch {
      return {
        url: null,
        description: text,
        originalUrl: imageUrl,
        provider: "gemini-fallback",
      };
    }
  } catch (err) {
    throw new Error("Image editing failed: " + err.message);
  }
}
