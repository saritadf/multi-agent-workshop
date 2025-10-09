import OpenAI from "openai";
import Groq from "groq-sdk";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface AIProvider {
  chat: {
    completions: {
      create: (params: ChatCompletionParams) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "openai";
  
  if (provider === "groq") {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is missing from environment variables.");
    }
    return new Groq({ apiKey }) as AIProvider;
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is missing from environment variables.");
    }
    return new OpenAI({ apiKey }) as AIProvider;
  }
}

// Backward compatibility
export function getOpenAI(): AIProvider {
  return getAIProvider();
}

export function getModelFor(kind: "agent" | "moderator") {
  const provider = process.env.AI_PROVIDER || "openai";
  
  if (provider === "groq") {
    const agentModel = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
    const moderatorModel = process.env.GROQ_MODEL_MODERATOR || process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
    return kind === "moderator" ? moderatorModel : agentModel;
  } else {
    const agentModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const moderatorModel = process.env.OPENAI_MODEL_MODERATOR || process.env.OPENAI_MODEL || "gpt-4o";
    return kind === "moderator" ? moderatorModel : agentModel;
  }
}