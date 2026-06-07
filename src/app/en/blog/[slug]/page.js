import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchPostBySlugAndLang,
  fetchAllPublishedPostsForSitemap,
  findPairedSlugServer,
} from "@/lib/blogQueries.server";
import { scopeBlogHtml, SCOPE_CLASS } from "@/lib/scopeBlogHtml";
import { tForLang } from "@/lib/i18n";
import BlogScripts from "@/components/BlogScripts";

// Pre-render all EN post slugs at build time.
export async function generateStaticParams() {
  const posts = await fetchAllPublishedPostsForSitemap();
  return posts
    .filter((p) => p.language === "en")
    .map((p) => ({ slug: p.slug }));
}

// dynamicParams = true (default) lets posts published AFTER build render on demand.
// ISR safety net for un-webhook'd changes.
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await fetchPostBySlugAndLang(slug, "en");
  if (!post) return { title: "Post not found" };

  const pairedDeSlug = await findPairedSlugServer(post);

  const languages = { en: `/en/blog/${post.slug}` };
  if (pairedDeSlug) languages.de = `/blog/${pairedDeSlug}`;

  return {
    title: post.title,
    description: post.description || post.title,
    alternates: {
      canonical: `/en/blog/${post.slug}`,
      languages,
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description || post.title,
      images: post.thumbnail_url ? [{ url: post.thumbnail_url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description || post.title,
      images: post.thumbnail_url ? [post.thumbnail_url] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params;
  const post = await fetchPostBySlugAndLang(slug, "en");
  if (!post) notFound();

  const { styles, bodyHtml, scripts, hostClasses, hostId } = scopeBlogHtml(
    post.html_content || ""
  );

  // Article JSON-LD for SEO.
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description || post.title,
    image: post.thumbnail_url || undefined,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      "@type": "Person",
      name: "Dr. Shukri Jarmoukli",
      url: "https://vivecura.com/en/about",
    },
    publisher: {
      "@type": "Organization",
      name: "ViveCura",
      logo: {
        "@type": "ImageObject",
        url: "https://vivecura.com/Assets/logo6.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://vivecura.com/en/blog/${post.slug}`,
    },
  };

  return (
    <div className="min-h-screen pt-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="max-w-5xl mx-auto px-4 py-4">
        <Link
          href="/en/blog"
          className="inline-flex items-center gap-2 text-sm text-[#515757]/50 hover:text-[#43a9ab] transition-colors duration-300 no-underline"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {tForLang("en", "blogPost.backToBlog")}
        </Link>
      </div>

      {styles.map((css, i) => (
        <style key={i} dangerouslySetInnerHTML={{ __html: css }} />
      ))}

      <article
        className={[SCOPE_CLASS, ...hostClasses].join(" ").trim()}
        id={hostId || undefined}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <BlogScripts scripts={scripts} />

      <div className="bg-[#f7f9f9] py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-[#515757] mb-4">
            {tForLang("en", "blogPost.ctaTitle")}
          </h2>
          <p className="text-[#515757]/70 mb-8 text-base">
            {tForLang("en", "blogPost.ctaSubtitle")}
          </p>
          <a
            href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#43a9ab] hover:bg-[#3a9496] text-white px-8 py-3 rounded-lg text-base font-medium transition-colors duration-300 no-underline"
          >
            {tForLang("en", "blogPost.ctaButton")}
          </a>
        </div>
      </div>
    </div>
  );
}
