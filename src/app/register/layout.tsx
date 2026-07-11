import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Get $100,000 in demo funds and practice carbon trading.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
