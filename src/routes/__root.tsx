import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { cloudStore, purgeLegacyBusinessLocalStorage } from "@/services/cloudStorageService";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-6xl font-black text-purple-400 font-display">404</h1>
        <h2 className="text-xl font-bold text-zinc-100">Página não encontrada</h2>
        <p className="text-xs text-zinc-400">O link acessado não está disponível ou foi alterado.</p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white shadow-lg cursor-pointer transition-all"
          >
            Recarregar Página
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 border border-zinc-700 cursor-pointer transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const theme = localStorage.getItem("comet_theme");
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }

    purgeLegacyBusinessLocalStorage();
    cloudStore.startRealtimeEngine();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}