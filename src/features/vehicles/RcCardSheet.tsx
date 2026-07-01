import * as React from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import {
  Sparkles,
  UploadCloud,
  FileImage,
  Loader2,
  CheckCircle2,
  X,
  ArrowRight,
  ScanLine,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useExtractRcCard } from "./useRcCard";
import type { RCCardExtraction } from "@/lib/types";
import type { VehicleFormValues } from "./vehicleSchema";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RcCardSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUseData: (values: Partial<VehicleFormValues>) => void;
}

const STEPS = ["Validate image size", "GPT-4o vision extraction", "Normalise structured JSON"];

export function RcCardSheet({ open, onOpenChange, onUseData }: RcCardSheetProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<RCCardExtraction | null>(null);
  const [activeStep, setActiveStep] = React.useState(0);
  const extract = useExtractRcCard();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setActiveStep(0);
  };

  const onDrop = React.useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"], "application/pdf": [".pdf"] },
    maxFiles: 1,
  });

  const runExtraction = async () => {
    if (!file) return;
    setActiveStep(0);
    const timer = setInterval(
      () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1)),
      650
    );
    try {
      const data = await extract.mutateAsync(file);
      clearInterval(timer);
      setActiveStep(STEPS.length - 1);
      setResult(data);
      toast.success(
        data.source === "azure-openai"
          ? "Extracted with Azure OpenAI GPT-4o"
          : "Extracted (mock) — add Azure keys in .env for live AI"
      );
    } catch (e) {
      clearInterval(timer);
      toast.error(e instanceof Error ? e.message : "Extraction failed");
    }
  };

  const useData = () => {
    if (!result) return;
    onUseData({
      plate: result.plate,
      vin: result.vin,
      country: result.countryCode || "NL",
      euronorm: (result.euronorm as VehicleFormValues["euronorm"]) || "",
      totalAxles: result.axles || 2,
      totalWeightKg: result.totalWeightKg || 18000,
    });
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTimeout(reset, 300);
      }}
    >
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            RC Card AI Extraction
          </SheetTitle>
          <SheetDescription>
            Upload a vehicle registration certificate. GPT-4o vision reads it and
            returns structured fields to pre-fill the vehicle form.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          {/* Dropzone */}
          {!preview ? (
            <div
              {...getRootProps()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
                isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50 hover:bg-secondary/40"
              )}
            >
              <input {...getInputProps()} />
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <div>
                <p className="font-medium">Drop RC card here or click to browse</p>
                <p className="text-sm text-muted-foreground">PNG, JPG, WEBP or PDF · max 1 file</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <FileImage className="size-4 text-muted-foreground" />
                  <span className="max-w-[16rem] truncate font-medium">{file?.name}</span>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={reset}>
                  <X className="size-4" />
                </Button>
              </div>
              {file?.type.startsWith("image/") ? (
                <img src={preview} alt="RC card" className="max-h-64 w-full object-contain bg-muted/30" />
              ) : (
                <div className="grid h-40 place-items-center bg-muted/30 text-sm text-muted-foreground">
                  PDF preview unavailable — ready to extract
                </div>
              )}
            </div>
          )}

          {/* Extraction pipeline */}
          {file && (extract.isPending || result) && (
            <div className="space-y-3 rounded-xl border bg-secondary/30 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ScanLine className="size-4 text-primary" /> Azure Foundry · AI Services
              </div>
              {STEPS.map((label, i) => {
                const done = result ? true : i < activeStep;
                const active = !result && i === activeStep && extract.isPending;
                return (
                  <div key={label} className="flex items-center gap-2.5 text-sm">
                    {done ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    ) : (
                      <span className="size-4 rounded-full border" />
                    )}
                    <span className={cn(done ? "text-foreground" : "text-muted-foreground")}>
                      {i + 1}. {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Result */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Extracted fields</p>
                <div className="flex items-center gap-2">
                  <Badge variant={result.source === "azure-openai" ? "success" : "secondary"}>
                    {result.source === "azure-openai" ? "GPT-4o" : "Mock"}
                  </Badge>
                  <Badge variant="default">
                    {Math.round(result.confidence * 100)}% confidence
                  </Badge>
                </div>
              </div>
              <Progress value={result.confidence * 100} />
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Plate", result.plate],
                  ["VIN", result.vin],
                  ["Make", result.make],
                  ["Model", result.model],
                  ["First reg.", result.firstRegistration],
                  ["EURO norm", result.euronorm],
                  ["Weight (kg)", result.totalWeightKg],
                  ["Axles", result.axles],
                  ["CO₂ (g/km)", result.co2Emission],
                  ["Country", result.countryCode],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-lg border bg-card p-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</p>
                    <p className="truncate text-sm font-medium">{v || "—"}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {result ? (
            <Button onClick={useData}>
              Use to create vehicle <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={runExtraction} disabled={!file || extract.isPending}>
              {extract.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Extracting…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Extract with AI
                </>
              )}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
