import OpenAI from "openai";

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing from environment variables.");
  }
  return new OpenAI({ apiKey });
}

export function getModelFor(kind: "agent" | "moderator") {
  const agentModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const moderatorModel = process.env.OPENAI_MODEL_MODERATOR || process.env.OPENAI_MODEL || "gpt-4o";
  return kind === "moderator" ? moderatorModel : agentModel;
}