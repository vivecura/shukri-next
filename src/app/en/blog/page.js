import {
  fetchPublishedPostsForLanguage,
  orderForListing,
} from "@/lib/blogQueries.server";
import { tForLang } from "@/lib/i18n";
import ArticleCard from "@/components/ArticleCard";
import TopicChips from "@/components/TopicChips";

export const metadata = {
  title: tForLang("en", "blog.seoTitle"),
  description: tForLang("en", "blog.seoDescription"),
  alternates: {
    canonical: "/en/blog",
    languages: {
      de: "/blog",
      en: "/en/blog",
    },
  },
};

// ISR fallback safety net. Webhook revalidation handles most updates faster.
export const revalidate = 60;

export default async function BlogListPage() {
  const lang = "en";
  const posts = orderForListing(await fetchPublishedPostsForLanguage(lang));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:gap-12">
        {/* Ratgeber — topic list (left column on md+) */}
        <aside className="md:w-56 md:shrink-0 mb-10 md:mb-0">
          <h1 className="text-3xl font-light tracking-wide text-[#515757] mb-6">
            {tForLang(lang, "blog.pageTitle")}
          </h1>
          <TopicChips lang={lang} orientation="vertical" />
        </aside>

        {/* Wissen — articles (right column on md+) */}
        <div className="flex-1 min-w-0">
          {/* Section header */}
          <div className="mb-12">
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
