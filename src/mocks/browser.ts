import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

// Hot-swap edited handlers into the RUNNING worker. Without this, Vite HMR
// updates the handlers module but the worker keeps the set captured at
// startup — later requests to new/changed routes fall through to the
// Express proxy and 404 until a hard refresh.
if (import.meta.hot) {
  import.meta.hot.accept("./handlers", (mod) => {
    const next = (mod as typeof import("./handlers") | undefined)?.handlers;
    if (next) worker.resetHandlers(...next);
  });
}

export async function startMockServer() {
  await worker.start({
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
    onUnhandledRequest(request, print) {
      const { pathname } = new URL(request.url);
      // /api/ai/* is meant to reach the real Express proxy — stay silent.
      if (pathname.startsWith("/api/ai")) return;
      // Any other unmocked /api/* means the worker is stale/out of date.
      if (pathname.startsWith("/api")) {
        console.error(
          `[MSW] Unhandled API call ${request.method} ${pathname}. ` +
            `The mock worker is likely stale — hard-refresh (Ctrl+Shift+R) to re-register it.`
        );
        print.warning();
        return;
      }
      // Non-API assets: let them through silently.
    },
  });
}
