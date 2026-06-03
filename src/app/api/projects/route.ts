import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/projects";

export async function GET() {
  return NextResponse.json(await listProjects());
}

export async function POST(request: Request) {
  const input = await request.json();
  const project = await createProject(input);
  return NextResponse.json(project, { status: 201 });
}
