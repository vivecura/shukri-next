import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import ShadowHtml from "../Components/ShadowHtml";
import Seo from "../Components/Seo";
import useLanguage from "../hooks/useLanguage";
import { fetchPostBySlugAndLang, findPairedBlogSlug } from "../lib/blogQueries";

function BlogPost() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const lang = useLanguage();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pairedSlug, setPairedSlug] = useState(null);

  useEffect(() => {
    const load = async () => {
      const data = await fetchPostBySlugAndLang(slug, lang);
      setPost(data);
      setLoading(false);
      if (data) {
        const targetLang = lang === "en" ? "de" : "en";
        const paired = await findPairedBlogSlug(slug, lang, targetLang);
        setPairedSlug(paired);
      }
    };
    load();
  }, [slug, lang]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-start">
        <div className="w-8 h-8 border-2 border-[#43a9ab]/30 border-t-[#43a9ab] rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen pt-24 px-4 text-center">
        <h1 className="text-2xl font-light text-[#515757] mb-4">
          {t("blogPost.notFound")}
        </h1>
        <Link
          to={lang === "en" ? "/en/blog" : "/blog"}
          className="text-[#43a9ab] hover:underline text-sm no-underline"
        >
          &larr; {t("blogPost.backToBlog")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <Seo
        path={`/blog/${post.slug}`}
        title={post.title}
        description={post.description || post.title}
        image={post.thumbnail_url}
        type="article"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description || post.title,
            image: post.thumbnail_url ? [post.thumbnail_url] : undefined,
            datePublished: post.created_at,
            dateModified: post.updated_at || post.created_at,
            author: { "@type": "Person", name: "Dr. Shukri Jarmoukli" },
            publisher: {
              "@type": "Organization",
              name: "ViveCura",
              logo: { "@type": "ImageObject", url: "https://vivecura.com/Assets/logo6.png" },
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://vivecura.com${lang === "en" ? "/en" : ""}/blog/${post.slug}`,
            },
          })}
        </script>
        {pairedSlug && (
          <>
            <link rel="alternate" hrefLang={lang === "en" ? "de" : "en"} href={`https://vivecura.com${lang === "en" ? "" : "/en"}/blog/${pairedSlug}`} />
            <link rel="alternate" hrefLang={lang} href={`https://vivecura.com${lang === "en" ? "/en" : ""}/blog/${slug}`} />
          </>
        )}
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-4">
        <Link
          to={lang === "en" ? "/en/blog" : "/blog"}
          className="inline-flex items-center gap-2 text-sm text-[#515757]/50 hover:text-[#43a9ab] transition-colors duration-300 no-underline"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("blogPost.backToBlog")}
        </Link>
      </div>

      <ShadowHtml html={post.html_content} />

      <div className="bg-[#f7f9f9] py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-light text-[#515757] mb-4">
            {t("blogPost.ctaTitle")}
          </h2>
          <p className="text-[#515757]/70 mb-8 text-base">
            {t("blogPost.ctaSubtitle")}
          </p>
          <a
            href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#43a9ab] hover:bg-[#3a9496] text-white px-8 py-3 rounded-lg text-base font-medium transition-colors duration-300 no-underline"
          >
            {t("blogPost.ctaButton")}
          </a>
        </div>
      </div>
    </div>
  );
}

export default BlogPost;
