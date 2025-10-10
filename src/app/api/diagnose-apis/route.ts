import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      replicate_token_configured: !!process.env.REPLICATE_API_TOKEN,
      huggingface_token_configured: !!process.env.HUGGINGFACE_API_TOKEN,
      replicate_token_preview: process.env.REPLICATE_API_TOKEN?.substring(0, 10) + "...",
      huggingface_token_preview: process.env.HUGGINGFACE_API_TOKEN?.substring(0, 10) + "..."
    },
    tests: {}
  };

  // Test Replicate API
  if (process.env.REPLICATE_API_TOKEN) {
    try {
      console.log("🧪 Testing Replicate API...");
      const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });

      // Try a simple model list first (less likely to hit rate limits)
      const testResult = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: "simple test wireframe, minimal black and white sketch",
            negative_prompt: "blurry, low quality",
            width: 400,
            height: 300,
            num_inference_steps: 10,
            guidance_scale: 7.5,
          }
        }
      );

      results.tests.replicate = {
        status: "success",
        message: "API connection successful",
        result_type: Array.isArray(testResult) ? "array" : typeof testResult,
        has_output: !!testResult
      };
    } catch (error: any) {
      console.log("❌ Replicate test failed:", error);
      results.tests.replicate = {
        status: "error",
        message: error.message,
        error_type: error.constructor.name,
        status_code: error.response?.status || "unknown"
      };
    }
  } else {
    results.tests.replicate = {
      status: "not_configured",
      message: "REPLICATE_API_TOKEN not set"
    };
  }

  // Test Hugging Face API
  if (process.env.HUGGINGFACE_API_TOKEN) {
    try {
      console.log("🧪 Testing Hugging Face API...");
      const response = await fetch(
        "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: "simple test wireframe, minimal black and white sketch",
            parameters: {
              negative_prompt: "blurry, low quality",
              width: 400,
              height: 300,
            }
          }),
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        results.tests.huggingface = {
          status: "success",
          message: "API connection successful",
          response_size: blob.size,
          content_type: blob.type
        };
      } else {
        const errorText = await response.text();
        results.tests.huggingface = {
          status: "error",
          message: `HTTP ${response.status}: ${response.statusText}`,
          details: errorText,
          status_code: response.status
        };
      }
    } catch (error: any) {
      console.log("❌ Hugging Face test failed:", error);
      results.tests.huggingface = {
        status: "error",
        message: error.message,
        error_type: error.constructor.name
      };
    }
  } else {
    results.tests.huggingface = {
      status: "not_configured",
      message: "HUGGINGFACE_API_TOKEN not set"
    };
  }

  return NextResponse.json(results, { status: 200 });
}