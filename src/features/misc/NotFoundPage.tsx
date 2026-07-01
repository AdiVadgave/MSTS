import { useNavigate } from "react-router-dom";
import { Compass, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="size-8" />
        </div>
        <div>
          <p className="text-4xl font-bold">404</p>
          <p className="mt-1 text-muted-foreground">This page hasn't been unified yet.</p>
        </div>
        <Button onClick={() => navigate("/")}>
          <ArrowLeft /> Back to dashboard
        </Button>
      </div>
    </div>
  );
}
