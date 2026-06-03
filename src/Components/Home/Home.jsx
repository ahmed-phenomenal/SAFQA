import React, { useEffect, useMemo, useRef, useState } from "react";
import icon from "../../assets/2.png";
import icon2 from "../../assets/1.png";
import Navbar from "../Sign-in/Navbar";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "../../API/axios";

const FALLBACK_AUCTION_IMAGE =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop";

const FALLBACK_CATEGORY_IMAGES = {
  Electronics:
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1200&auto=format&fit=crop",
  Vehicles:
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop",
  "Real Estate":
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&auto=format&fit=crop",
  Sports:
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1200&auto=format&fit=crop",
  "Books & Media":
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=1200&auto=format&fit=crop",
  "Toys & Hobbies":
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=1200&auto=format&fit=crop",
  Fashion:
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop",
  default:
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1200&auto=format&fit=crop",
};

const normalizeListResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.value)) return data.value;
  return [];
};

const formatMoney = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "$0";
  return `$${num.toLocaleString()}`;
};

const getImageSrc = (image, fallback = FALLBACK_AUCTION_IMAGE) => {
  if (!image) return fallback;
  const raw = String(image).trim();
  if (!raw) return fallback;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image")) return raw;
  return `data:image/png;base64,${raw}`;
};

const getTimeLeft = (dateValue, t) => {
  if (!dateValue) return "";
  const now = new Date();
  const end = new Date(dateValue);
  if (Number.isNaN(end.getTime())) return "";
  const diff = end.getTime() - now.getTime();
  if (diff <= 0) return t("home.ended", "Ended");
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const getStatusKey = (status) => {
  const value = Number(status || 0);
  if (value === 1) return "statusLive";
  if (value === 2) return "statusEnding";
  if (value === 3) return "statusUpcoming";
  return "statusAuction";
};

const getStatusClass = (status) => {
  const key = getStatusKey(status);
  if (key === "statusLive") return "live";
  if (key === "statusEnding") return "ending";
  if (key === "statusUpcoming") return "upcoming";
  return "auction";
};

const getCardsPerView = (width) => {
  if (width <= 650) return 1;
  if (width <= 1000) return 2;
  return 3;
};

const normalizeEndingSoonItem = (item, index) => ({
  id: Number(item?.auctionId ?? item?.AuctionId ?? item?.id ?? item?.Id ?? index + 1),
  title: String(item?.title ?? item?.Title ?? "Auction"),
  image: getImageSrc(item?.image ?? item?.Image, FALLBACK_AUCTION_IMAGE),
  currentPrice: Number(item?.currentPrice ?? item?.CurrentPrice ?? item?.displayPrice ?? 0),
  endDate: item?.endDate ?? item?.EndDate ?? item?.displayDate ?? "",
});

const normalizeTrendingItem = (item, index) => ({
  id: Number(item?.auctionId ?? item?.AuctionId ?? item?.id ?? item?.Id ?? index + 1),
  title: String(item?.title ?? item?.Title ?? "Auction"),
  image: getImageSrc(item?.image ?? item?.Image, FALLBACK_AUCTION_IMAGE),
  displayPrice: Number(item?.displayPrice ?? item?.DisplayPrice ?? 0),
  displayDate: item?.displayDate ?? item?.DisplayDate ?? "",
  totalBids: Number(item?.totalBids ?? item?.TotalBids ?? 0),
  status: Number(item?.status ?? item?.Status ?? 0),
});

const normalizeRecommendationItem = (item, index) => ({
  id: Number(item?.auctionId ?? item?.AuctionId ?? item?.id ?? item?.Id ?? index + 1),
  title: String(item?.title ?? item?.Title ?? "Auction"),
  image: getImageSrc(item?.image ?? item?.Image, FALLBACK_AUCTION_IMAGE),
  displayPrice: Number(item?.displayPrice ?? item?.DisplayPrice ?? 0),
  displayDate: item?.displayDate ?? item?.DisplayDate ?? "",
  totalBids: Number(item?.totalBids ?? item?.TotalBids ?? 0),
  status: Number(item?.status ?? item?.Status ?? 0),
});

const normalizeCategoryItem = (item, index) => {
  const name = String(item?.name ?? item?.Name ?? "Category");
  const fallback = FALLBACK_CATEGORY_IMAGES[name] || FALLBACK_CATEGORY_IMAGES.default;
  return {
    id: Number(item?.id ?? item?.Id ?? index + 1),
    name,
    image: getImageSrc(item?.image ?? item?.Image, fallback),
    auctionCount: Number(item?.auctionCount ?? item?.AuctionCount ?? 0),
  };
};

const SectionHeader = ({ title, actionText, onAction }) => (
  <div className="home-section-row">
    <p><span>{title}</span></p>
    {actionText ? (
      <div className="home-section-actions">
        <button type="button" className="home-view-all-btn" onClick={onAction}>
          {actionText}
        </button>
      </div>
    ) : null}
  </div>
);

const HomeSkeleton = () => (
  <div className="home-skeleton">
    <div className="home-skeleton-slider">
      <div className="home-skeleton-slide shimmer" />
      <div className="home-skeleton-dots">
        <span className="home-skeleton-dot shimmer" />
        <span className="home-skeleton-dot shimmer" />
        <span className="home-skeleton-dot shimmer" />
      </div>
    </div>
    <div className="home-skeleton-title shimmer" />
    <div className="home-skeleton-cats">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="home-skeleton-cat shimmer" key={i} />
      ))}
    </div>
    <div className="home-skeleton-title shimmer" />
    <div className="home-skeleton-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="home-skeleton-card" key={i}>
          <div className="home-skeleton-thumb shimmer" />
          <div className="home-skeleton-lines">
            <div className="home-skeleton-line shimmer" />
            <div className="home-skeleton-line short shimmer" />
            <div className="home-skeleton-line mid shimmer" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AuctionMiniCard = ({ item, t, onOpen, favIds, onToggleFav }) => {
  const statusKey = getStatusKey(item.status);
  const isFav = favIds.has(item.id);
  const [favLoading, setFavLoading] = useState(false);

  const handleFavClick = async (e) => {
    e.stopPropagation();
    if (favLoading) return;
    try {
      setFavLoading(true);
      if (isFav) {
        await api.delete(`/User/RemoveFavorite/${item.id}`);
      } else {
        await api.post(`/User/add-favorite/${item.id}`);
      }
      onToggleFav(item.id, !isFav);
    } catch {
      // silent fail
    } finally {
      setFavLoading(false);
    }
  };

  return (
    <div
      className="home-auction-mini-card home-mini-card-hoverable"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(item.id); }}
    >
      <div className="home-auction-mini-image-wrap">
        <img src={item.image} alt={item.title} className="home-auction-mini-image" />
        <span className={`home-badge home-badge--${getStatusClass(item.status)}`}>
          {t(`home.${statusKey}`, statusKey)}
        </span>

        <button
          type="button"
          className={`home-fav-star-btn ${isFav ? "home-fav-star-btn--active" : ""}`}
          onClick={handleFavClick}
          disabled={favLoading}
          aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
        >
          <i className={isFav ? "fa-solid fa-star" : "fa-regular fa-star"}></i>
        </button>
      </div>

      <div className="home-auction-mini-body">
        <div className="home-auction-mini-id">
          {t("home.lotNumber", { id: item.id })}
        </div>
        <h3 className="home-auction-mini-title">{item.title}</h3>
        <div className="home-auction-mini-meta">
          <span>{t("home.bidsCount", { count: item.totalBids })}</span>
          <span>{getTimeLeft(item.displayDate, t)}</span>
        </div>
        <div className="home-auction-mini-price">{formatMoney(item.displayPrice)}</div>
      </div>
    </div>
  );
};

// ── CHANGED: simple pagination component matching admin style ──
function Pagination({ page, totalPages, loading, onPrev, onNext, t }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
      <button className="action-btn view" disabled={page <= 1 || loading} onClick={onPrev}>
        {t("previous", "Previous")}
      </button>
      <strong>{t("page", "Page")} {page} {t("of", "of")} {totalPages}</strong>
      <button className="action-btn view" disabled={page >= totalPages || loading} onClick={onNext}>
        {t("next", "Next")}
      </button>
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [title] = useState(t("home.title", "Home"));
  const [favicon] = useState(icon);

  const [loading, setLoading] = useState(true);

  const [endingSoon, setEndingSoon] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trending, setTrending] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  const [favIds, setFavIds] = useState(new Set());

  // ── CHANGED: trending pagination state ──
  const [trendingPage, setTrendingPage]           = useState(1);
  const [trendingTotalPages, setTrendingTotalPages] = useState(1);
  const [trendingLoading, setTrendingLoading]     = useState(false);
  const TRENDING_PAGE_SIZE = 20;

  const [cardsPerView, setCardsPerView] = useState(() =>
    getCardsPerView(typeof window !== "undefined" ? window.innerWidth : 1440)
  );

  const categoriesRef = useRef(null);
  const endingSoonRef = useRef(null);

  const isDraggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);

  const autoTimerRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const scrollEndTimerRef = useRef(null);

  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef(null);

  const [endingSoonIndex, setEndingSoonIndex] = useState(0);
  const [dotDirection, setDotDirection] = useState("next");

  const openAuctionDetails = (auctionId) => {
    if (!auctionId) return;
    navigate(`/auction-details?auctionId=${auctionId}`);
  };

  const handleToggleFav = (auctionId, nowFav) => {
    setFavIds((prev) => {
      const next = new Set(prev);
      if (nowFav) next.add(auctionId);
      else next.delete(auctionId);
      return next;
    });
  };

  useEffect(() => {
    document.title = t("home.title", title);
  }, [title, t]);

  useEffect(() => {
    const updateFavicon = (iconUrl) => {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement("link");
        newLink.rel = "icon";
        newLink.href = iconUrl;
        document.head.appendChild(newLink);
      } else {
        link.href = iconUrl;
      }
    };
    updateFavicon(favicon);
  }, [favicon]);

  useEffect(() => {
    const handleResize = () => setCardsPerView(getCardsPerView(window.innerWidth));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── CHANGED: separate function to load trending by page ──
  const loadTrending = async (page = 1) => {
    try {
      setTrendingLoading(true);
      const res = await api.get("/User/trending", {
        params: { page, pageSize: TRENDING_PAGE_SIZE },
        timeout: 60000,
      });
      const root = res?.data || {};
      const raw = normalizeListResponse(root);
      setTrending(raw.map(normalizeTrendingItem));
      setTrendingPage(Number(root?.currentPage || page));
      setTrendingTotalPages(Number(root?.totalPages || 1));
    } catch {
      // silent fail — keep previous trending data
    } finally {
      setTrendingLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchHomeData = async () => {
      setLoading(true);

      const requests = [
        api.get("/User/ending-soon", { params: { page: 1, pageSize: 10 }, timeout: 60000 }),
        // ── CHANGED: pageSize 20, also read totalPages from response ──
        api.get("/User/trending",    { params: { page: 1, pageSize: TRENDING_PAGE_SIZE }, timeout: 60000 }),
        api.get("/User/categories",  { params: { page: 1, pageSize: 10 }, timeout: 60000 }),
        api.get("/AI/recommendations", { timeout: 60000 }),
        api.get("/Auction/favorites", { timeout: 60000 }),
      ];

      const [endingRes, trendingRes, categoriesRes, recommendationsRes, favsRes] =
        await Promise.allSettled(requests);

      if (!mounted) return;

      if (endingRes.status === "fulfilled") {
        const raw = normalizeListResponse(endingRes.value?.data);
        setEndingSoon(raw.map(normalizeEndingSoonItem));
      } else {
        setEndingSoon([]);
      }

      // ── CHANGED: read totalPages for trending ──
      if (trendingRes.status === "fulfilled") {
        const root = trendingRes.value?.data || {};
        const raw = normalizeListResponse(root);
        setTrending(raw.map(normalizeTrendingItem));
        setTrendingPage(Number(root?.currentPage || 1));
        setTrendingTotalPages(Number(root?.totalPages || 1));
      } else {
        setTrending([]);
      }

      if (categoriesRes.status === "fulfilled") {
        const raw = normalizeListResponse(categoriesRes.value?.data);
        setCategories(raw.map(normalizeCategoryItem));
      } else {
        setCategories([]);
      }

      if (recommendationsRes.status === "fulfilled") {
        const raw = normalizeListResponse(recommendationsRes.value?.data);
        setRecommendations(raw.map(normalizeRecommendationItem));
      } else {
        setRecommendations([]);
      }

      if (favsRes.status === "fulfilled") {
        const raw = normalizeListResponse(favsRes.value?.data);
        const ids = new Set(
          raw.map((item) =>
            Number(item?.auctionId ?? item?.AuctionId ?? item?.id ?? item?.Id ?? 0)
          ).filter(Boolean)
        );
        setFavIds(ids);
      }

      setLoading(false);
    };

    fetchHomeData();
    return () => { mounted = false; };
  }, []);

  const cloneSize = useMemo(() => {
    return endingSoon.length ? Math.max(cardsPerView, 3) : 0;
  }, [endingSoon.length, cardsPerView]);

  const endingSoonSlides = useMemo(() => {
    if (!endingSoon.length) return [];
    const clonedHead = endingSoon.slice(0, cloneSize);
    const clonedTail = endingSoon.slice(-cloneSize);
    return [...clonedTail, ...endingSoon, ...clonedHead];
  }, [endingSoon, cloneSize]);

  const getSlideWidthWithGap = () => {
    const slider = endingSoonRef.current;
    if (!slider) return 0;
    const slide = slider.querySelector(".home-ending-slide");
    if (!slide) return 0;
    const styles = window.getComputedStyle(slider);
    const gap = parseFloat(styles.columnGap || styles.gap || "0") || 0;
    return slide.offsetWidth + gap;
  };

  const setProgrammaticScrolling = () => {
    programmaticScrollRef.current = true;
    if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = setTimeout(() => { programmaticScrollRef.current = false; }, 650);
  };

  const scrollToVirtualIndex = (virtualIndex, behavior = "smooth") => {
    const slider = endingSoonRef.current;
    const step = getSlideWidthWithGap();
    if (!slider || !step || !endingSoon.length) return;
    setProgrammaticScrolling();
    slider.scrollTo({ left: step * virtualIndex, behavior });
  };

  const scrollToRealIndex = (realIndex, behavior = "smooth") => {
    if (!endingSoon.length) return;
    const current = endingSoonIndex;
    const normalized = ((realIndex % endingSoon.length) + endingSoon.length) % endingSoon.length;
    if (normalized !== current) {
      const forwardDistance = (normalized - current + endingSoon.length) % endingSoon.length;
      const backwardDistance = (current - normalized + endingSoon.length) % endingSoon.length;
      setDotDirection(forwardDistance <= backwardDistance ? "next" : "prev");
    }
    setEndingSoonIndex(normalized);
    scrollToVirtualIndex(cloneSize + normalized, behavior);
  };

  const normalizeAfterScroll = () => {
    const slider = endingSoonRef.current;
    const step = getSlideWidthWithGap();
    if (!slider || !step || !endingSoon.length) return;
    const virtualIndex = Math.round(slider.scrollLeft / step);
    let realIndex = virtualIndex - cloneSize;
    if (realIndex < 0) { realIndex = endingSoon.length + realIndex; scrollToRealIndex(realIndex, "auto"); return; }
    if (realIndex >= endingSoon.length) { realIndex = realIndex - endingSoon.length; scrollToRealIndex(realIndex, "auto"); return; }
    scrollToRealIndex(realIndex, "smooth");
  };

  const stopAutoSlide = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = null;
  };

  const startAutoSlide = () => {
    stopAutoSlide();
    if (endingSoon.length <= 1) return;
    autoTimerRef.current = setInterval(() => {
      setEndingSoonIndex((prev) => {
        const next = (prev + 1) % endingSoon.length;
        setDotDirection("next");
        scrollToVirtualIndex(cloneSize + next, "smooth");
        return next;
      });
    }, 4000);
  };

  const pauseAutoAfterManual = () => {
    stopAutoSlide();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => { startAutoSlide(); }, 20000);
  };

  useEffect(() => {
    const slider = endingSoonRef.current;
    if (!slider || !endingSoon.length) return;
    requestAnimationFrame(() => { scrollToVirtualIndex(cloneSize + endingSoonIndex, "auto"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endingSoonSlides.length, cardsPerView, endingSoon.length]);

  useEffect(() => {
    startAutoSlide();
    return () => {
      stopAutoSlide();
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
      if (programmaticTimerRef.current) clearTimeout(programmaticTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endingSoon.length, cardsPerView, cloneSize]);

  const handleEndingSoonScroll = () => {
    if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current);
    scrollEndTimerRef.current = setTimeout(() => {
      if (!isDraggingRef.current && !programmaticScrollRef.current) normalizeAfterScroll();
    }, 260);
  };

  const handlePointerDown = (clientX) => {
    const slider = endingSoonRef.current;
    if (!slider) return;
    pauseAutoAfterManual();
    isDraggingRef.current = true;
    dragMovedRef.current = false;
    suppressClickRef.current = false;
    dragStartXRef.current = clientX;
    dragStartScrollRef.current = slider.scrollLeft;
    slider.classList.add("dragging");
  };

  const handlePointerMove = (clientX) => {
    const slider = endingSoonRef.current;
    if (!slider || !isDraggingRef.current) return;
    const diff = clientX - dragStartXRef.current;
    if (Math.abs(diff) > 8) { dragMovedRef.current = true; suppressClickRef.current = true; }
    slider.scrollLeft = dragStartScrollRef.current - diff;
  };

  const handlePointerUp = () => {
    const slider = endingSoonRef.current;
    if (!slider || !isDraggingRef.current) return;
    isDraggingRef.current = false;
    slider.classList.remove("dragging");
    if (dragMovedRef.current) {
      normalizeAfterScroll();
      pauseAutoAfterManual();
      setTimeout(() => { suppressClickRef.current = false; }, 120);
    }
  };

  const handleMouseDown = (e) => handlePointerDown(e.pageX);
  const handleMouseMove = (e) => { if (!isDraggingRef.current) return; e.preventDefault(); handlePointerMove(e.pageX); };
  const handleTouchStart = (e) => { const touch = e.touches?.[0]; if (!touch) return; handlePointerDown(touch.pageX); };
  const handleTouchMove = (e) => { const touch = e.touches?.[0]; if (!touch) return; handlePointerMove(touch.pageX); };

  const handleAuctionCardClick = (e, auctionId) => {
    if (suppressClickRef.current || dragMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      suppressClickRef.current = false;
      dragMovedRef.current = false;
      return;
    }
    openAuctionDetails(auctionId);
  };

  const renderFiveDots = () => {
    const dots = [-2, -1, 0, 1, 2];
    return dots.map((offset) => {
      const dotIndex = ((endingSoonIndex + offset) % endingSoon.length + endingSoon.length) % endingSoon.length;
      return (
        <button
          key={`${dotIndex}-${offset}-${endingSoonIndex}`}
          type="button"
          className={`home-ending-dot home-ending-dot-window ${offset === 0 ? "active" : ""} dot-offset-${offset + 2} dot-moving-${dotDirection}`}
          onClick={() => { scrollToRealIndex(endingSoonIndex + offset, "smooth"); pauseAutoAfterManual(); }}
          aria-label={`Go to slide ${dotIndex + 1}`}
        />
      );
    });
  };

  const recommendationsVisible = recommendations.length > 0;
  const scrollCategories = () => {
    if (!categoriesRef.current) return;
    categoriesRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Navbar />

      <style>{`
        .home-ending-soon-slider {
          scroll-behavior: smooth;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .home-ending-soon-slider::-webkit-scrollbar { display: none; }
        .home-ending-soon-slider.dragging {
          cursor: grabbing;
          scroll-behavior: auto;
          user-select: none;
        }
        .home-ending-card { cursor: pointer; user-select: none; }
        .home-ending-card img { pointer-events: none; user-select: none; }
        .home-ending-dots {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
          height: 18px;
          overflow: hidden;
        }
        .home-ending-dot {
          width: 10px;
          height: 10px;
          border: none;
          border-radius: 999px;
          padding: 0;
          background: #d3dce9;
          cursor: pointer;
          transition: width 0.28s ease, background 0.28s ease, opacity 0.28s ease, transform 0.28s ease;
        }
        .home-ending-dot.active { width: 24px; background: #0b4aa2; }
        .home-ending-dot-window.dot-offset-0,
        .home-ending-dot-window.dot-offset-4 { opacity: 0.65; transform: scale(0.82); }
        .home-ending-dot-window.dot-offset-1,
        .home-ending-dot-window.dot-offset-3 { opacity: 0.85; transform: scale(0.92); }
        .home-ending-dot-window.dot-moving-next { animation: dotSlideNext 0.25s ease; }
        .home-ending-dot-window.dot-moving-prev { animation: dotSlidePrev 0.25s ease; }
        @keyframes dotSlideNext {
          from { transform: translateX(12px) scale(0.85); opacity: 0.4; }
          to   { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes dotSlidePrev {
          from { transform: translateX(-12px) scale(0.85); opacity: 0.4; }
          to   { transform: translateX(0) scale(1); opacity: 1; }
        }

        .home-mini-card-hoverable { position: relative; }
        .home-fav-star-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.88);
          color: #d97706;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity 0.2s ease, transform 0.2s ease, background 0.15s;
          z-index: 4;
          backdrop-filter: blur(2px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .home-mini-card-hoverable:hover .home-fav-star-btn,
        .home-fav-star-btn--active {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }
        .home-fav-star-btn--active {
          background: #fef3c7 !important;
          color: #d97706 !important;
        }
        .home-fav-star-btn:hover {
          background: #fef3c7;
        }
        .home-fav-star-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6 !important;
        }
      `}</style>

      <div className="home">
        <div className="container">
          <div style={{ width: "100%", height: "150px", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <img src={icon2} className="img1" alt="logo" />
          </div>

          {loading ? (
            <HomeSkeleton />
          ) : (
            <>
              {endingSoon.length > 0 ? (
                <>
                  <SectionHeader title={t("home.endingSoon")} />
                  <div className="home-ending-soon-wrap">
                    <div
                      ref={endingSoonRef}
                      className="home-ending-soon-slider"
                      onScroll={handleEndingSoonScroll}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handlePointerUp}
                      onMouseLeave={handlePointerUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handlePointerUp}
                    >
                      {endingSoonSlides.map((item, index) => (
                        <div className="home-ending-slide" key={`${item.id}-${index}`}>
                          <div
                            className="home-ending-card"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleAuctionCardClick(e, item.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") openAuctionDetails(item.id); }}
                          >
                            <div className="home-ending-image-box">
                              <img src={item.image} alt={item.title} />
                              <span className="home-ending-timer">{getTimeLeft(item.endDate, t)}</span>
                            </div>
                            <div className="home-ending-body">
                              <h3>{item.title}</h3>
                              <p>{formatMoney(item.currentPrice)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {endingSoon.length > 1 ? (
                      <div className="home-ending-dots">{renderFiveDots()}</div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {categories.length > 0 ? (
                <>
                  <div ref={categoriesRef}>
                    <SectionHeader
                      title={t("home.categories")}
                      actionText={t("home.viewAll")}
                      onAction={scrollCategories}
                    />
                  </div>
                  <div className="home-categories-strip">
                    {categories.map((cat) => (
                      <div className="home-category-pill-card" key={cat.id}>
                        <img src={cat.image} alt={cat.name} />
                        <div className="home-category-pill-overlay">
                          <h3>{cat.name}</h3>
                          <p>{t("home.itemsCount", { count: cat.auctionCount })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              {trending.length > 0 ? (
                <>
                  <SectionHeader title={t("home.trendingNow")} />
                  <div className="home-auction-grid">
                    {trendingLoading
                      ? <p>{t("loading", "Loading...")}</p>
                      : trending.map((item) => (
                          <AuctionMiniCard
                            key={item.id}
                            item={item}
                            t={t}
                            onOpen={openAuctionDetails}
                            favIds={favIds}
                            onToggleFav={handleToggleFav}
                          />
                        ))
                    }
                  </div>
                  {/* ── CHANGED: only show pagination if more than one page ── */}
                  {trendingTotalPages > 1 && (
                    <Pagination
                      page={trendingPage}
                      totalPages={trendingTotalPages}
                      loading={trendingLoading}
                      onPrev={() => loadTrending(trendingPage - 1)}
                      onNext={() => loadTrending(trendingPage + 1)}
                      t={t}
                    />
                  )}
                </>
              ) : null}

              {recommendationsVisible ? (
                <>
                  <SectionHeader title={t("home.recommendations")} />
                  <div className="home-auction-grid home-auction-grid--recommendations">
                    {recommendations.map((item) => (
                      <AuctionMiniCard
                        key={item.id}
                        item={item}
                        t={t}
                        onOpen={openAuctionDetails}
                        favIds={favIds}
                        onToggleFav={handleToggleFav}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}