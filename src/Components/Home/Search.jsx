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

const btnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.18)",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const popoverStyle = (isArabic, width = 340) => ({
  position: "absolute",
  top: "calc(100% + 10px)",
  left: isArabic ? "auto" : 0,
  right: isArabic ? 0 : "auto",
  width,
  maxWidth: "92vw",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 14,
  background: "#fff",
  boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
  zIndex: 9999,
  overflow: "hidden",
  direction: isArabic ? "rtl" : "ltr",
});

function CheckRow({ label, checked, onChange, isArabic }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        cursor: "pointer",
      }}
    >
      <span style={{ fontWeight: 600 }}>{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 18,
          height: 18,
          cursor: "pointer",
          accentColor: "#0B3A82",
          marginLeft: isArabic ? 0 : 8,
          marginRight: isArabic ? 8 : 0,
        }}
      />
    </label>
  );
}

function AccordionSection({ title, open, onToggle, children }) {
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          background: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 900,
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        <span style={{ opacity: 0.85 }}>
          <ChevronIcon open={open} />
        </span>
      </button>

      {open && <div style={{ padding: "0 14px 10px 14px" }}>{children}</div>}
    </div>
  );
}

const getAuctionImage = (image) => {
  if (!image || typeof image !== "string") return "";

  const raw = image.trim();

  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("data:image/")) return raw;

  const cleaned = raw.replace(/\s/g, "");
  const looksLikeBase64 =
    cleaned.length > 20 &&
    /^[A-Za-z0-9+/=]+$/.test(cleaned) &&
    !cleaned.includes("{") &&
    !cleaned.includes("}");

  if (looksLikeBase64) {
    return `data:image/png;base64,${cleaned}`;
  }

  return "";
};

const getAuctionId = (item) => {
  return item?.auctionId || item?.AuctionId || item?.id || item?.Id || "";
};

const getStatusText = (status, t) => {
  switch (Number(status)) {
    case 1:
      return t("statusUpcoming") || "Upcoming";
    case 2:
      return t("statusActive") || "Active";
    case 3:
      return t("statusEndingSoon") || "Ending Soon";
    case 4:
      return t("statusFinished") || "Finished";
    default:
      return "-";
  }
};

const formatAuctionDate = (value, lang = "en") => {
  if (!value) return "-";

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPrice = (value) => {
  const amount = Number(value || 0);

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

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
    status: {
      upcoming: false,
      active: false,
      endingSoon: false,
      finished: false,
    },
    location: {
      cairo: false,
      alexandria: false,
      giza: false,
    },
    price: {
      min: "",
      max: "",
    },
  });

  const [sort, setSort] = useState({
    mostBids: false,
    nearest: true,
    priceDir: "",
  });

  useEffect(() => {
    document.title = t("searchTitle") || "Search";
  }, [t]);

  useEffect(() => {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = icon;
  }, []);

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

      setAllAuctions(Array.isArray(res?.data) ? res.data : []);
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
    const cleanQuery = String(searchTerm || "").trim();

    const timer = setTimeout(() => {
      loadAuctions(cleanQuery || DEFAULT_SEARCH_QUERY);
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
      list.sort((a, b) => {
        const dateA = new Date(a.displayDate || 0).getTime();
        const dateB = new Date(b.displayDate || 0).getTime();
        return dateA - dateB;
      });
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
    if (pageNumber > totalPages) {
      setPageNumber(totalPages);
    }
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
      status: {
        upcoming: false,
        active: false,
        endingSoon: false,
        finished: false,
      },
      location: {
        cairo: false,
        alexandria: false,
        giza: false,
      },
      price: {
        min: "",
        max: "",
      },
    });

    setPageNumber(1);
  };

  const setSingleSort = (key) => {
    setSort((prev) => ({
      ...prev,
      mostBids: false,
      nearest: false,
      priceDir: "",
      [key]: true,
    }));
  };

  const goDetails = (auctionId) => {
    if (!auctionId) return;
    navigate(`/auction-details?auctionId=${auctionId}`);
  };

  return (
    <>
      <Navbar />

      <div className="search" dir={isArabic ? "rtl" : "ltr"}>
        <div className="container" style={{ paddingTop: 12 }}>
          <h1 style={{ textAlign: "center" }}>{t("searchTitle") || "Search"}</h1>

          <div className="search-box">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              placeholder={t("searchPlaceholder") || "Search"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 12,
              direction: isArabic ? "rtl" : "ltr",
            }}
          >
            <div ref={filterRef} style={{ position: "relative" }}>
              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  setFilterOpen((v) => !v);
                  setSortOpen(false);
                }}
              >
                <TuneIcon />
                <span>{t("filter") || "Filter"}</span>
              </button>

              {filterOpen && (
                <div style={popoverStyle(isArabic, 340)}>
                  <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      {isArabic
                        ? t("filter") || "فلتر"
                        : (t("filter") || "Filter").toUpperCase()}
                    </div>
                  </div>

                  <AccordionSection
                    title={t("filterStatus") || "Status"}
                    open={filterSection === "status"}
                    onToggle={() =>
                      setFilterSection((s) => (s === "status" ? "" : "status"))
                    }
                  >
                    <CheckRow
                      label={t("statusUpcoming") || "Upcoming"}
                      checked={filters.status.upcoming}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          status: { ...p.status, upcoming: v },
                        }))
                      }
                    />

                    <CheckRow
                      label={t("statusActive") || "Active"}
                      checked={filters.status.active}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          status: { ...p.status, active: v },
                        }))
                      }
                    />

                    <CheckRow
                      label={t("statusEndingSoon") || "Ending Soon"}
                      checked={filters.status.endingSoon}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          status: { ...p.status, endingSoon: v },
                        }))
                      }
                    />

                    <CheckRow
                      label={t("statusFinished") || "Finished"}
                      checked={filters.status.finished}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          status: { ...p.status, finished: v },
                        }))
                      }
                    />
                  </AccordionSection>

                  <AccordionSection
                    title={t("filterLocation") || "Location"}
                    open={filterSection === "location"}
                    onToggle={() =>
                      setFilterSection((s) => (s === "location" ? "" : "location"))
                    }
                  >
                    <CheckRow
                      label={t("locationCairo") || "Cairo"}
                      checked={filters.location.cairo}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          location: { ...p.location, cairo: v },
                        }))
                      }
                    />

                    <CheckRow
                      label={t("locationAlexandria") || "Alexandria"}
                      checked={filters.location.alexandria}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          location: { ...p.location, alexandria: v },
                        }))
                      }
                    />

                    <CheckRow
                      label={t("locationGiza") || "Giza"}
                      checked={filters.location.giza}
                      isArabic={isArabic}
                      onChange={(v) =>
                        setFilters((p) => ({
                          ...p,
                          location: { ...p.location, giza: v },
                        }))
                      }
                    />
                  </AccordionSection>

                  <AccordionSection
                    title={t("sortPrice") || "Price"}
                    open={filterSection === "price"}
                    onToggle={() =>
                      setFilterSection((s) => (s === "price" ? "" : "price"))
                    }
                  >
                    <div style={{ display: "grid", gap: 10 }}>
                      <input
                        type="number"
                        placeholder={t("minPrice") || "Min price"}
                        value={filters.price.min}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            price: { ...p.price, min: e.target.value },
                          }))
                        }
                        className="form-control"
                      />

                      <input
                        type="number"
                        placeholder={t("maxPrice") || "Max price"}
                        value={filters.price.max}
                        onChange={(e) =>
                          setFilters((p) => ({
                            ...p,
                            price: { ...p.price, max: e.target.value },
                          }))
                        }
                        className="form-control"
                      />
                    </div>
                  </AccordionSection>

                  <div style={{ padding: 14, display: "grid", gap: 10 }}>
                    <button
                      type="button"
                      onClick={applyFilters}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "none",
                        background: "#0B3A82",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {t("applyFilters") || "Apply Filters"}
                    </button>

                    <button
                      type="button"
                      onClick={resetFilters}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "1px solid #d5dbe5",
                        background: "#fff",
                        color: "#0B3A82",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {t("reset") || "Reset"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div ref={sortRef} style={{ position: "relative" }}>
              <button
                type="button"
                style={btnStyle}
                onClick={() => {
                  setSortOpen((v) => !v);
                  setFilterOpen(false);
                }}
              >
                <TuneIcon />
                <span>{t("sort") || "Sort"}</span>
              </button>

              {sortOpen && (
                <div style={popoverStyle(isArabic, 340)}>
                  <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      {t("sortBy") || "Sort By"}
                    </div>
                  </div>

                  <div style={{ padding: "12px 14px" }}>
                    {[
                      ["mostBids", t("sortMostBids") || "Most Bids"],
                      ["nearest", t("sortNearest") || "Nearest"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 12,
                          padding: "10px 0",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{label}</span>

                        <input
                          type="checkbox"
                          checked={!!sort[key]}
                          onChange={() => setSingleSort(key)}
                          style={{
                            width: 18,
                            height: 18,
                            cursor: "pointer",
                            accentColor: "#0B3A82",
                          }}
                        />
                      </label>
                    ))}

                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => setSortPriceOpen((v) => !v)}
                        style={{
                          width: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          padding: "12px 0",
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 900,
                          textAlign: "left",
                        }}
                      >
                        <span>{t("sortPrice") || "Price"}</span>
                        <span style={{ opacity: 0.85 }}>
                          <ChevronIcon open={sortPriceOpen} />
                        </span>
                      </button>

                      {sortPriceOpen && (
                        <div style={{ paddingBottom: 10 }}>
                          <label
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              padding: "8px 0",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="priceDir"
                              checked={sort.priceDir === "highToLow"}
                              onChange={() =>
                                setSort({
                                  mostBids: false,
                                  nearest: false,
                                  priceDir: "highToLow",
                                })
                              }
                            />

                            <span style={{ fontWeight: 700 }}>
                              {t("highToLow") || "High To Low"}
                            </span>
                          </label>

                          <label
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              padding: "8px 0",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="priceDir"
                              checked={sort.priceDir === "lowToHigh"}
                              onChange={() =>
                                setSort({
                                  mostBids: false,
                                  nearest: false,
                                  priceDir: "lowToHigh",
                                })
                              }
                            />

                            <span style={{ fontWeight: 700 }}>
                              {t("lowToHigh") || "Low To High"}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={applySort}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: "none",
                        background: "#0B3A82",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      {t("sort") || "Sort"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

          {loading ? (
            <div className="text-center mt-4">{t("loading") || "Loading..."}</div>
          ) : (
            <>
              <div className="row g-4 mt-2">
                {displayedAuctions.map((item, idx) => {
                  const auctionId = getAuctionId(item);
                  const imageSrc = getAuctionImage(item?.image || item?.Image);

                  return (
                    <div key={auctionId || idx} className="col-12 col-md-6 col-lg-4">
                      <div
                        className="fav-card h-100"
                        role="button"
                        tabIndex={0}
                        onClick={() => goDetails(auctionId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") goDetails(auctionId);
                        }}
                      >
                        <div className="fav-image-box">
                          {imageSrc ? (
                            <img src={imageSrc} alt={item.title || "auction"} />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                minHeight: 210,
                                background: "#eef2f7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#8a94a6",
                                fontWeight: 800,
                              }}
                            >
                              {t("noImage", "No Image")}
                            </div>
                          )}
                        </div>

                        <div className="fav-content" dir="auto">
                          <span className="fav-item-id">
                            {t("itemId") || "Item ID"} #{auctionId}
                          </span>

                          <h3 className="fav-title">{item.title || "-"}</h3>

                          <div className="fav-info-row">
                            <i className="fa-solid fa-gavel" />
                            <span>
                              {(t("bidsCount") || "Bids")}: {item.totalBids || 0}
                            </span>
                          </div>

                          <div className="fav-info-row">
                            <i className="fa-solid fa-hourglass" />
                            <span>{getStatusText(item.status, t)}</span>
                          </div>

                          <div className="fav-info-row">
                            <i className="fa-regular fa-calendar"></i>
                            <span>{formatAuctionDate(item.displayDate, i18n.language)}</span>
                          </div>

                          <div className="fav-price">{formatPrice(item.displayPrice)}</div>

                          <div
                            className="fav-actions"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <button
                              className="btn btn-primary w-100"
                              type="button"
                              onClick={() => goDetails(auctionId)}
                            >
                              {t("viewDetails") || "View Details"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {displayedAuctions.length === 0 && (
                <div className="text-center mt-4" dir="auto">
                  <p className="text-muted">
                    {searchTerm.trim()
                      ? t("noResults") || "No auctions found"
                      : t("noResults") || "No auctions found"}
                  </p>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
                >
                  {t("previous") || "Previous"}
                </button>

                <span style={{ fontWeight: 700 }}>
                  {pageNumber} / {totalPages}
                </span>

                <button
                  type="button"
                  className="btn btn-outline-primary"
                  disabled={pageNumber >= totalPages}
                  onClick={() => setPageNumber((prev) => Math.min(totalPages, prev + 1))}
                >
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