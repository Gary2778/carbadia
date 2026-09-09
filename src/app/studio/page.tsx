import type { Metadata } from "next";
import { StudioPage } from "@/components/studio/StudioPage";

export const metadata: Metadata = {
  title: "Studio",
  description: "Explore Carbadia Studio’s plans for carbon dioxide removal (CDR), direct air capture, renewable e-fuels, CO₂ reduction and chemical process development, alongside investment and research opportunities.",
  alternates: { canonical: "/studio" },
  openGraph: { title: "Carbadia Studio — Technology development", description: "Future directions in carbon dioxide removal (CDR), renewable synthetic fuels and chemical process development. Explore initial investment and collaboration opportunities.", url: "/studio" },
};

export default function Page() {
  return <StudioPage />;
}
