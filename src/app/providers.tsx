import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/query";
import { AppStoreProvider } from "./store";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppStoreProvider>
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster
            position="bottom-right"
            richColors
            closeButton
            toastOptions={{ className: "rounded-lg" }}
          />
        </TooltipProvider>
      </AppStoreProvider>
    </QueryClientProvider>
  );
}
