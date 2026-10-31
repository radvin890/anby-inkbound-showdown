import { createFileRoute } from "@tanstack/react-router";
import { InkboundGame } from "@/components/InkboundGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ANBY: Inkbound Showdown — Rubber-Hose Boss Fight" },
      { name: "description", content: "Play Anby and Nicole in a hand-drawn cartoon boss fight or an Endless platform run with streamed paths and wind-up enemies." },
      { property: "og:title", content: "ANBY: Inkbound Showdown" },
      { property: "og:description", content: "Team up as Anby and Nicole in a vintage cartoon boss fight or a never-ending side-scrolling platform run." },
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
