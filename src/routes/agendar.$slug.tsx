import { createFileRoute } from "@tanstack/react-router";
import { PublicBookingView } from "@/components/agenda/PublicBookingView";

export const Route = createFileRoute("/agendar/$slug")({
  component: AgendarEventSlugPage,
});

function AgendarEventSlugPage() {
  const { slug } = Route.useParams();
  return <PublicBookingView slug={slug} />;
}
