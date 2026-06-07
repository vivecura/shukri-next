import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useLanguage from "../hooks/useLanguage";
import { fetchPublishedPostsForLanguage, orderForListing } from "../lib/blogQueries";
import Seo from "../Components/Seo";
import TopicChips from "../Components/TopicChips";
import ArticleCard from "../Components/ArticleCard";

function Blog() {
  const { t } = useTranslation();
  const lang = useLanguage();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchPublishedPostsForLanguage(lang);
      setPosts(orderForListing(data));
      setLoading(false);
    };
    load();
  }, [lang]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <Seo
        path="/blog"
        title={t("blog.seoTitle")}
        description={t("blog.seoDescription")}
      />
      <div className="max-w-5xl mx-auto">
        {/* Page title */}
        <h1 className="text-3xl font-light tracking-wide text-[#515757] mb-8">
          {t("blog.pageTitle")}
        </h1>

        {/* Topic chips */}
        <TopicChips />

        {/* Section header */}
        <div className="mb-12 mt-8">
          <h2 className="text-3xl font-light tracking-wide text-[#515757] mb-1">
            {t("blog.title")}
          </h2>
          <p className="text-lg text-[#43a9ab] font-light mb-3">
            {t("blog.subtitle")}
          </p>
          <div className="w-12 h-[2px] bg-[#43a9ab]/40 mb-4" />
          <p className="text-[#515757]/50 text-sm max-w-lg leading-relaxed">
            {t("blog.intro")}
          </p>
        </div>

        {/* Loading spinner */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#43a9ab]/30 border-t-[#43a9ab] rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-[#515757]/40 py-20 text-sm">
            {t("blog.empty")}
          </p>
        ) : (
          /* Blog cards grid */
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

export default Blog;
