import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const dynamic = "force-dynamic";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface MockupRequest {
  type: 'design' | 'pm' | 'dev' | 'business' | 'product';
  idea: string;
  context: string;
  details: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { type, idea, context, details }: MockupRequest = await req.json();

    // Try Replicate first, then fallback to Hugging Face
    let imageUrl = null;
    let provider = 'none';

    // Try Replicate first
    if (process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_API_TOKEN !== 'your_replicate_token_here') {
      try {
        console.log(`🎨 Generating ${type} mockup with Replicate...`);
        imageUrl = await generateWithReplicate(type, idea, context, details);
        provider = 'replicate';
        console.log(`✅ Replicate success for ${type}`);
      } catch (error) {
        console.log(`❌ Replicate failed for ${type}:`, error);
      }
    }

    // Fallback to Hugging Face if Replicate failed
    if (!imageUrl && process.env.HUGGINGFACE_API_TOKEN && process.env.HUGGINGFACE_API_TOKEN !== 'your_hf_token_here') {
      try {
        console.log(`🎨 Generating ${type} mockup with Hugging Face...`);
        imageUrl = await generateWithHuggingFace(type, idea, context, details);
        provider = 'huggingface';
        console.log(`✅ Hugging Face success for ${type}`);
      } catch (error) {
        console.log(`❌ Hugging Face failed for ${type}:`, error);
      }
    }

    // Final fallback to placeholder
    if (!imageUrl) {
      console.log(`📸 Using placeholder for ${type}`);
      imageUrl = `https://via.placeholder.com/400x300/f0f0f0/333333?text=${type.toUpperCase()}+Mockup`;
      provider = 'placeholder';
    }

    return NextResponse.json({ 
      imageUrl, 
      provider,
      placeholder: provider === 'placeholder'
    });

  } catch (error: any) {
    console.error("Mockup generation error:", error);
    
    const { type } = await req.json().catch(() => ({ type: 'design' }));
    return NextResponse.json({ 
      imageUrl: `https://via.placeholder.com/400x300/ffebee/c62828?text=Error+${type.toUpperCase()}`,
      provider: 'error',
      placeholder: true,
      error: error.message 
    });
  }
}

async function generateWithReplicate(type: string, idea: string, context: string, details: string[]): Promise<string> {
  const prompt = generatePrompt(type, idea, context, details);
  
  const output = await replicate.run(
    "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    {
      input: {
        prompt: prompt,
        negative_prompt: "blurry, low quality, text, words, letters, photography, realistic, human faces, people",
        width: type === 'design' ? 400 : 600,
        height: type === 'design' ? 600 : 400,
        num_inference_steps: 20,
        guidance_scale: 7.5,
      }
    }
  ) as any;

  return Array.isArray(output) ? output[0] : output;
}

async function generateWithHuggingFace(type: string, idea: string, context: string, details: string[]): Promise<string> {
  const prompt = generatePrompt(type, idea, context, details);
  
  const response = await fetch(
    "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          negative_prompt: "blurry, low quality, text, words, letters, photography, realistic, human faces, people",
          width: type === 'design' ? 400 : 600,
          height: type === 'design' ? 600 : 400,
        }
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`HuggingFace API failed: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  
  return `data:image/png;base64,${base64}`;
}

function generatePrompt(type: string, idea: string, context: string, details: string[]): string {
  const basePrompt = `Professional ${type} diagram for "${idea}". `;
  
  switch (type) {
    case 'design':
      return `${basePrompt}Clean mobile app wireframe, iOS style, minimal black and white sketch, figma style mockup, single screen showing: ${details.slice(0, 3).join(', ')}. Simple UI elements, no text, just wireframe boxes and icons.`;
      
    case 'pm':
      return `${basePrompt}Project management timeline diagram, clean gantt chart style, showing phases: ${details.slice(0, 3).join(', ')}. Business diagram, black and white, professional chart with boxes and arrows.`;
      
    case 'dev':
      return `${basePrompt}Technical architecture diagram showing: ${details.slice(0, 3).join(', ')}. System diagram with server boxes, database cylinders, API connections, mobile device. Clean technical illustration.`;
      
    case 'business':
      return `${basePrompt}Business model diagram showing: ${details.slice(0, 3).join(', ')}. Clean business chart with revenue streams, cost structure, graphs. Professional black and white illustration.`;
      
    case 'product':
      return `${basePrompt}User journey map showing: ${details.slice(0, 3).join(', ')}. Clean flowchart with user personas, stages, touchpoints. Minimal product diagram with arrows and boxes.`;
      
    default:
      return `${basePrompt}Professional diagram illustration. Clean, minimal, black and white technical drawing.`;
  }
}