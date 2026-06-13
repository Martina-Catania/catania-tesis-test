import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Sends a base64-encoded image to Gemini Vision and returns extracted text/data.
 */
export async function extractDataFromImage(
  imageBuffer: Buffer,
  mimeType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
  prompt = "Extract all relevant information from this image. Be concise and structured.",
): Promise<string> {
  const base64Image = imageBuffer.toString("base64");

  const response = await genai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
  });

  return response.text ?? "No data extracted.";
}