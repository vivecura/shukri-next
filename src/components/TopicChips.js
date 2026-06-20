import Link from "next/link";
import { TOPICS, getTopicLabel, buildTopicUrl } from "@/lib/topics";

// Row (horizontal) or list (vertical) of topic circles + labels.
// Pass `activeSlug` (DE-canonical slug) on a topic page to highlight the current one.
// Server Component — renders <a href> for every topic so Googlebot can crawl them.
function TopicChips({ lang, activeSlug = null, orientation = "horizontal" }) {
  if (orientation === "vertical") {
    return (
      <ul className="flex flex-col gap-3 list-none p-0 m-0">
        {TOPICS.map((topic) => {
          const isActive = topic.slug === activeSlug;
          const label = getTopicLabel(topic, lang);
          const ring = isActive
            ? "ring-2 ring-[#43a9ab] ring-offset-2"
            : "ring-1 ring-gray-200 group-hover:ring-[#43a9ab]/40";
          const text = isActive
            ? "text-[#43a9ab]"
            : "text-[#515757]/70 group-hover:text-[#43a9ab]";
          return (
            <li key={topic.slug}>
              <Link
                href={buildTopicUrl(topic, lang)}
                className="group flex items-center gap-3 no-underline transition-transform duration-300 ease-out hover:translate-x-1"
              >
                <div
                  className={`w-10 h-10 rounded-full overflow-hidden bg-white transition-all duration-300 shrink-0 ${ring}`}
                >
                  <img
                    src={topic.image}
                    alt={label}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                </div>
                <span
                  className={`text-sm leading-tight transition-colors duration-300 ${text}`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

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
              href={buildTopicUrl(topic, lang)}
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
