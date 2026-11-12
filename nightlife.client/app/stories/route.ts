import { statusResponse } from "@/lib/status-response";

export function GET() {
  return statusResponse(300);
}
