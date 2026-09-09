import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Real Market Data",
  description:
    "Public registry data from the global voluntary carbon market — CarbonPlan OffsetsDB registry projects — issuance, retirements, and beneficiaries. Reference data only, no prices.",
};

export default function RealLayout({ children }: { children: React.ReactNode }) {
  return children;
}
