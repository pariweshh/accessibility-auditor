import type { MetadataRoute } from "next"
import { SITE } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep auth, private app, per-user reports, and API surfaces out of the index
      disallow: ["/login", "/dashboard", "/report/", "/api/", "/auth/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  }
}
