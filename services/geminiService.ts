
import { GoogleGenAI } from "@google/genai";

export const generateWhatsAppBudget = async (customerName: string, items: string[], total: number, date: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Gere uma mensagem amigável e profissional para WhatsApp para a empresa "SUSU Animações e Brinquedos".
  Destinatário: ${customerName}
  Data do Evento: ${date}
  Brinquedos: ${items.join(", ")}
  Valor Total: R$ ${total.toFixed(2)}
  
  A mensagem deve ser convidativa, clara e usar emojis discretos relacionados a festas.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return `Olá ${customerName}! Segue o orçamento para o evento do dia ${date}. Itens: ${items.join(", ")}. Total: R$ ${total.toFixed(2)}. Aguardamos sua confirmação!`;
  }
};
