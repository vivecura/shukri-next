import {
  fetchPublishedPostsForLanguage,
  orderForListing,
} from "@/lib/blogQueries.server";
import { tForLang } from "@/lib/i18n";
import ArticleCard from "@/components/ArticleCard";
import TopicChips from "@/components/TopicChips";

export const metadata = {
  title: tForLang("de", "blog.seoTitle"),
  description: tForLang("de", "blog.seoDescription"),
  alternates: {
    canonical: "/blog",
    languages: {
      de: "/blog",
      en: "/en/blog",
    },
  },
};

// ISR fallback safety net. Webhook revalidation handles most updates faster.
export const revalidate = 60;

export default async function BlogListPage() {
  const lang = "de";
  const posts = orderForListing(await fetchPublishedPostsForLanguage(lang));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Page title */}
        <h1 className="text-3xl font-light tracking-wide text-[#515757] mb-8">
          {tForLang(lang, "blog.pageTitle")}
        </h1>

        {/* Topic chips */}
        <TopicChips lang={lang} />

        {/* Section header */}
        <div className="mb-12 mt-8">
          <h2 className="text-3xl font-light tracking-wide text-[#515757] mb-1">
            {tForLang(lang, "blog.title")}
          </h2>
          <p className="text-lg text-[#43a9ab] font-light mb-3">
            {tForLang(lang, "blog.subtitle")}
          </p>
          <div className="w-12 h-[2px] bg-[#43a9ab]/40 mb-4" />
          <p className="text-[#515757]/50 text-sm max-w-lg leading-relaxed">
            {tForLang(lang, "blog.intro")}
          </p>
        </div>

        {/* Blog cards grid */}
        {posts.length === 0 ? (
          <p className="text-center text-[#515757]/40 py-20 text-sm">
            {tForLang(lang, "blog.empty")}
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
