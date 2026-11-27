import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/amr/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "АМР-Радар — мониторинг антибиотикорезистентности" },
      { name: "description", content: "Аналитика устойчивости бактерий к антибиотикам: замеры, мутации, тренды и рекомендации." },
    ],
  }),
  component: Dashboard,
});
