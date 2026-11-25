import { isStatusCode, statusResponse, type StatusCode } from "@/lib/status-response";

// Explicit routes let the team preview each response without causing a real failure.
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  return statusResponse(isStatusCode(code) ? Number(code) as StatusCode : 404);
}
