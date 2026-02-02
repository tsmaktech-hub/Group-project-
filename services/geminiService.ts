
import { GoogleGenAI, Type } from "@google/genai";

export const analyzeAttendance = async (stats: any[]) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "AI Insights unavailable: Missing API Key.";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following student attendance data for this semester. 
      Identify which students are meeting the 75% requirement and provide a professional summary of attendance trends.
      
      Data: ${JSON.stringify(stats)}`,
      config: {
        systemInstruction: "You are an educational consultant. Provide a concise, professional summary and recommendations for students at risk of missing the 75% threshold.",
        temperature: 0.7,
      }
    });
    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI insights. Please check API configuration.";
  }
};
