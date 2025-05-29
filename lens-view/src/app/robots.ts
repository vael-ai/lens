import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://lens.vael.ai";

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [
                "/reports/*", // Private report pages
                "/api/*", // API endpoints
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
