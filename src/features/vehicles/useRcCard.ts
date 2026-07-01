import { useMutation } from "@tanstack/react-query";
import type { RCCardExtraction } from "@/lib/types";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Sends the RC-card image to the server-side Azure OpenAI proxy
 * (/api/ai/rc-card). MSW bypasses this path so it reaches the real
 * Express server, which calls GPT-4o vision (or a realistic mock if
 * Azure credentials are not configured).
 */
export function useExtractRcCard() {
  return useMutation({
    mutationFn: async (file: File): Promise<RCCardExtraction> => {
      const imageBase64 = await fileToBase64(file);
      const res = await fetch("/api/ai/rc-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, fileName: file.name }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "Extraction failed");
        throw new Error(msg || `Extraction failed (${res.status})`);
      }
      return (await res.json()) as RCCardExtraction;
    },
  });
}
