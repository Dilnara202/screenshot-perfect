import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/amr/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "АМР-Радар — мониторинг антибиотикорезистентности" },
      { name: "description", content: "Аналитика устойчивости бактерий к антибиотикам: замеры, мутации, тренды и рекомендации." },
      { property: "og:title", content: "АМР-Радар — мониторинг антибиотикорезистентности" },
      { property: "og:description", content: "Замеры, мутации, тренды и облачный журнал лаборатории." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});
