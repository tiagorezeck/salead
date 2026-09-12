import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/sla")({
  beforeLoad: () => {
    throw redirect({ to: "/app/leads" });
  },
});