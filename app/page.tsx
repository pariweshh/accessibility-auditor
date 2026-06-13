import HomeClient from "./home_client"
import LandingFeatures from "@/components/landing_features"
import { SITE } from "@/lib/site"

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "0",
    offerCount: 3,
  },
  publisher: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
  },
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      {/* Interactive shell is a client island; the static features grid is
          server-rendered and passed in as a slot to keep it out of the bundle. */}
      <HomeClient features={<LandingFeatures />} />
    </>
  )
}
