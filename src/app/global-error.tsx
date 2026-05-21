"use client";

import { messageFromUnknown } from "@/lib/errors/messageFromUnknown";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = messageFromUnknown(error, "Application error");

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 font-sans">
        <h2 className="text-xl font-semibold">Application error</h2>
        <p className="text-gray-600 max-w-md text-sm text-center">{message}</p>
        <button
          type="button"
          className="rounded-lg bg-orange-500 px-4 py-2 text-white text-sm font-medium"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
