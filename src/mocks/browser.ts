import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

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
