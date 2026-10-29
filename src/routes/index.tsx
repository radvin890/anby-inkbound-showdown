import { createFileRoute } from "@tanstack/react-router";
import { InkboundGame } from "@/components/InkboundGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ANBY: Inkbound Showdown — Rubber-Hose Boss Fight" },
      { name: "description", content: "Switch between Anby's sword and Nicole's ether briefcase in a hand-drawn cartoon boss fight against Maestro Kettlewind." },
      { property: "og:title", content: "ANBY: Inkbound Showdown" },
      { property: "og:description", content: "Team up as Anby and Nicole: switch instantly between sword melee and ranged ether attacks in a vintage cartoon boss fight." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="stage-page">
      <InkboundGame />
    </main>
  );
}
