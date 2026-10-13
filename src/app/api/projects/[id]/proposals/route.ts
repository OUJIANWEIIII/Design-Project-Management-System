import { NextResponse } from "next/server";
import { createProjectProposal } from "@/lib/projects";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const input = await request.json();
  return NextResponse.json(await createProjectProposal(params.id, {
    roundIndex: Number(input.roundIndex || 1),
    designerId: String(input.designerId || ""),
    proposalName: String(input.proposalName || ""),
    isSelected: Boolean(input.isSelected),
    notes: String(input.notes || "")
  }));
}
