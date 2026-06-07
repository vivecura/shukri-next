import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchPublishedPostsByTopicAndLanguage,
  orderForListing,
} from "@/lib/blogQueries.server";
import { TOPICS, getTopicByEnSlug, getTopicLabel } from "@/lib/topics";
import { tForLang } from "@/lib/i18n";
import ArticleCard from "@/components/ArticleCard";
import TopicChips from "@/components/TopicChips";

// Pre-render every EN topic page at build time (uses slug_en).
export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug_en }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const topic = getTopicByEnSlug(slug);
  if (!topic) return {};
  const label = getTopicLabel(topic, "en");
  return {
    title: `${label} – Blog`,
    description: `All articles about ${label} on the Vivecura blog.`,
    alternates: {
      canonical: `/en/blog/topic/${topic.slug_en}`,
      languages: {
        de: `/blog/thema/${topic.slug}`,
        en: `/en/blog/topic/${topic.slug_en}`,
      },
    },
  };
}

// ISR fallback safety net. Webhook revalidation handles most updates faster.
export const revalidate = 60;

export default async function TopicPage({ params }) {
  const { slug } = await params;
  const topic = getTopicByEnSlug(slug);
  if (!topic) notFound();

  const lang = "en";
  const label = getTopicLabel(topic, lang);
  // Query uses the canonical DE slug regardless of UI language (topics are stored on DE rows).
  const posts = orderForListing(
    await fetchPublishedPostsByTopicAndLanguage(topic.slug, lang)
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb back to blog */}
        <Link
          href="/en/blog"
          className="inline-flex items-center gap-1 text-xs text-[#43a9ab] tracking-wider uppercase mb-3 no-underline hover:underline"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          {tForLang(lang, "blog.title")}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-light tracking-wide text-[#515757] mb-1">
            {label}
          </h1>
          <div className="w-12 h-[2px] bg-[#43a9ab]/40" />
        </div>

        {/* Topic chips with current topic highlighted (lookup by canonical DE slug) */}
        <TopicChips lang={lang} activeSlug={topic.slug} />

        {/* Article grid */}
        {posts.length === 0 ? (
          <p className="text-center text-[#515757]/40 py-20 text-sm">
            No articles yet for this topic.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {posts.map((post, i) => (
              <ArticleCard key={post.id} post={post} lang={lang} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
