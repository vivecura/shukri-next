import { Link } from "react-router-dom";
import useLanguage from "../hooks/useLanguage";
import { TOPICS, getTopicLabel, buildTopicUrl } from "../lib/topics";

// Horizontal row of topic circles (image + label) shown on /blog and each topic page.
// Pass `activeSlug` (DE-canonical slug) on a topic page to highlight the current one.
function TopicChips({ activeSlug = null }) {
  const lang = useLanguage();

  return (
    <div className="-mx-4 px-4 mb-10 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex items-start gap-5 sm:gap-8 min-w-max">
        {TOPICS.map((topic) => {
          const isActive = topic.slug === activeSlug;
          const label = getTopicLabel(topic, lang);
          const ring = isActive
            ? "ring-2 ring-[#43a9ab] ring-offset-2"
            : "ring-1 ring-gray-200 hover:ring-[#43a9ab]/40";
          const text = isActive
            ? "text-[#43a9ab]"
            : "text-[#515757]/70 group-hover:text-[#43a9ab]";
          return (
            <Link
              key={topic.slug}
              to={buildTopicUrl(topic, lang)}
              className="group flex flex-col items-center w-24 sm:w-32 no-underline transition-transform duration-300 ease-out hover:-translate-y-1"
            >
              <div
                className={`w-20 h-20 rounded-full overflow-hidden bg-white transition-all duration-300 ${ring}`}
              >
                <img
                  src={topic.image}
                  alt={label}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
              </div>
              <span
                className={`mt-2 text-xs text-center leading-tight transition-colors duration-300 ${text}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default TopicChips;
