import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Providers } from "@/app/providers";
import { router } from "@/app/router";
import { startMockServer } from "@/mocks/browser";
import "@/styles/globals.css";

async function bootstrap() {
  // Start the in-browser mock API before rendering.
  await startMockServer();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </React.StrictMode>
  );
}

bootstrap();
