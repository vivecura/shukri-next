import { useState } from "react";

const ChevronDown = ({ isOpen }) => (
  <svg className={`w-5 h-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

function ProcessTimeline({ title, subtitle, steps }) {
  const [openStep, setOpenStep] = useState(null);

  return (
    <section className="py-8 sm:py-12 px-5 sm:px-8">
      <div className="max-w-5xl mx-auto">
        {(title || subtitle) && (
          <h2
            className="font-black uppercase tracking-tight text-[#43A9AB] leading-[0.95] mb-6 sm:mb-8"
            style={{ fontSize: "clamp(1.6rem, 4.2vw, 3rem)" }}
          >
            {title}
            {title && subtitle && <br />}
            {subtitle}
          </h2>
        )}

        <ol className="border-t border-gray-200">
          {steps.map((step, i) => {
            const isOpen = openStep === i;
            return (
              <li key={i} className="border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setOpenStep(isOpen ? null : i)}
                  className="w-full grid grid-cols-[1fr_auto_auto] gap-4 sm:gap-8 items-center py-4 sm:py-6 text-left focus:outline-none group"
                >
                  <h3
                    className="uppercase font-light tracking-wide text-[#43A9AB] group-hover:opacity-80 transition-opacity leading-tight pr-2"
                    style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.75rem)" }}
                  >
                    {step.title}
                  </h3>

                  <div
                    className="font-light text-[#43A9AB] tabular-nums leading-none"
                    style={{ fontSize: "clamp(2rem, 5.5vw, 3.75rem)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </div>

                  <span className="text-[#43A9AB] shrink-0">
                    <ChevronDown isOpen={isOpen} />
                  </span>
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-[600px] opacity-100 pb-5 sm:pb-6" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-2 text-[#515757] text-sm sm:text-base leading-relaxed pr-12 sm:pr-24">
                    {step.lines.map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default ProcessTimeline;
