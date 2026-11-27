import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/amr/Dashboard";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Вход и регистрация — АМР-Радар" },
    { name: "description", content: "Вход в аккаунт лаборатории для облачного сохранения замеров АМР-Радар." },
    { property: "og:title", content: "Вход и регистрация — АМР-Радар" },
    { property: "og:description", content: "Аккаунт лаборатории и сохранение замеров." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <Dashboard initialAuth />,
});