
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeAttendance = async (stats: any[]) => {
  if (!process.env.API_KEY) return "AI Insights unavailable: Missing API Key.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following student attendance data and provide a brief summary of how many students are meeting the 75% requirement and any students at risk. 
      Data: ${JSON.stringify(stats)}`,
      config: {
        systemInstruction: "You are an educational consultant. Provide a concise, professional summary and recommendations.",
        temperature: 0.7,
      }
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI insights.";
  }
};
