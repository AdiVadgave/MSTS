import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function startMockServer() {
  await worker.start({
    onUnhandledRequest: "bypass", // let /api/ai/* reach the real Express proxy
    quiet: true,
    serviceWorker: { url: "/mockServiceWorker.js" },
  });
}
