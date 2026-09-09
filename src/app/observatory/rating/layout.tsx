import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CCRC · Carbon Credit Rating",
  description: "A demo of how carbon-credit quality gets assessed — eight grades, four dimensions, sample data.",
};

export default function RatingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
