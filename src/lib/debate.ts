import { getOpenAI, getModelFor, AIProvider } from "./openai";
import { ROLES, MODERATOR, AgentSpec } from "./roles";

export interface DebateInput {
  idea: string;
  rounds?: number;
}

export type Utterance = { 
  role: string; 
  content: string; 
  mockupData?: any;
  mockupUrl?: string;
};

export interface StreamEvent {
  type: 'agent_start' | 'agent_response' | 'round_start' | 'moderator_start' | 'moderator_response' | 'complete' | 'question' | 'mockup_generated';
  agent?: string;
  content?: string;
  round?: number;
  question?: string;
  mockupUrl?: string;
  mockupData?: any;
}

function renderTranscript(transcript: Utterance[]) {
  return transcript.map((u) => `${u.role}: ${u.content}`).join("\n");
}

async function speak(spec: AgentSpec, idea: string, transcript: Utterance[]) {
  const client: AIProvider = getOpenAI();
  const model = getModelFor("agent");

  // Get the last few messages for context
  const recentContext = transcript.slice(-3).map(u => `${u.role}: ${u.content}`).join('\n');
  
  const content = `Idea: "${idea}"

Recent discussion:
${recentContext || "(starting discussion)"}

React to the recent comments above. Be direct, challenge assumptions. Don't ask questions to the user.

Your role: ${spec.role}`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: spec.systemPrompt },
      { role: "user", content },
    ],
    temperature: 0.8,
    max_tokens: 400, // Increased to avoid truncated JSON
  });

  const response = completion.choices[0]?.message?.content || "";
  
  // Extract mockup data if present
  let mockupData = null;
  let cleanResponse = response;
  
  if (response.includes('MOCKUP_DATA:')) {
    const parts = response.split('MOCKUP_DATA:');
    cleanResponse = parts[0].trim();
    try {
      let jsonStr = parts[1].trim();
      console.log('Raw mockup data:', jsonStr); // Debug log
      
      // Try to fix common JSON issues
      // Remove any trailing incomplete text after the last }
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1 && lastBrace < jsonStr.length - 1) {
        jsonStr = jsonStr.substring(0, lastBrace + 1);
        console.log('Fixed JSON:', jsonStr);
      }
      
      mockupData = JSON.parse(jsonStr);
      console.log('Parsed mockup data:', mockupData); // Debug log
    } catch (e) {
      console.error('Failed to parse mockup data:', e, 'Raw:', parts[1].trim());
    }
  } else {
    console.log('No MOCKUP_DATA found in response:', response); // Debug log
  }
  
  return { content: cleanResponse, mockupData };
}

async function summarize(idea: string, transcript: Utterance[]) {
  const client: AIProvider = getOpenAI();
  const model = getModelFor("moderator");

  console.log("📝 Moderator creating final summary...");

  const content = `Complete debate on the idea: "${idea}"

${renderTranscript(transcript)}

Synthesize the entire debate into a clear, actionable plan following your Moderator role.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: MODERATOR.systemPrompt },
      { role: "user", content },
    ],
    temperature: 0.2,
    max_tokens: 1000,
  });

  const summary = completion.choices[0]?.message?.content || "";
  
  // Extract mockup data from moderator summary
  let mockupData = null;
  let cleanSummary = summary;
  
  if (summary.includes('MOCKUP_DATA:')) {
    const parts = summary.split('MOCKUP_DATA:');
    cleanSummary = parts[0].trim();
    try {
      let jsonStr = parts[1].trim();
      const lastBrace = jsonStr.lastIndexOf('}');
      if (lastBrace !== -1 && lastBrace < jsonStr.length - 1) {
        jsonStr = jsonStr.substring(0, lastBrace + 1);
      }
      mockupData = JSON.parse(jsonStr);
      console.log('Moderator mockup data:', mockupData);
    } catch (e) {
      console.error('Failed to parse moderator mockup data:', e);
    }
  }
  
  return { content: cleanSummary, mockupData };
}

export async function runDebate(input: DebateInput) {
  const { idea, rounds = 2 } = input;
  const transcript: Utterance[] = [];

  console.log(`🚀 Starting debate with ${rounds} rounds about: "${idea}"`);
  console.log(`👥 Participants: ${ROLES.map(r => r.name).join(", ")}`);

  for (let r = 0; r < rounds; r++) {
    console.log(`\n🔄 === ROUND ${r + 1} ===`);
    
    for (const roleSpec of ROLES) {
      const result = await speak(roleSpec, idea, transcript);
      transcript.push({ 
        role: roleSpec.name, 
        content: result.content,
        mockupData: result.mockupData 
      });
    }
  }

  console.log("\n🏁 Debate finished, generating summary...");
  const summary = await summarize(idea, transcript);

  return { transcript, summary };
}

export async function runDebateStreaming(
  input: DebateInput, 
  onEvent: (event: StreamEvent) => void
) {
  const { idea, rounds = 2 } = input;
  const transcript: Utterance[] = [];

  for (let r = 0; r < rounds; r++) {
    onEvent({ type: 'round_start', round: r + 1 });
    
    for (const roleSpec of ROLES) {
      onEvent({ type: 'agent_start', agent: roleSpec.name });
      
      const result = await speak(roleSpec, idea, transcript);
      const utterance: Utterance = { 
        role: roleSpec.name, 
        content: result.content,
        mockupData: result.mockupData 
      };
      
      transcript.push(utterance);
      
      // Generate mockup if we have mockup data
      if (result.mockupData) {
        try {
          // Use absolute URL for server-side fetch
          const baseUrl = process.env.VERCEL_URL 
            ? `https://${process.env.VERCEL_URL}` 
            : 'http://localhost:3000';
          
          const mockupResponse = await fetch(`${baseUrl}/api/generate-mockup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: roleSpec.name.toLowerCase(),
              idea,
              context: result.content,
              details: Object.values(result.mockupData).flat()
            })
          });
          
          const mockupResult = await mockupResponse.json();
          utterance.mockupUrl = mockupResult.imageUrl;
          
          onEvent({ 
            type: 'mockup_generated', 
            agent: roleSpec.name, 
            mockupUrl: mockupResult.imageUrl 
          });
        } catch (e) {
          console.error('Mockup generation failed:', e);
        }
      }
      
      onEvent({ 
        type: 'agent_response', 
        agent: roleSpec.name, 
        content: result.content,
        mockupData: result.mockupData 
      });
    }
  }

  onEvent({ type: 'moderator_start' });
  const summaryResult = await summarize(idea, transcript);
  onEvent({ 
    type: 'moderator_response', 
    content: summaryResult.content,
    mockupData: summaryResult.mockupData 
  });
  onEvent({ type: 'complete' });

  return { transcript, summary: summaryResult.content };
}
