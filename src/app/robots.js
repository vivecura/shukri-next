const SITE_URL = "https://vivecura.com";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/honorar",
          "/anamnese",
          "/therapien-html/", // raw HTML files now inlined into /therapien/* — avoid duplicate content
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
