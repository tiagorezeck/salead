import { createFileRoute } from "@tanstack/react-router";
import { PublicBookingView } from "@/components/agenda/PublicBookingView";

export const Route = createFileRoute("/agendar/")({
  component: AgendarPortalPage,
});

function AgendarPortalPage() {
  return <PublicBookingView />;
}
