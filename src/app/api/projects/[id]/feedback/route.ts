import { NextResponse } from "next/server";
import { submitProjectForFeedback } from "@/lib/projects";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const input = await request.json().catch(() => ({}));
  const project = await submitProjectForFeedback(params.id, input.notes || "");
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}
