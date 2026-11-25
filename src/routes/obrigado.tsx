import { createFileRoute } from "@tanstack/react-router";
import { PublicBookingView } from "@/components/agenda/PublicBookingView";

export const Route = createFileRoute("/obrigado")({
  component: ObrigadoPage,
});

function ObrigadoPage() {
  return <PublicBookingView initialThankYou />;
}
