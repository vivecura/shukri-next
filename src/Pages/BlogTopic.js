import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useLanguage from "../hooks/useLanguage";
import {
  fetchPublishedPostsByTopicAndLanguage,
  orderForListing,
} from "../lib/blogQueries";
import {
  getTopicBySlug,
  getTopicByEnSlug,
  getTopicLabel,
  buildTopicUrl,
} from "../lib/topics";
import Seo from "../Components/Seo";
import TopicChips from "../Components/TopicChips";
import ArticleCard from "../Components/ArticleCard";

function BlogTopic() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const lang = useLanguage();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // EN URLs use the EN slug; DE URLs use the canonical DE slug.
  const topic = lang === "en" ? getTopicByEnSlug(slug) : getTopicBySlug(slug);

  useEffect(() => {
    if (!topic) {
      navigate(lang === "en" ? "/en/blog" : "/blog", { replace: true });
      return;
    }
    const load = async () => {
      setLoading(true);
      const data = await fetchPublishedPostsByTopicAndLanguage(topic.slug, lang);
      setPosts(orderForListing(data));
      setLoading(false);
    };
    load();
  }, [topic, lang, navigate]);

  if (!topic) return null;

  const label = getTopicLabel(topic, lang);
  const path = buildTopicUrl(topic, lang);
  const seoPaths = {
    de: buildTopicUrl(topic, "de"),
    en: buildTopicUrl(topic, "en"),
  };
  const seoTitle =
    lang === "en"
      ? `${label} – Blog`
      : `${label} – Blog`;
  const seoDescription =
    lang === "en"
      ? `All articles about ${label} on the Vivecura blog.`
      : `Alle Artikel zum Thema ${label} im Vivecura-Blog.`;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <Seo path={path} paths={seoPaths} title={seoTitle} description={seoDescription} />
      <div className="max-w-5xl mx-auto">
        {/* Breadcrumb back to blog */}
        <Link
          to={lang === "en" ? "/en/blog" : "/blog"}
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
          {t("blog.title")}
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-light tracking-wide text-[#515757] mb-1">
            {label}
          </h1>
          <div className="w-12 h-[2px] bg-[#43a9ab]/40" />
        </div>

        {/* Topic chips with current topic highlighted */}
        <TopicChips activeSlug={topic.slug} />

        {/* Article grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#43a9ab]/30 border-t-[#43a9ab] rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-[#515757]/40 py-20 text-sm">
            {lang === "en"
              ? "No articles yet for this topic."
              : "Noch keine Artikel zu diesem Thema."}
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

export default BlogTopic;
