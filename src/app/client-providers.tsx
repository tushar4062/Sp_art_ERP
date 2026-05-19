"use client";

import type { ReactNode } from "react";
import { Providers } from "./providers";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
