import { GoogleGenAI, Type } from "@google/genai";
import { NormalizedUpdate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function summarizeUpdates(updates: NormalizedUpdate[]): Promise<NormalizedUpdate[]> {
  if (updates.length === 0) return [];

  const prompt = `
    You are an IRCC data analyst. For each of the following immigration updates, generate:
    1. A short_summary (max 2 lines)
    2. A detailed_summary (max 5 lines)
    3. An insight (impact for prospective immigrants)

    Updates:
    ${JSON.stringify(updates.map(u => ({ id: u.id, title: u.title, summary: u.summary, type: u.type, key_data: u.key_data })))}

    Return the results as a JSON array of objects with "id", "short_summary", "detailed_summary", and "insight".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              short_summary: { type: Type.STRING },
              detailed_summary: { type: Type.STRING },
              insight: { type: Type.STRING }
            },
            required: ["id", "short_summary", "detailed_summary", "insight"]
          }
        }
      }
    });

    const aiResults = JSON.parse(response.text || "[]");
    
    return updates.map(update => {
      const aiResult = aiResults.find((r: any) => r.id === update.id);
      return {
        ...update,
        short_summary: aiResult?.short_summary || update.summary.slice(0, 100),
        detailed_summary: aiResult?.detailed_summary || update.summary,
        insight: aiResult?.insight || "Monitor official IRCC channels for further details."
      };
    });
  } catch (error) {
    console.error("Gemini summarization failed:", error);
    return updates.map(u => ({
      ...u,
      short_summary: u.summary.slice(0, 100),
      detailed_summary: u.summary,
      insight: "Error generating AI insight."
    }));
  }
}

export async function generateGlobalInsights(updates: NormalizedUpdate[]): Promise<string[]> {
  if (updates.length === 0) return ["No recent updates to analyze."];

  const prompt = `
    Based on these recent IRCC updates, identify 3 key trends or strategic insights for immigrants.
    Updates: ${JSON.stringify(updates.map(u => ({ title: u.title, type: u.type, key_data: u.key_data })))}
    
    Return as a JSON array of 3 strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return JSON.parse(response.text || '["Trend analysis unavailable."]');
  } catch (error) {
    console.error("Gemini global insights failed:", error);
    return ["Unable to generate strategic insights at this time."];
  }
}
