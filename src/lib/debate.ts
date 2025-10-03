import { getOpenAI, getModelFor } from "./openai";
import { ROLES, MODERATOR, AgentSpec } from "./roles";

export interface DebateInput {
  idea: string;
  rounds?: number; // cantidad de rondas (cada ronda = todos los roles hablan 1 vez)
}

export type Utterance = { role: string; content: string };

function renderTranscript(transcript: Utterance[]) {
  return transcript.map((u) => `${u.role}: ${u.content}`).join("\n");
}

async function speak(spec: AgentSpec, idea: string, transcript: Utterance[]) {
  const openai = getOpenAI();
  const model = getModelFor("agent");

  const content = `Contexto del debate hasta ahora (puedes discrepar con respeto y aportar valor nuevo):\n\n${
    transcript.length ? renderTranscript(transcript) : "(aún no hay intervenciones)"
  }\n\nIdea base a considerar: \