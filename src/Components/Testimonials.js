import React, { useRef } from "react";
import { useTranslation } from "react-i18next";

const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

function TestimonialCard({ quote, name }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-[280px] sm:w-[320px] flex-shrink-0 p-6 sm:p-7 flex flex-col justify-between select-none min-h-[220px]">
      <div>
        <div className="flex mb-3">
          {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">"{quote}"</p>
      </div>
      <p className="text-[#515757] font-semibold text-sm mt-4">{name}</p>
    </div>
  );
}

export default function Testimonials() {
  const { t } = useTranslation();
  const scrollRef = useRef(null);

  const testimonials = [
    { quote: t("healthCheck.testimonials.t1.quote"), name: t("healthCheck.testimonials.t1.name") },
    { quote: t("healthCheck.testimonials.t2.quote"), name: t("healthCheck.testimonials.t2.name") },
    { quote: t("healthCheck.testimonials.t3.quote"), name: t("healthCheck.testimonials.t3.name") },
    { quote: t("healthCheck.testimonials.t4.quote"), name: t("healthCheck.testimonials.t4.name") },
    { quote: t("healthCheck.testimonials.t5.quote"), name: t("healthCheck.testimonials.t5.name") },
    { quote: t("healthCheck.testimonials.t6.quote"), name: t("healthCheck.testimonials.t6.name") },
  ];

  const scroll = (direction) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -340 : 340,
        behavior: "smooth",
      });
    }
  };

  const googleReviewUrl = "https://www.google.com/search?sca_esv=cd246a25237b15d7&rlz=1C1CHBF_enCA921CA921&sxsrf=ANbL-n7rYQKlnh35qcdbJ33RLSTaIB5yEg:1776370072915&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOXzxqe-SylFBdt0u5ocD9zMF7o9IjJLImhCyMm37i0uPsucFFR0R7T-FI0Z38vuciQd5jFdVnmLS4p5B3ecvv1Ab74VGj88j-BGE4J53wdcHxy8hjxckv28HqFFCoDH-dbXQoC50aId3pHvfoMbDNTbaTIaf&q=Lifestyledoctor:+Privat%C3%A4rztliche+Praxis+Shukri+Jarmoukli+Reviews&sa=X&ved=2ahUKEwj1672ZlvOTAxXmVPEDHQSJI8kQ0bkNegQIIxAH&cshid=1776370128453884&biw=1278&bih=1270&dpr=1.5";

  return (
    <section className="py-10 sm:py-14">
      <div className="px-5 sm:px-10 mb-12 sm:mb-16 max-w-7xl mx-auto">
        <div className="flex items-end justify-between">
          <h2 className="text-[#43A9AB] font-black leading-[0.85] tracking-tighter text-left max-w-[50%]" style={{ fontSize: "clamp(1.8rem, 5vw, 3.5rem)" }}>
            {t("healthCheck.testimonialsSection.title")}
          </h2>
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all no-underline"
          >
            <span className="text-sm font-bold text-[#515757]">4.9</span>
            <StarIcon />
          </a>
        </div>
        <div className="mt-8 flex justify-center sm:justify-start">
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-3 pl-2 pr-6 py-2 bg-white rounded-full border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-gray-300/80 hover:-translate-y-0.5 transition-all duration-300 no-underline"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100">
              <svg className="w-[18px] h-[18px]" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[11px] uppercase tracking-[0.12em] text-gray-400 font-medium">
                Google
              </span>
              <span className="text-[14px] text-[#515757] font-semibold group-hover:text-[#43A9AB] transition-colors">
                {t("testimonials.writeReview")}
              </span>
            </span>
            <span className="w-6 h-6 rounded-full bg-gray-50 group-hover:bg-[#43A9AB] flex items-center justify-center transition-colors duration-300">
              <svg className="w-3 h-3 text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </a>
        </div>
      </div>
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-4 px-5 sm:px-8 pb-4" style={{ paddingLeft: "max(1.25rem, calc((100vw - 56rem) / 2 + 1.25rem))" }}>
          {testimonials.map((testimonial, i) => (
            <TestimonialCard key={i} {...testimonial} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 mt-6">
        <button onClick={() => scroll("left")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
          <svg className="w-4 h-4 text-[#515757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button onClick={() => scroll("right")} className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer">
          <svg className="w-4 h-4 text-[#515757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </section>
  );
}
