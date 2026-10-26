import { createFileRoute } from "@tanstack/react-router";
import { InkboundGame } from "@/components/InkboundGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ANBY: Inkbound Showdown — Rubber-Hose Boss Fight" },
      { name: "description", content: "A hand-drawn 1930s cartoon-style run-and-gun boss fight. Play as Anby against the clockwork teapot Maestro Kettlewind." },
      { property: "og:title", content: "ANBY: Inkbound Showdown" },
      { property: "og:description", content: "Run, jump, dash and slash through a three-phase vintage cartoon boss fight in your browser." },
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
