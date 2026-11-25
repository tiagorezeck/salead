import { createFileRoute } from "@tanstack/react-router";
import { PublicBookingView } from "@/components/agenda/PublicBookingView";

export const Route = createFileRoute("/agendar/$slug_/obrigado")({
  component: AgendarEventObrigadoPage,
});

function AgendarEventObrigadoPage() {
  const { slug } = Route.useParams();
  return <PublicBookingView slug={slug} initialThankYou />;
}
