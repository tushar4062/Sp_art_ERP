"use client";

import { useEffect } from "react";
import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = messageFromUnknown(error, "An unexpected error occurred");

  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm">{message}</p>
      <div className="flex gap-3">
        <Button className="rounded-xl" onClick={() => reset()}>
          Try again
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    </div>
  );
}
