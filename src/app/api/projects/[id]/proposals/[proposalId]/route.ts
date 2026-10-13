import { NextResponse } from "next/server";
import { deleteProjectProposal, updateProjectProposal } from "@/lib/projects";

export async function PATCH(request: Request, { params }: { params: { id: string; proposalId: string } }) {
  const input = await request.json();
  return NextResponse.json(await updateProjectProposal(params.id, params.proposalId, input));
}

export async function DELETE(_request: Request, { params }: { params: { id: string; proposalId: string } }) {
  return NextResponse.json(await deleteProjectProposal(params.id, params.proposalId));
}
