import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { fetchLeetCodeProblemByNumber } from "@/lib/leetcode";

export async function GET(request: NextRequest) {
  await requireUser();
  const number = Number.parseInt(request.nextUrl.searchParams.get("number") || "", 10);
  if (!Number.isInteger(number) || number <= 0) {
    return Response.json({ error: "Enter a valid LeetCode problem number." }, { status: 400 });
  }
  try {
    const problem = await fetchLeetCodeProblemByNumber(number);
    return Response.json(problem, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not fetch that LeetCode problem.";
    return Response.json({ error: message }, { status: 502 });
  }
}
