import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runDebate } from "@/lib/debate";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  idea: z.string().min(10, "La idea debe tener al menos 10 caracteres."),
  rounds: z.number().int().min(1).max(5).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { idea, rounds } = BodySchema.parse(json);

    const { transcript, summary } = await runDebate({ idea, rounds });

    return NextResponse.json({ transcript, summary });
  } catch (err: any) {
    if (err?.issues) {
      return NextResponse.json({ error: err.issues?.[0]?.message || "Solicitud inválida" }, { status: 400 });
    }
    console.error("/api/discuss error", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}