"use client";

import StatusPage from "@/components/StatusPage";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return <StatusPage retry={retry} />;
}
