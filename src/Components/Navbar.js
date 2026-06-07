import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import useLanguage from "../hooks/useLanguage";
import { translatePath } from "../lib/routeMap";

const navIcons = {
	home: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	mentoring: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M12 14l8-4-8-4-8 4 8 4z" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M6 11v4c0 1.5 2.7 3 6 3s6-1.5 6-3v-4" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M20 10v5" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	beratung: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M8 10h.01M12 10h.01M16 10h.01" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	chevron: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3">
			<path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	leistungen: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	fokus: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
		</svg>
	),
	spezielleTherapien: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
			<rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
			<rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
			<rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	infusions: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M12 2v6M12 22v-8M12 14a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M8 2h8" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	ueberMich: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	blog: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	meinBuch: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	appointment: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
			<path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	diagnostik: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
	extras: (
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
			<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	),
};

const Navbar = () => {
	const { t } = useTranslation();
	const location = useLocation();
	const lang = useLanguage();
	const localized = (dePath) => {
		if (lang !== "en") return dePath;
		const mapped = translatePath(dePath, "en");
		return mapped || dePath;
	};
	const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
	const [menuOpen, setMenuOpen] = useState(false);
	const [isScrolled, setIsScrolled] = useState(false);
	const [isVisible, setIsVisible] = useState(true);
	const [servicesOpen, setServicesOpen] = useState(false);
	const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
	const [mobileLeistungenOpen, setMobileLeistungenOpen] = useState(false);
	const lastScrollY = React.useRef(0);
	const mobileNavRef = React.useRef(null);

	useEffect(() => {
		if (!mobileServicesOpen && !mobileLeistungenOpen) return;
		const handleDocClick = (e) => {
			if (mobileNavRef.current && !mobileNavRef.current.contains(e.target)) {
				setMobileServicesOpen(false);
				setMobileLeistungenOpen(false);
			}
		};
		document.addEventListener("mousedown", handleDocClick);
		document.addEventListener("touchstart", handleDocClick);
		return () => {
			document.removeEventListener("mousedown", handleDocClick);
			document.removeEventListener("touchstart", handleDocClick);
		};
	}, [mobileServicesOpen, mobileLeistungenOpen]);

	useEffect(() => {
		setMobileServicesOpen(false);
		setMobileLeistungenOpen(false);
	}, [location.pathname]);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth < 1024);
			if (window.innerWidth >= 1024) {
				setMenuOpen(false);
			}
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY;
			setIsScrolled(currentScrollY > 10);

			if (currentScrollY <= 10) {
				setIsVisible(true);
			} else if (currentScrollY < lastScrollY.current) {
				setIsVisible(true);
			} else if (currentScrollY > lastScrollY.current) {
				setIsVisible(false);
			}

			lastScrollY.current = currentScrollY;
		};

		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	const scrollToSection = (sectionId) => {
		const element = document.getElementById(sectionId);
		if (element) {
			let offset = element.offsetTop;
			if (sectionId === "landing-page") {
				offset = 0;
			}
			window.scrollTo({ top: offset, behavior: "smooth" });
			setMenuOpen(false);
		}
	};

	const handleNavigation = (sectionId) => {
		const homePath = lang === "en" ? "/en" : "/";
		if (location.pathname === homePath) {
			scrollToSection(sectionId);
		} else {
			window.location.href = `${homePath}#${sectionId}`;
		}
		setMenuOpen(false);
	};

	const NavItem = ({ onClick, icon, label, isLink, to }) => {
		const isActive = isLink && location.pathname === to;
		const inner = (
			<>
				<span className={`${isActive ? "text-[#43a9ab] scale-110" : "text-[#515757]/50"} group-hover:text-[#43a9ab] transition-all duration-300`}>
					{icon}
				</span>
				<span className={`${isActive ? "text-[12px] text-[#43a9ab] font-bold" : "text-[11px] text-[#515757]/90 font-semibold"} group-hover:text-[#43a9ab] transition-all duration-300`}>
					{label}
				</span>
			</>
		);

		if (isLink) {
			return (
				<Link
					to={to}
					className="group flex flex-col items-center gap-1 px-4 py-1 no-underline focus:outline-none"
				>
					{inner}
				</Link>
			);
		}

		return (
			<button
				onClick={onClick}
				className="group flex flex-col items-center gap-1 px-4 py-1 focus:outline-none"
			>
				{inner}
			</button>
		);
	};

	return (
		<>
			<nav
				className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ease-in-out ${
					isVisible ? "translate-y-0" : "-translate-y-full"
				}`}
			>
				<div className="w-full bg-white border-b border-[#515757]/[0.06]">
					{isMobile ? (
						<div ref={mobileNavRef} className="relative flex items-center justify-center px-3 py-2 gap-2">
							<Link to={localized("/")} className="absolute left-3 flex items-center no-underline focus:outline-none shrink-0">
								<img src="/Assets/logo6.png" alt="ViveCura" className="h-16 w-auto object-contain" />
							</Link>
							<div className="flex items-center gap-4">
								<div className="relative">
									<button
										type="button"
										onClick={() => { setMobileServicesOpen((v) => !v); setMobileLeistungenOpen(false); }}
										className="flex flex-col items-center justify-center gap-0.5 w-[60px] py-1 text-[#515757]/80 hover:text-[#43a9ab]"
									>
										<span>{navIcons.fokus}</span>
										<span className="flex items-center gap-0.5 text-[11px] font-semibold">
											{t("navbar.fokus")}
											<span className={`transition-transform duration-200 ${mobileServicesOpen ? "rotate-180" : ""}`}>{navIcons.chevron}</span>
										</span>
									</button>
									{mobileServicesOpen && (
										<div className="fixed left-3 right-3 top-[88px] z-[120]">
											<div className="bg-white border border-[#515757]/10 rounded-2xl shadow-xl px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
												<Link
													to={localized("/koerperliche-symptome")}
													onClick={() => setMobileServicesOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/KoerperlicheBeschwerden.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.koerperlicheBeschwerden")}</span>
												</Link>
												<Link
													to={localized("/praevention-longevity")}
													onClick={() => setMobileServicesOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/PraeventionLongevity.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.praeventionLongevity")}</span>
												</Link>
												<Link
													to={localized("/psychotherapie")}
													onClick={() => setMobileServicesOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/Psychotherapie.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.psychotherapie")}</span>
												</Link>
											</div>
										</div>
									)}
								</div>
								<div className="relative">
									<button
										type="button"
										onClick={() => { setMobileLeistungenOpen((v) => !v); setMobileServicesOpen(false); }}
										className="flex flex-col items-center justify-center gap-0.5 w-[60px] py-1 text-[#515757]/80 hover:text-[#43a9ab]"
									>
										<span>{navIcons.leistungen}</span>
										<span className="flex items-center gap-0.5 text-[11px] font-semibold">
											{t("navbar.leistungen")}
											<span className={`transition-transform duration-200 ${mobileLeistungenOpen ? "rotate-180" : ""}`}>{navIcons.chevron}</span>
										</span>
									</button>
									{mobileLeistungenOpen && (
										<div className="fixed left-3 right-3 top-[88px] z-[120]">
											<div className="bg-white border border-[#515757]/10 rounded-2xl shadow-xl px-4 py-3 grid grid-cols-2 gap-x-3 gap-y-2">
												<Link
													to={localized("/beratung")}
													onClick={() => setMobileLeistungenOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/Beratung.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.beratung")}</span>
												</Link>
												<Link
													to={localized("/infusions")}
													onClick={() => setMobileLeistungenOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/Infusionen.jpeg" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.infusions")}</span>
												</Link>
												<Link
													to={localized("/mentoring")}
													onClick={() => setMobileLeistungenOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/Mentoring.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.mentoring")}</span>
												</Link>
												<Link
													to={localized("/diagnostik")}
													onClick={() => setMobileLeistungenOpen(false)}
													className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[#43a9ab]/5 no-underline"
												>
													<div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[#515757]/10 shrink-0">
														<img src="/Assets/Diagnostik.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[11px] font-semibold text-[#515757] leading-tight">{t("navbar.diagnostik")}</span>
												</Link>
											</div>
										</div>
									)}
								</div>
								<button
									type="button"
									onClick={() => setMenuOpen(!menuOpen)}
									className="flex flex-col items-center justify-center gap-0.5 w-[60px] py-1 text-[#515757]/80 hover:text-[#43a9ab]"
								>
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
										<line x1="4" y1="7" x2="20" y2="7" strokeLinecap="round" />
										<line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
										<line x1="4" y1="17" x2="20" y2="17" strokeLinecap="round" />
									</svg>
									<span className="text-[11px] font-semibold">{t("navbar.more")}</span>
								</button>
								</div>
								<a
									href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
									target="_blank"
									rel="noopener noreferrer"
									className="absolute right-3 flex flex-col items-center justify-center gap-0.5 w-[60px] py-1.5 rounded-lg bg-[#43a9ab] text-white no-underline hover:bg-[#378f91]"
								>
									<span>{navIcons.appointment}</span>
									<span className="text-[11px] font-bold">{t("navbar.buchen")}</span>
								</a>
						</div>
					) : (
						<div className="relative flex items-center justify-center py-1.5 px-6">
							<Link to={localized("/")} className="absolute left-6 flex items-center no-underline focus:outline-none shrink-0">
								<img src="/Assets/logo6.png" alt="ViveCura" className="h-20 w-auto object-contain" />
							</Link>
							<div className="flex items-center">
								<NavItem isLink to={localized("/")} icon={navIcons.home} label={t("navbar.home")} />
								<div
									className="relative"
									onMouseEnter={() => setServicesOpen(true)}
									onMouseLeave={() => setServicesOpen(false)}
								>
									<button
										type="button"
										className="group flex flex-col items-center gap-1 px-4 py-1 focus:outline-none"
									>
										<span className={`${servicesOpen ? "text-[#43a9ab] scale-110" : "text-[#515757]/50"} group-hover:text-[#43a9ab] transition-all duration-300`}>
											{navIcons.fokus}
										</span>
										<span className={`flex items-center gap-1 ${servicesOpen ? "text-[12px] text-[#43a9ab] font-bold" : "text-[11px] text-[#515757]/90 font-semibold"} group-hover:text-[#43a9ab] transition-all duration-300`}>
											{t("navbar.fokus")}
											<span className={`transition-transform duration-300 ${servicesOpen ? "rotate-180" : ""}`}>
												{navIcons.chevron}
											</span>
										</span>
									</button>
									<div
										className={`absolute left-0 top-full pt-3 transition-all duration-200 ${
											servicesOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"
										}`}
									>
										<div className="bg-white border border-[#515757]/10 rounded-2xl shadow-xl px-6 py-5">
											<div className="flex items-center gap-4">
												<Link
													to={localized("/koerperliche-symptome")}
													className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#43a9ab]/5 no-underline transition-colors"
												>
													<div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-[#515757]/10 group-hover:ring-[#43a9ab] transition-all duration-200 shrink-0">
														<img src="/Assets/KoerperlicheBeschwerden.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[14px] font-semibold text-[#515757] group-hover:text-[#43a9ab] leading-tight transition-colors whitespace-nowrap">
														{t("navbar.koerperlicheBeschwerden")}
													</span>
												</Link>
												<Link
													to={localized("/praevention-longevity")}
													className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#43a9ab]/5 no-underline transition-colors"
												>
													<div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-[#515757]/10 group-hover:ring-[#43a9ab] transition-all duration-200 shrink-0">
														<img src="/Assets/PraeventionLongevity.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[14px] font-semibold text-[#515757] group-hover:text-[#43a9ab] leading-tight transition-colors whitespace-nowrap">
														{t("navbar.praeventionLongevity")}
													</span>
												</Link>
												<Link
													to={localized("/psychotherapie")}
													className="group flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#43a9ab]/5 no-underline transition-colors"
												>
													<div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-[#515757]/10 group-hover:ring-[#43a9ab] transition-all duration-200 shrink-0">
														<img src="/Assets/Psychotherapie.png" alt="" className="w-full h-full object-cover" />
													</div>
													<span className="text-[14px] font-semibold text-[#515757] group-hover:text-[#43a9ab] leading-tight transition-colors whitespace-nowrap">
														{t("navbar.psychotherapie")}
													</span>
												</Link>
											</div>
										</div>
									</div>
								</div>
								<NavItem isLink to={localized("/beratung")} icon={navIcons.beratung} label={t("navbar.beratung")} />
								<NavItem isLink to={localized("/diagnostik")} icon={navIcons.diagnostik} label={t("navbar.diagnostik")} />
								<NavItem isLink to={localized("/infusions")} icon={navIcons.infusions} label={t("navbar.infusions")} />
								<NavItem isLink to={localized("/mentoring")} icon={navIcons.mentoring} label={t("navbar.mentoring")} />
								<NavItem isLink to={localized("/ketamin")} icon={navIcons.extras} label={t("navbar.ketamin")} />
								<NavItem isLink to={localized("/ueber-mich")} icon={navIcons.ueberMich} label={t("navbar.ueberMich")} />
								<NavItem isLink to={localized("/blog")} icon={navIcons.blog} label={t("navbar.blog")} />
								<NavItem isLink to={localized("/kontakt")} icon={navIcons.beratung} label={t("kontakt.navbarLabel")} />
								<a
									href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
									target="_blank"
									rel="noopener noreferrer"
									className="group flex items-center px-3 py-2 ml-2 rounded-xl bg-[#43a9ab] hover:bg-[#378f91] transition-colors duration-300 no-underline focus:outline-none"
								>
									<span className="text-[12px] text-white font-bold transition-colors duration-300">
										{t("navbar.buchen")}
									</span>
								</a>
							</div>
						</div>
					)}
				</div>
			</nav>

			{menuOpen && (
				<div className="fixed inset-0 bg-white z-[110] overflow-y-auto">
					<div className="flex items-center justify-between px-5 py-4 border-b border-[#515757]/10">
						<Link to={localized("/")} onClick={() => setMenuOpen(false)} className="flex items-center no-underline">
							<img src="/Assets/logo6.png" alt="ViveCura" className="h-20 w-auto object-contain" />
						</Link>
						<button
							onClick={() => setMenuOpen(false)}
							className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#515757]/5"
							aria-label={t("navbar.menuClose")}
						>
							<svg className="w-5 h-5 text-[#515757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div className="px-5 pt-6 pb-10 max-w-md mx-auto">
						<h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#43a9ab] mb-4">
							{t("navbar.menu")}
						</h2>
						<div className="flex flex-col gap-2">
							{[
								{ to: "/", icon: navIcons.home, label: t("navbar.home") },
								{ to: "/ketamin", icon: navIcons.extras, label: t("navbar.ketamin") },
								{ to: "/ueber-mich", icon: navIcons.ueberMich, label: t("navbar.ueberMich") },
								{ to: "/blog", icon: navIcons.blog, label: t("navbar.blog") },
								{ to: "/kontakt", icon: navIcons.beratung, label: t("kontakt.navbarLabel") },
							].map((item) => (
								<Link
									key={item.to}
									to={localized(item.to)}
									onClick={() => setMenuOpen(false)}
									className="group flex items-center gap-4 px-4 py-3 rounded-2xl border border-[#515757]/10 hover:border-[#43a9ab] hover:bg-[#43a9ab]/5 no-underline transition-all"
								>
									<span className="w-10 h-10 rounded-full bg-[#43a9ab]/10 text-[#43a9ab] flex items-center justify-center shrink-0">
										{item.icon}
									</span>
									<span className="flex-1 text-[15px] font-semibold text-[#515757] group-hover:text-[#43a9ab] transition-colors">
										{item.label}
									</span>
									<svg className="w-4 h-4 text-[#515757]/40 group-hover:text-[#43a9ab] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</Link>
							))}
						</div>

						<h2 className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#43a9ab] mt-10 mb-4">
							{t("navbar.kontakt")}
						</h2>
						<div className="flex flex-col gap-3">
							<a
								href="tel:030200060860"
								className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#515757]/10 hover:border-[#43a9ab] hover:bg-[#43a9ab]/5 no-underline transition-all"
							>
								<span className="w-10 h-10 rounded-full bg-[#43a9ab]/10 text-[#43a9ab] flex items-center justify-center shrink-0">
									<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
										<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								<div className="flex-1">
									<div className="text-[11px] font-semibold tracking-wider uppercase text-[#515757]/50">{t("navbar.anrufen")}</div>
									<div className="text-[15px] font-semibold text-[#515757]">030 200060860</div>
								</div>
							</a>
							<a
								href="mailto:praxis@vivecura.com"
								className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#515757]/10 hover:border-[#43a9ab] hover:bg-[#43a9ab]/5 no-underline transition-all"
							>
								<span className="w-10 h-10 rounded-full bg-[#43a9ab]/10 text-[#43a9ab] flex items-center justify-center shrink-0">
									<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
										<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeLinecap="round" strokeLinejoin="round" />
										<path d="M22 6l-10 7L2 6" strokeLinecap="round" strokeLinejoin="round" />
									</svg>
								</span>
								<div className="flex-1">
									<div className="text-[11px] font-semibold tracking-wider uppercase text-[#515757]/50">{t("navbar.email")}</div>
									<div className="text-[15px] font-semibold text-[#515757]">praxis@vivecura.com</div>
								</div>
							</a>
						</div>

						<a
							href="https://www.doctolib.de/arzt/berlin/shukri-jarmoukli/booking/motives?source=profile"
							target="_blank"
							rel="noopener noreferrer"
							className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-[#43a9ab] text-white font-bold tracking-wide hover:bg-[#378f91] transition-colors no-underline"
						>
							{navIcons.appointment}
							<span>{t("navbar.terminBuchen")}</span>
						</a>
					</div>
				</div>
			)}

			{/* <LanguageSwitcher /> hidden until i18n is production-ready */}
		</>
	);
};

export default Navbar;
