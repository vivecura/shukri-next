import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchPublishedPostsByTopicAndLanguage,
  orderForListing,
} from "@/lib/blogQueries.server";
import { TOPICS, getTopicBySlug, getTopicLabel } from "@/lib/topics";
import { tForLang } from "@/lib/i18n";
import ArticleCard from "@/components/ArticleCard";
import TopicChips from "@/components/TopicChips";

// Pre-render every topic page at build time.
export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const topic = getTopicBySlug(slug);
  if (!topic) return {};
  const label = getTopicLabel(topic, "de");
  return {
    title: `${label} – Blog`,
    description: `Alle Artikel zum Thema ${label} im Vivecura-Blog.`,
    alternates: {
      canonical: `/blog/thema/${topic.slug}`,
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
  const topic = getTopicBySlug(slug);
  if (!topic) notFound();

  const lang = "de";
  const label = getTopicLabel(topic, lang);
  const posts = orderForListing(
    await fetchPublishedPostsByTopicAndLanguage(topic.slug, lang)
  );

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:gap-12">
        {/* Ratgeber — topic list (left column on md+) */}
        <aside className="md:w-56 md:shrink-0 mb-10 md:mb-0">
          <h2 className="text-3xl font-light tracking-wide text-[#515757] mb-6">
            {tForLang(lang, "blog.pageTitle")}
          </h2>
          <TopicChips lang={lang} activeSlug={topic.slug} orientation="vertical" />
        </aside>

        {/* Topic articles (right column on md+) */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb back to blog */}
          <Link
            href="/blog"
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

          {/* Article grid */}
          {posts.length === 0 ? (
            <p className="text-center text-[#515757]/40 py-20 text-sm">
              Noch keine Artikel zu diesem Thema.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map((post, i) => (
                <ArticleCard key={post.id} post={post} lang={lang} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
