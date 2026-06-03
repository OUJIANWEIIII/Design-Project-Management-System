import { NextResponse } from "next/server";
import { deleteProjectRound, updateProjectRound } from "@/lib/projects";

export async function PUT(request: Request, { params }: { params: { id: string; roundIndex: string } }) {
  const roundIndex = Number(params.roundIndex);
  if (!Number.isInteger(roundIndex) || roundIndex < 1) {
    return NextResponse.json({ error: "Invalid round index" }, { status: 400 });
  }
  const input = await request.json();
  const project = await updateProjectRound(params.id, roundIndex, input);
  if (!project) return NextResponse.json({ error: "Project round not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function DELETE(_: Request, { params }: { params: { id: string; roundIndex: string } }) {
  const roundIndex = Number(params.roundIndex);
  if (!Number.isInteger(roundIndex) || roundIndex < 1) {
    return NextResponse.json({ error: "Invalid round index" }, { status: 400 });
  }
  const result = await deleteProjectRound(params.id, roundIndex);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.project);
}
