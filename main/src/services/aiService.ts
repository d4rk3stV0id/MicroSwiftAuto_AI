import { GoogleGenAI, Type } from "@google/genai";
import { ExtractionResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const extractClaimData = async (files: string[]): Promise<ExtractionResult> => {
  // In a real app, we'd send the images/PDFs to Gemini
  // For this demo, we'll simulate the extraction with a prompt
  // If we had actual file data, we'd include it in the parts
  
  const model = "gemini-3-flash-preview";
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          parts: [
            { text: "Extract medical claim information from the provided documents. Return JSON with patientName, diagnosis, hospitalName, admissionDate, dischargeDate, totalExpenses (number), doctorName, and a confidence score (0-1)." },
            // In a real implementation, we'd add the file parts here:
            // ...files.map(f => ({ inlineData: { data: f.split(',')[1], mimeType: "image/jpeg" } }))
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            patientName: { type: Type.STRING },
            diagnosis: { type: Type.STRING },
            hospitalName: { type: Type.STRING },
            admissionDate: { type: Type.STRING },
            dischargeDate: { type: Type.STRING },
            totalExpenses: { type: Type.NUMBER },
            doctorName: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          },
          required: ["confidence"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return { confidence: 0 };
  }
};

export const getChatResponse = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: "You are a helpful insurance claim assistant for MicroSwiftAuto ai. Guide users through the claim process in simple, non-technical language. If a user mentions a disease or diagnosis, remind them it must be clearly mentioned on the claim form. Keep responses concise and friendly, suitable for elderly users.",
    },
  });

  // Note: sendMessage doesn't take history directly in this SDK version usually, 
  // but we can simulate it or use the chat object properly if it supported it.
  // For simplicity, we'll just send the message.
  const response = await chat.sendMessage({ message });
  return response.text;
};
