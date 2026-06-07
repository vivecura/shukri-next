import { Link } from "react-router-dom";

// Single blog article card. Used by Blog.js and BlogTopic.js.
// `index` controls the staggered fade-in delay.
function ArticleCard({ post, lang, index = 0 }) {
  return (
    <Link
      to={lang === "en" ? `/en/blog/${post.slug}` : `/blog/${post.slug}`}
      className="group block no-underline opacity-0 animate-fade-in-up"
      style={{
        animationDelay: `${index * 80}ms`,
        animationFillMode: "forwards",
      }}
    >
      <div className="overflow-hidden rounded-lg border border-gray-100 hover:border-[#43a9ab]/20 transition-all duration-500 hover:shadow-md hover:shadow-[#43a9ab]/5">
        {/* Thumbnail */}
        {post.thumbnail_url ? (
          <div className="aspect-[4/3] overflow-hidden">
            <img
              src={post.thumbnail_url}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gradient-to-br from-[#43a9ab]/10 to-[#43a9ab]/5 flex items-center justify-center">
            <span className="text-[#43a9ab]/30 text-3xl font-light">
              {post.title?.[0] || "B"}
            </span>
          </div>
        )}

        {/* Card body */}
        <div className="p-3">
          <p className="text-[10px] text-[#43a9ab] font-medium tracking-wider uppercase mb-1">
            {new Date(post.created_at).toLocaleDateString(
              lang === "en" ? "en-US" : "de-DE",
              { day: "numeric", month: "short", year: "numeric" }
            )}
          </p>
          <h2 className="text-sm font-medium text-[#515757] group-hover:text-[#43a9ab] transition-colors duration-300 line-clamp-2">
            {post.title}
          </h2>
        </div>
      </div>
    </Link>
  );
}

export default ArticleCard;
