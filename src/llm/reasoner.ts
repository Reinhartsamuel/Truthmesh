// src/llm/reasoner.ts
import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function refineSignal(text: string, category: string) {
  const prompt = `
You are an AI signal extraction model for a prediction market agent.
Input text:
"${text}"

Detected category: ${category}

Your job:
1. Provide a one-sentence summary.
2. Rate how confidently this text impacts the category (0 to 1).
3. Explain your reasoning step-by-step for how this text relates to the category.
4. Output JSON only.

JSON format:
{
  "summary": "...",
  "confidence": 0.0,
  "reasoning": "Step-by-step explanation of how this text relates to the category..."
}
`;

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  // const parsed = JSON.parse();
  const parsed = res.choices[0].message.content ? JSON.parse(res.choices[0].message.content) : {};

  // Ensure reasoning field exists
  if (!parsed.reasoning) {
    parsed.reasoning = "No reasoning provided by AI model.";
  }
  
  return parsed;
}
