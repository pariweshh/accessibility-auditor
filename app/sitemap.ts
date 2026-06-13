import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the public marketing/scanner surface is indexable.
  // /login and /dashboard are intentionally excluded (noindex + robots disallow).
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ]
}
