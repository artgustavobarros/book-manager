import type { Metadata } from "next";

import { ShelfPage } from "@/components/estante/shelf-page";

export const metadata: Metadata = { title: "Estante" };

export default function EstantePage() {
  return <ShelfPage />;
}
