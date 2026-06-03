import { NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/projects";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const project = await getProject(params.id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const input = await request.json();
  return NextResponse.json(await updateProject(params.id, input));
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await deleteProject(params.id);
  return NextResponse.json({ ok: true });
}
