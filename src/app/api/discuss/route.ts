import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runDebate, runDebateStreaming } from "@/lib/debate";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  idea: z.string().min(10, "The idea must be at least 10 characters long."),
  rounds: z.number().int().min(1).max(5).optional(),
  streaming: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { idea, rounds, streaming } = BodySchema.parse(json);

    if (streaming) {
      // Streaming response
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await runDebateStreaming({ idea, rounds }, (event) => {
              const data = `data: ${JSON.stringify(event)}\n\n`;
              controller.enqueue(encoder.encode(data));
            });
            
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Regular response
      const { transcript, summary } = await runDebate({ idea, rounds });
      return NextResponse.json({ transcript, summary });
    }
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: err.issues?.[0]?.message || "Invalid request" }, { status: 400 });
    }
    console.error("/api/discuss error", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}