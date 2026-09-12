import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/gamification")({
  beforeLoad: () => {
    throw redirect({ to: "/app/performance" });
  },
});