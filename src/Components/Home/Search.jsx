import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import icon from "../../assets/2.png";
import Navbar from "../Sign-in/Navbar";
import { useTranslation } from "react-i18next";

import {
  AUCTION_CITY_IDS,
  AUCTION_SORT_BY,
  AUCTION_STATUS,
  DEFAULT_SEARCH_QUERY,
  searchAuctions,
} from "../../API/auctionFilters";

const FALLBACK_AUCTION_IMAGE =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop";

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

function TuneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="9" r="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="15" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function ChevronIcon({ open, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckRow({ label, checked, onChange, isArabic }) {
  return (
    <label className="auction-check-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={isArabic ? "auction-check-input rtl" : "auction-check-input"}
      />
    </label>
  );
}

function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div className="auction-accordion-section">
      <button type="button" onClick={onToggle} className="auction-accordion-btn">
        <span>{title}</span>
        <ChevronIcon open={open} />
      </button>

      {open && <div className="auction-accordion-body">{children}</div>}
    </div>
  );
}

function AuctionGridSkeleton() {
  return (
    <div className="home-auction-grid auction-skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div className="home-auction-mini-card auction-skeleton-card" key={i}>
          <div className="auction-skeleton-image auction-shimmer" />
          <div className="home-auction-mini-body">
            <div className="auction-skeleton-line auction-skeleton-line-sm auction-shimmer" />
            <div className="auction-skeleton-line auction-shimmer" />
            <div className="auction-skeleton-line auction-skeleton-line-md auction-shimmer" />
            <div className="auction-skeleton-line auction-skeleton-line-price auction-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

const getImageSrc = (image) => {
  if (!image) return FALLBACK_AUCTION_IMAGE;

  const raw = String(image).trim();
  if (!raw) return FALLBACK_AUCTION_IMAGE;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image")) return raw;

  return `data:image/png;base64,${raw}`;
};

const getAuctionId = (item) =>
  Number(item?.auctionId ?? item?.AuctionId ?? item?.id ?? item?.Id ?? 0);

const formatMoney = (value) => {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "$0";
  return `$${num.toLocaleString()}`;
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
  if (value === 1) return "statusUpcoming";
  if (value === 2) return "statusActive";
  if (value === 3) return "statusEndingSoon";
  if (value === 4) return "statusFinished";
  return "statusAuction";
};

const getStatusClass = (status) => {
  const value = Number(status || 0);
  if (value === 1) return "upcoming";
  if (value === 2) return "live";
  if (value === 3) return "ending";
  if (value === 4) return "finished";
  return "auction";
};

const normalizeAuctionCard = (item) => ({
  id: getAuctionId(item),
  title: String(item?.title ?? item?.Title ?? "Auction"),
  image: getImageSrc(item?.image ?? item?.Image),
  displayPrice: Number(item?.displayPrice ?? item?.DisplayPrice ?? item?.currentPrice ?? 0),
  displayDate: item?.displayDate ?? item?.DisplayDate ?? item?.endDate ?? item?.EndDate ?? "",
  totalBids: Number(item?.totalBids ?? item?.TotalBids ?? 0),
  status: Number(item?.status ?? item?.Status ?? 0),
  cityId: Number(item?.cityId ?? item?.CityId ?? 0),
});

function AuctionMiniCard({ item, t, onOpen }) {
  const statusKey = getStatusKey(item.status);

  return (
    <div
      className="home-auction-mini-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(item.id);
      }}
    >
      <div className="home-auction-mini-image-wrap">
        <img src={item.image} alt={item.title} className="home-auction-mini-image" />

        <span className={`home-badge home-badge--${getStatusClass(item.status)}`}>
          {t(statusKey, statusKey)}
        </span>
      </div>

      <div className="home-auction-mini-body">
        <div className="home-auction-mini-id">
          {t("home.lotNumber", { id: item.id }) || `#${item.id}`}
        </div>

        <h3 className="home-auction-mini-title">{item.title}</h3>

        <div className="home-auction-mini-meta">
          <span>{t("home.bidsCount", { count: item.totalBids }) || `${item.totalBids} bids`}</span>
          <span>{getTimeLeft(item.displayDate, t)}</span>
        </div>

        <div className="home-auction-mini-price">{formatMoney(item.displayPrice)}</div>
      </div>
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [searchTerm, setSearchTerm] = useState("");
  const [allAuctions, setAllAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 12;

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterSection, setFilterSection] = useState("");
  const [sortPriceOpen, setSortPriceOpen] = useState(false);

  const filterRef = useRef(null);
  const sortRef = useRef(null);

  useOutsideClick(filterRef, () => setFilterOpen(false));
  useOutsideClick(sortRef, () => setSortOpen(false));

  const [filters, setFilters] = useState({
    status: { upcoming: false, active: false, endingSoon: false, finished: false },
    location: { cairo: false, alexandria: false, giza: false },
    price: { min: "", max: "" },
  });

  const [sort, setSort] = useState({
    mostBids: false,
    nearest: true,
    priceDir: "",
  });

  useEffect(() => {
    document.title = t("searchTitle") || "Search";

    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, [t]);

  const selectedStatuses = useMemo(() => {
    const arr = [];
    if (filters.status.upcoming) arr.push(AUCTION_STATUS.UPCOMING);
    if (filters.status.active) arr.push(AUCTION_STATUS.ACTIVE);
    if (filters.status.endingSoon) arr.push(AUCTION_STATUS.ENDING_SOON);
    if (filters.status.finished) arr.push(AUCTION_STATUS.FINISHED);
    return arr;
  }, [filters.status]);

  const selectedCityIds = useMemo(() => {
    const arr = [];
    if (filters.location.cairo) arr.push(AUCTION_CITY_IDS.cairo);
    if (filters.location.alexandria) arr.push(AUCTION_CITY_IDS.alexandria);
    if (filters.location.giza) arr.push(AUCTION_CITY_IDS.giza);
    return arr;
  }, [filters.location]);

  const sortByValue = useMemo(() => {
    if (sort.mostBids) return AUCTION_SORT_BY.MOST_BIDS;
    if (sort.nearest) return AUCTION_SORT_BY.NEAREST;
    if (sort.priceDir === "highToLow") return AUCTION_SORT_BY.PRICE_HIGH_TO_LOW;
    if (sort.priceDir === "lowToHigh") return AUCTION_SORT_BY.PRICE_LOW_TO_HIGH;
    return "";
  }, [sort]);

  const loadAuctions = async (queryValue = "") => {
    const cleanQuery = String(queryValue || "").trim();
    const apiQuery = cleanQuery || DEFAULT_SEARCH_QUERY;

    try {
      setLoading(true);
      setError("");

      const res = await searchAuctions(apiQuery);
      const list = Array.isArray(res?.data) ? res.data : [];

      setAllAuctions(list.map(normalizeAuctionCard));
      setPageNumber(1);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.Message ||
          err?.response?.data?.title ||
          err?.message ||
          t("failedToLoadAuctions") ||
          "Failed to load auctions"
      );

      setAllAuctions([]);
      setPageNumber(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions(DEFAULT_SEARCH_QUERY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuctions(searchTerm.trim() || DEFAULT_SEARCH_QUERY);
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const filteredAndSortedAuctions = useMemo(() => {
    let list = [...allAuctions];

    if (selectedStatuses.length > 0) {
      list = list.filter((item) => selectedStatuses.includes(Number(item.status)));
    }

    if (selectedCityIds.length > 0) {
      list = list.filter((item) => {
        if (!item.cityId) return true;
        return selectedCityIds.includes(Number(item.cityId));
      });
    }

    const minPrice = filters.price.min !== "" ? Number(filters.price.min) : null;
    const maxPrice = filters.price.max !== "" ? Number(filters.price.max) : null;

    if (Number.isFinite(minPrice)) {
      list = list.filter((item) => Number(item.displayPrice || 0) >= minPrice);
    }

    if (Number.isFinite(maxPrice)) {
      list = list.filter((item) => Number(item.displayPrice || 0) <= maxPrice);
    }

    if (sortByValue === AUCTION_SORT_BY.MOST_BIDS) {
      list.sort((a, b) => Number(b.totalBids || 0) - Number(a.totalBids || 0));
    }

    if (sortByValue === AUCTION_SORT_BY.NEAREST) {
      list.sort(
        (a, b) =>
          new Date(a.displayDate || 0).getTime() - new Date(b.displayDate || 0).getTime()
      );
    }

    if (sortByValue === AUCTION_SORT_BY.PRICE_HIGH_TO_LOW) {
      list.sort((a, b) => Number(b.displayPrice || 0) - Number(a.displayPrice || 0));
    }

    if (sortByValue === AUCTION_SORT_BY.PRICE_LOW_TO_HIGH) {
      list.sort((a, b) => Number(a.displayPrice || 0) - Number(b.displayPrice || 0));
    }

    return list;
  }, [allAuctions, selectedStatuses, selectedCityIds, filters.price, sortByValue]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedAuctions.length / pageSize));

  const displayedAuctions = useMemo(() => {
    const safePage = Math.min(pageNumber, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedAuctions.slice(start, start + pageSize);
  }, [filteredAndSortedAuctions, pageNumber, totalPages]);

  useEffect(() => {
    if (pageNumber > totalPages) setPageNumber(totalPages);
  }, [pageNumber, totalPages]);

  const applyFilters = () => {
    setFilterOpen(false);
    setPageNumber(1);
  };

  const applySort = () => {
    setSortOpen(false);
    setPageNumber(1);
  };

  const resetFilters = () => {
    setFilters({
      status: { upcoming: false, active: false, endingSoon: false, finished: false },
      location: { cairo: false, alexandria: false, giza: false },
      price: { min: "", max: "" },
    });

    setPageNumber(1);
  };

  const setSingleSort = (key) => {
    setSort({
      mostBids: false,
      nearest: false,
      priceDir: "",
      [key]: true,
    });
  };

  const goDetails = (auctionId) => {
    if (!auctionId) return;
    navigate(`/auction-details?auctionId=${auctionId}`);
  };

  return (
    <>
      <Navbar />

      <div className="search" dir={isArabic ? "rtl" : "ltr"}>
        <div className="container search-page-container">
          <h1>{t("searchTitle") || "Search"}</h1>

          <div className="search-bar">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>

            <input
              type="text"
              placeholder={t("searchPlaceholder") || "Search"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="auction-toolbar">
            <div ref={filterRef} className="auction-popover-wrap">
              <button
                type="button"
                className="auction-toolbar-btn"
                onClick={() => {
                  setFilterOpen((v) => !v);
                  setSortOpen(false);
                }}
              >
                <TuneIcon />
                <span>{t("filter") || "Filter"}</span>
              </button>

              {filterOpen && (
                <div className="auction-popover">
                  <div className="auction-popover-title">
                    {(t("filter") || "Filter").toUpperCase()}
                  </div>

                  <AccordionSection
                    title={t("filterStatus") || "Status"}
                    open={filterSection === "status"}
                    onToggle={() => setFilterSection((s) => (s === "status" ? "" : "status"))}
                  >
                    <CheckRow label={t("statusUpcoming") || "Upcoming"} checked={filters.status.upcoming} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, status: { ...p.status, upcoming: v } }))} />
                    <CheckRow label={t("statusActive") || "Active"} checked={filters.status.active} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, status: { ...p.status, active: v } }))} />
                    <CheckRow label={t("statusEndingSoon") || "Ending Soon"} checked={filters.status.endingSoon} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, status: { ...p.status, endingSoon: v } }))} />
                    <CheckRow label={t("statusFinished") || "Finished"} checked={filters.status.finished} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, status: { ...p.status, finished: v } }))} />
                  </AccordionSection>

                  <AccordionSection
                    title={t("filterLocation") || "Location"}
                    open={filterSection === "location"}
                    onToggle={() => setFilterSection((s) => (s === "location" ? "" : "location"))}
                  >
                    <CheckRow label={t("locationCairo") || "Cairo"} checked={filters.location.cairo} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, location: { ...p.location, cairo: v } }))} />
                    <CheckRow label={t("locationAlexandria") || "Alexandria"} checked={filters.location.alexandria} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, location: { ...p.location, alexandria: v } }))} />
                    <CheckRow label={t("locationGiza") || "Giza"} checked={filters.location.giza} isArabic={isArabic} onChange={(v) => setFilters((p) => ({ ...p, location: { ...p.location, giza: v } }))} />
                  </AccordionSection>

                  <AccordionSection
                    title={t("sortPrice") || "Price"}
                    open={filterSection === "price"}
                    onToggle={() => setFilterSection((s) => (s === "price" ? "" : "price"))}
                  >
                    <div className="auction-field-grid">
                      <input type="number" placeholder={t("minPrice") || "Min price"} value={filters.price.min} onChange={(e) => setFilters((p) => ({ ...p, price: { ...p.price, min: e.target.value } }))} className="form-control auction-input" />
                      <input type="number" placeholder={t("maxPrice") || "Max price"} value={filters.price.max} onChange={(e) => setFilters((p) => ({ ...p, price: { ...p.price, max: e.target.value } }))} className="form-control auction-input" />
                    </div>
                  </AccordionSection>

                  <div className="auction-popover-actions">
                    <button type="button" onClick={applyFilters} className="auction-apply-btn">
                      {t("applyFilters") || "Apply Filters"}
                    </button>

                    <button type="button" onClick={resetFilters} className="auction-reset-btn">
                      {t("reset") || "Reset"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div ref={sortRef} className="auction-popover-wrap">
              <button
                type="button"
                className="auction-toolbar-btn"
                onClick={() => {
                  setSortOpen((v) => !v);
                  setFilterOpen(false);
                }}
              >
                <TuneIcon />
                <span>{t("sort") || "Sort"}</span>
              </button>

              {sortOpen && (
                <div className="auction-popover">
                  <div className="auction-popover-content">
                    {[
                      ["mostBids", t("sortMostBids") || "Most Bids"],
                      ["nearest", t("sortNearest") || "Nearest"],
                    ].map(([key, label]) => (
                      <label key={key} className="auction-check-row">
                        <span>{label}</span>
                        <input type="checkbox" checked={!!sort[key]} onChange={() => setSingleSort(key)} className="auction-check-input" />
                      </label>
                    ))}

                    <button
                      type="button"
                      onClick={() => setSortPriceOpen((v) => !v)}
                      className="auction-sort-price-btn"
                    >
                      <span>{t("sortPrice") || "Price"}</span>
                      <ChevronIcon open={sortPriceOpen} />
                    </button>

                    {sortPriceOpen && (
                      <div className="auction-radio-list">
                        <label>
                          <input type="radio" name="priceDirSearch" checked={sort.priceDir === "highToLow"} onChange={() => setSort({ mostBids: false, nearest: false, priceDir: "highToLow" })} />
                          <span>{t("highToLow") || "High To Low"}</span>
                        </label>

                        <label>
                          <input type="radio" name="priceDirSearch" checked={sort.priceDir === "lowToHigh"} onChange={() => setSort({ mostBids: false, nearest: false, priceDir: "lowToHigh" })} />
                          <span>{t("lowToHigh") || "Low To High"}</span>
                        </label>
                      </div>
                    )}

                    <button type="button" onClick={applySort} className="auction-apply-btn">
                      {t("sort") || "Sort"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

          {loading ? (
            <AuctionGridSkeleton />
          ) : (
            <>
              <div className="home-auction-grid auction-results-grid">
                {displayedAuctions.map((item) => (
                  <AuctionMiniCard key={item.id} item={item} t={t} onOpen={goDetails} />
                ))}
              </div>

              {displayedAuctions.length === 0 && (
                <div className="text-center mt-4">
                  <p className="text-muted">{t("noResults") || "No auctions found"}</p>
                </div>
              )}

              <div className="auction-pagination">
                <button type="button" className="btn btn-outline-primary" disabled={pageNumber <= 1} onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}>
                  {t("previous") || "Previous"}
                </button>

                <span>{pageNumber} / {totalPages}</span>

                <button type="button" className="btn btn-outline-primary" disabled={pageNumber >= totalPages} onClick={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}>
                  {t("next") || "Next"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}