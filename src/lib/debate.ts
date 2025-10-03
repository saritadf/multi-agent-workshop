import { getOpenAI, getModelFor } from "./openai";
import { ROLES, MODERATOR, AgentSpec } from "./roles";

export interface DebateInput {
  idea: string;
  rounds?: number;
}

export type Utterance = { role: string; content: string };

function renderTranscript(transcript: Utterance[]) {
  return transcript.map((u) => `${u.role}: ${u.content}`).join("\n");
}

async function speak(spec: AgentSpec, idea: string, transcript: Utterance[]) {
  const openai = getOpenAI();
  const model = getModelFor("agent");

  const content = `Contexto del debate hasta ahora (puedes discrepar con respeto y aportar valor nuevo):

${transcript.length ? renderTranscript(transcript) : "(aún no hay intervenciones)"}

Idea base a considerar: "${idea}"

Da tu perspectiva desde tu rol (${spec.role}). Sé breve, concreto y aporta valor diferencial.`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: spec.systemPrompt },
      { role: "user", content },
    ],
    temperature: 0.7,
    max_tokens: 300,
  });

  return completion.choices[0]?.message?.content || "";
}

async function summarize(idea: string, transcript: Utterance[]) {
  const openai = getOpenAI();
  const model = getModelFor("moderator");

  const content = `Debate completo sobre la idea: "${idea}"

${renderTranscript(transcript)}

Sintetiza el debate completo en un plan accionable y claro siguiendo tu rol de Moderador.`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MODERATOR.systemPrompt },
      { role: "user", content },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || "";
}

export async function runDebate(input: DebateInput) {
  const { idea, rounds = 2 } = input;
  const transcript: Utterance[] = [];

  for (let r = 0; r < rounds; r++) {
    for (const roleSpec of ROLES) {
      const content = await speak(roleSpec, idea, transcript);
      transcript.push({ role: roleSpec.name, content });
    }
  }

  const summary = await summarize(idea, transcript);

  return { transcript, summary };
}
