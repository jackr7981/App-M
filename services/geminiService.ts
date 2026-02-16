import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { JobPosting } from "../types";
import { supabase } from "./supabase";

// Lazy-initialize Gemini Client to prevent crash at module load when API key is missing.
// The API key is read from the Vite env variable VITE_GEMINI_API_KEY or process.env.API_KEY.
let _ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
  if (!_ai) {
    const apiKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY
      || (typeof process !== 'undefined' ? process.env?.API_KEY : undefined)
      || 'AIzaSyB9lUz-b1sDcJAwel6LT1wUZRS2l1OgsHw';



    // Check if key is missing OR is the placeholder

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey === 'PLACEHOLDER') {
      console.warn("Gemini API Key is not set. AI features will be unavailable.");
      throw new Error("Gemini API Key is missing or invalid (PLACEHOLDER). Please check .env.local");
    }
    _ai = new GoogleGenAI({ apiKey: apiKey });
  }
  return _ai;
};


export const getGeminiResponse = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[] = []
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash-lite';

    // Using chat to maintain simple context history
    const chat = getAI().chats.create({
      model: model,
      config: {
        systemInstruction: `You are "Sea Mate", an intelligent AI assistant specifically for Bangladeshi Mariners. 
        Your tone is professional, respectful, and helpful, often using nautical terms where appropriate.
        You have knowledge about maritime regulations (SOLAS, MARPOL, STCW), career progression in the merchant navy, and general shipboard life.
        You understand the specific context of Bangladeshi seafarers (Department of Shipping Bangladesh, CDC issuance, etc.).
        Keep answers concise and mobile-friendly.`,
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const result: GenerateContentResponse = await chat.sendMessage({
      message: message
    });

    return result.text || "I'm having trouble connecting to the shore server right now. Please try again later.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Communication link unstable. Please check your connection and try again.";
  }
};

export interface ScannedDocumentData {
  documentName: string;
  certificateType: 'COP' | 'COC' | 'Endorsement' | 'N/A';
  certificateSubject: string;
  expiryDate: string;
  documentNumber: string;
  category: string;
}

export const analyzeDocumentImage = async (base64Image: string): Promise<ScannedDocumentData> => {
  try {
    let mimeType = 'image/jpeg';
    let base64Data = base64Image;

    // Extract MIME type if present in data URL
    if (base64Image.includes(';base64,')) {
      const parts = base64Image.split(';base64,');
      mimeType = parts[0].replace('data:', '');
      base64Data = parts[1];
    }

    // Gemini Multimodal supports these types via inlineData
    const supportedMimeTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'application/pdf'
    ];

    if (!supportedMimeTypes.includes(mimeType)) {
      return {
        documentName: "",
        certificateType: "N/A",
        certificateSubject: "",
        expiryDate: "",
        documentNumber: "",
        category: "Other"
      };
    }

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          {
            text: `Analyze this maritime document and extract the following information:

1. Document Name/Title (full name as written)
2. Certificate Type: Identify if this is a:
   - "COP" (Certificate of Proficiency/Competency)
   - "COC" (Certificate of Competence)
   - "Endorsement" (STCW Endorsement)
   - "N/A" (not a certificate)
3. Certificate Subject: If this is a COP/COC, extract the specific subject/course name:
   - Examples: "Bridge Resource Management", "Advanced Fire Fighting", "Radar Navigation"
   - Return "N/A" if not applicable
4. Expiry Date (format: YYYY-MM-DD, or "N/A")
5. Document Number (any ID/serial number)
6. Category (Certificate, License, Personal ID, Medical, Visa, Other)

Return as JSON with these exact fields: documentName, certificateType, certificateSubject, expiryDate, documentNumber, category`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            documentName: { type: Type.STRING },
            certificateType: {
              type: Type.STRING,
              description: "One of: COP, COC, Endorsement, N/A"
            },
            certificateSubject: {
              type: Type.STRING,
              description: "Certificate subject (e.g., 'Bridge Resource Management', 'Radar Navigation', or 'N/A')"
            },
            expiryDate: { type: Type.STRING, description: "YYYY-MM-DD or N/A" },
            documentNumber: { type: Type.STRING },
            category: {
              type: Type.STRING,
              description: "One of: Certificate, License, Personal ID, Medical, Visa, Other"
            }
          },
          required: ["documentName", "certificateType", "certificateSubject", "expiryDate", "documentNumber", "category"]
        }
      }
    });

    if (response.text) {
      let cleanText = response.text.trim();
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '');
      }
      return JSON.parse(cleanText) as ScannedDocumentData;
    }
    throw new Error("No data returned from AI");
  } catch (error) {
    console.error("Document Analysis Error:", error);
    throw error; // Rethrow to allow UI to handle it
  }
};

export const parseJobPosting = async (text: string): Promise<Partial<JobPosting>> => {
  try {
    // Call the Edge Function 'job-parser'
    const { data, error } = await supabase.functions.invoke('job-parser', {
      body: { raw_content: text }
    });

    if (error) {
      console.error("Link to shore parsing service failed:", error);
      throw error;
    }

    if (data && data.success && data.data) {
      return data.data as Partial<JobPosting>;
    } else {
      throw new Error(data?.error || "Invalid response from AI service");
    }

  } catch (error) {
    console.error("Job Parsing Error:", error);
    // Fallback: Return raw text description
    return {
      description: text,
      rank: "Unknown",
      shipType: "Unknown",
      contactInfo: "See description"
    };
  }
};
