import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/exchange/portfolio", "/login", "/register"] },
    sitemap: "https://carbadia.io/sitemap.xml",
  };
}
