import { useState, useMemo, useEffect } from "react";
import FindingsFilterBar from "./FindingsFilterBar";

/**
 * REVERSION NOTE:
 * To revert back to the original fixed list without dropdown filters,
 * simply change ENABLE_DROPDOWN_FILTERS to false, or remove FindingsFilterBar.
 */
const ENABLE_DROPDOWN_FILTERS = true;

/**
 * Categorize findings into Critical, Relevant, and Background tiers.
 */
export function categorizeFindings(items = [], excludedSummary = "") {
  const critical = [];
  const relevant = [];
  const background = [];

  const isBackgroundItem = (item) => {
    if (item.tier === "background" || item.isBackground) return true;
    if (item.category && item.category.toLowerCase().includes("back")) return true;
    const text = `${item.point || ""} ${item.relevance_reason || ""}`.toLowerCase();
    return (
      text.includes("routine checkup") ||
      text.includes("routine visit") ||
      text.includes("seasonal rhinitis") ||
      text.includes("childhood immunization") ||
      text.includes("baseline normal") ||
      text.includes("resolved") ||
      text.includes("background context") ||
      text.includes("non-contributory")
    );
  };

  items.forEach((item, idx) => {
    const findingWithId = {
      ...item,
      id: item.id || `finding-${idx}`,
      originalIndex: idx,
    };

    if (item.critical === true || item.tier === "critical" || item.category === "critical") {
      critical.push({ ...findingWithId, tier: "critical" });
    } else if (isBackgroundItem(item)) {
      background.push({ ...findingWithId, tier: "background" });
    } else {
      relevant.push({ ...findingWithId, tier: "relevant" });
    }
  });

  // If background category has no direct items in relevant_context, but excludedSummary was provided,
  // expose a synthesized background point representing the filtered clinical noise.
  if (background.length === 0 && excludedSummary && typeof excludedSummary === "string" && excludedSummary.trim().length > 0) {
    background.push({
      id: "finding-bg-excluded",
      point: "Documented routine history & baseline clinical noise filtered from acute alerts",
      source: "EHR Noise Filter",
      relevance_reason: excludedSummary,
      critical: false,
      isBackground: true,
      tier: "background",
      originalIndex: -1,
    });
  }

  return { critical, relevant, background };
}

export default function SupportingFindingsSection({
  items = [],
  totalCount = 0,
  patientName = "",
  metrics = {},
  onSelectSource,
  excludedSummary = "",
}) {
  const [expandedItems, setExpandedItems] = useState({});
  const [openDropdown, setOpenDropdown] = useState(null); // 'critical' | 'relevant' | 'background' | null
  const [selectedIds, setSelectedIds] = useState([]); // array of selected item IDs. Empty = show all by default
  const [modes, setModes] = useState({
    critical: "multi",
    relevant: "multi",
    background: "multi",
  });

  // Categorize incoming items
  const categorized = useMemo(() => {
    return categorizeFindings(items, excludedSummary);
  }, [items, excludedSummary]);

  // Flatten all categorized items so synthesized background findings can also render
  const allFindings = useMemo(() => {
    return [
      ...categorized.critical,
      ...categorized.relevant,
      ...categorized.background,
    ];
  }, [categorized]);

  // Reset filter selection when patient or items change
  useEffect(() => {
    setSelectedIds([]);
    setOpenDropdown(null);
  }, [items, patientName]);

  // Determine visible items: selecting none shows all by default
  const visibleItems = useMemo(() => {
    if (!ENABLE_DROPDOWN_FILTERS || selectedIds.length === 0) {
      return allFindings.length > 0 ? allFindings : items;
    }
    const selectedSet = new Set(selectedIds);
    return allFindings.filter((item) => selectedSet.has(item.id));
  }, [selectedIds, allFindings, items]);

  const toggleExpand = (idOrIdx) => {
    setExpandedItems((prev) => ({
      ...prev,
      [idOrIdx]: !prev[idOrIdx],
    }));
  };

  // Toggle selection of a single item
  const handleToggleSelect = (itemId, category, mode) => {
    if (mode === "single") {
      setSelectedIds((prev) => (prev.length === 1 && prev[0] === itemId ? [] : [itemId]));
    } else {
      setSelectedIds((prev) => {
        if (prev.includes(itemId)) {
          return prev.filter((id) => id !== itemId);
        } else {
          return [...prev, itemId];
        }
      });
    }
  };

  // Select all or deselect all items in a category (Multi-select mode)
  const handleSelectAllCategory = (categoryKey) => {
    const catItemIds = (categorized[categoryKey] || []).map((it) => it.id);
    if (catItemIds.length === 0) return;

    setSelectedIds((prev) => {
      const allSelected = catItemIds.every((id) => prev.includes(id));
      if (allSelected) {
        // Deselect all from this category
        return prev.filter((id) => !catItemIds.includes(id));
      } else {
        // Add all from this category
        const combined = new Set([...prev, ...catItemIds]);
        return Array.from(combined);
      }
    });
  };

  // Switch mode between single-select and multi-select for a category
  const handleToggleMode = (categoryKey, newMode) => {
    setModes((prev) => ({ ...prev, [categoryKey]: newMode }));
    if (newMode === "single") {
      const catItemIds = (categorized[categoryKey] || []).map((it) => it.id);
      setSelectedIds((prev) => {
        const inCat = prev.filter((id) => catItemIds.includes(id));
        if (inCat.length > 1) {
          // Keep only the first selected item in this category
          const keepOne = inCat[0];
          return [...prev.filter((id) => !catItemIds.includes(id)), keepOne];
        }
        return prev;
      });
    }
  };

  // Reset all filters (show all by default)
  const handleResetAll = () => {
    setSelectedIds([]);
    setOpenDropdown(null);
  };

  return (
    <div className="supporting-findings-container" role="region" aria-label="Supporting Clinical Findings">
      {/* Section Header */}
      <div className="context-header">
        <div className="context-header-title">
          <span>Supporting Clinical Findings</span>
          <span className="context-count-pill">{totalCount || allFindings.length} Points</span>
        </div>
        <div className="context-header-meta">
          <span
            className="context-verified-indicator"
            title="Deterministic Chart Verification: Extracted clinical points deterministically verified against EHR encounters"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>Verified</span>
          </span>
        </div>
      </div>

      {/* 3 Dropdown Filter Menus: Critical, Relevant, and Background */}
      {ENABLE_DROPDOWN_FILTERS && (
        <FindingsFilterBar
          categorized={categorized}
          selectedIds={selectedIds}
          modes={modes}
          openDropdown={openDropdown}
          onToggleDropdown={(catKey) => setOpenDropdown((prev) => (prev === catKey ? null : catKey))}
          onCloseDropdown={() => setOpenDropdown(null)}
          onToggleSelect={handleToggleSelect}
          onSelectAllCategory={handleSelectAllCategory}
          onResetAll={handleResetAll}
          onToggleMode={handleToggleMode}
          totalCount={allFindings.length}
          filteredCount={visibleItems.length}
        />
      )}

      {/* Clean Bullet Feed (Minimalist Scannable List from Task 4) */}
      <div className="findings-bullet-list">
        {visibleItems.length === 0 ? (
          <div className="findings-empty-filter-state">
            <p>No clinical findings match the active filter criteria.</p>
            <button
              type="button"
              className="btn-clear-filter-state"
              onClick={handleResetAll}
            >
              Show All Findings
            </button>
          </div>
        ) : (
          visibleItems.map((item, i) => {
            const isCritical = item.critical === true || item.tier === "critical";
            const isBackground = item.isBackground === true || item.tier === "background";
            const severity = isCritical ? "critical" : isBackground ? "background" : "relevant";
            const itemKey = item.id || i;
            const isExpanded = !!expandedItems[itemKey];

            return (
              <div
                key={itemKey}
                className={`finding-bullet-item ${severity}`}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div
                  className="finding-bullet-row"
                  onClick={() => item.relevance_reason && toggleExpand(itemKey)}
                >
                  <div className="finding-left-content">
                    <span
                      className={`finding-severity-dot ${severity}`}
                      title={
                        isCritical
                          ? "Critical Safety Finding"
                          : isBackground
                          ? "Background Clinical Context"
                          : "Relevant Clinical History"
                      }
                    />
                    <span className="finding-summary-text">
                      {item.point}
                    </span>
                  </div>

                  <div className="finding-right-actions">
                    {item.source && (
                      <button
                        type="button"
                        className="mini-source-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSource && onSelectSource(item.source);
                        }}
                        title={`View & jump to source note: ${item.source}`}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>{item.source}</span>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M7 17l9.2-9.2M17 17V7H7" />
                        </svg>
                      </button>
                    )}

                    {item.relevance_reason && (
                      <button
                        type="button"
                        className={`finding-expand-toggle-btn ${isExpanded ? "expanded" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(itemKey);
                        }}
                        aria-expanded={isExpanded}
                      >
                        <span>{isExpanded ? "Hide Context" : "Clinical Context"}</span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 140ms ease",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && item.relevance_reason && (
                  <div className="finding-expanded-context">
                    <span className="expanded-context-lead">
                      {isBackground ? "Background Note:" : "Clinical Context:"}
                    </span>
                    <span className="expanded-context-body">{item.relevance_reason}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
