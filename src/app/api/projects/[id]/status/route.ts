import { NextResponse } from "next/server";
import { ProjectStatus } from "@/lib/enums";
import { updateProjectStatus } from "@/lib/projects";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { status } = await request.json();
  return NextResponse.json(await updateProjectStatus(params.id, status as ProjectStatus));
}
