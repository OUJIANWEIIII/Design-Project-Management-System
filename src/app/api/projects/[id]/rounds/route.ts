import { NextResponse } from "next/server";
import { createNextRound } from "@/lib/projects";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const input = await request.json();
  const project = await createNextRound(params.id, input);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project, { status: 201 });
}
