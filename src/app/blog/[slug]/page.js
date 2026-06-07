import { notFound } from "next/navigation";
import {
  fetchPostBySlugAndLang,
  fetchAllPublishedPostsForSitemap,
} from "@/lib/blogQueries.server";
import { scopeBlogHtml, SCOPE_CLASS } from "@/lib/scopeBlogHtml";
import BlogScripts from "@/components/BlogScripts";

// Pre-render all DE post slugs at build time.
export async function generateStaticParams() {
  const posts = await fetchAllPublishedPostsForSitemap();
  return posts
    .filter((p) => p.language === "de")
    .map((p) => ({ slug: p.slug }));
}

// dynamicParams = true (default) lets posts published AFTER build render on demand.
// ISR safety net for un-webhook'd changes.
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await fetchPostBySlugAndLang(slug, "de");
  if (!post) return { title: "Beitrag nicht gefunden" };
  return {
    title: post.title,
    description: post.description || post.title,
    alternates: {
      canonical: `/blog/${post.slug}`,
      languages: {
        de: `/blog/${post.slug}`,
      },
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
  const post = await fetchPostBySlugAndLang(slug, "de");
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
      url: "https://vivecura.com/ueber-mich",
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
      "@id": `https://vivecura.com/blog/${post.slug}`,
    },
  };

  return (
    <main className="pt-24 px-5 max-w-4xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {post.thumbnail_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.thumbnail_url}
          alt={post.title}
          className="w-full h-auto rounded-2xl mb-8"
        />
      )}
      <h1 className="text-3xl sm:text-4xl font-bold text-[#43a9ab] mb-4">
        {post.title}
      </h1>
      {post.description && (
        <p className="text-lg text-[#515757]/80 mb-8">{post.description}</p>
      )}

      {styles.map((css, i) => (
        <style key={i} dangerouslySetInnerHTML={{ __html: css }} />
      ))}

      <article
        className={[SCOPE_CLASS, ...hostClasses].join(" ").trim()}
        id={hostId || undefined}
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <BlogScripts scripts={scripts} />
    </main>
  );
}
