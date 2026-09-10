import { useEffect, useRef } from "react";

/**
 * FindingsFilterBar
 * Renders 3 dropdown filter menus: "Critical", "Relevant", and "Background"
 * Each dropdown supports single-select and multi-select mode toggle.
 * When nothing is selected, all findings are shown by default.
 * Designed to be modular and cleanly reversible.
 */
export default function FindingsFilterBar({
  categorized = { critical: [], relevant: [], background: [] },
  selectedIds = [],
  modes = { critical: "multi", relevant: "multi", background: "multi" },
  openDropdown = null,
  onToggleDropdown,
  onCloseDropdown,
  onToggleSelect,
  onSelectAllCategory,
  onResetAll,
  onToggleMode,
  totalCount = 0,
  filteredCount = 0,
}) {
  const barRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    function handleClickOutside(e) {
      if (barRef.current && !barRef.current.contains(e.target)) {
        onCloseDropdown && onCloseDropdown();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown, onCloseDropdown]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && openDropdown) {
        onCloseDropdown && onCloseDropdown();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [openDropdown, onCloseDropdown]);

  const categories = [
    {
      key: "critical",
      label: "Critical",
      items: categorized.critical || [],
      dotClass: "dot-critical",
    },
    {
      key: "relevant",
      label: "Relevant",
      items: categorized.relevant || [],
      dotClass: "dot-relevant",
    },
    {
      key: "background",
      label: "Background",
      items: categorized.background || [],
      dotClass: "dot-background",
    },
  ];

  return (
    <div className="findings-filter-bar" ref={barRef} role="toolbar" aria-label="Findings category filters">
      <div className="filter-dropdowns-group">
        {categories.map(({ key, label, items, dotClass }) => {
          const isOpen = openDropdown === key;
          const currentMode = modes[key] || "multi";
          const count = items.length;

          // Count how many items in this category are selected
          const itemIds = items.map((it) => it.id);
          const selectedInCat = itemIds.filter((id) => selectedIds.includes(id));
          const hasSelected = selectedInCat.length > 0;
          const isAllSelected = count > 0 && selectedInCat.length === count;

          return (
            <div key={key} className="findings-dropdown-wrapper">
              <button
                type="button"
                className={`findings-dropdown-trigger ${key} ${isOpen ? "open" : ""} ${hasSelected ? "active" : ""}`}
                onClick={() => onToggleDropdown(key)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                id={`filter-btn-${key}`}
                title={`Filter by ${label} findings (${currentMode === "multi" ? "Multi-select" : "Single-select"})`}
              >
                <span className={`filter-cat-dot ${dotClass}`} />
                <span className="filter-cat-label">{label}</span>
                <span className="filter-count-badge">{count}</span>
                {hasSelected && (
                  <span className="filter-selected-pill">
                    {selectedInCat.length}
                  </span>
                )}
                <svg
                  className={`filter-chevron ${isOpen ? "open" : ""}`}
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && (
                <div
                  className={`findings-dropdown-popover ${key}`}
                  role="menu"
                  aria-labelledby={`filter-btn-${key}`}
                >
                  {/* Popover Header with Title & Quick Actions */}
                  <div className="dropdown-popover-header">
                    <div className="popover-title-row">
                      <div className="popover-title">
                        <span className={`filter-cat-dot ${dotClass}`} />
                        <strong>{label} Findings</strong>
                        <span className="popover-count-text">({count} total)</span>
                      </div>

                      {count > 0 && currentMode === "multi" && (
                        <button
                          type="button"
                          className="popover-action-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAllCategory(key);
                          }}
                        >
                          {isAllSelected ? "Deselect All" : "Select All"}
                        </button>
                      )}
                    </div>

                    {/* Single vs Multi-Select Mode Toggle */}
                    <div className="popover-mode-switch">
                      <span className="mode-label">Selection Mode:</span>
                      <div className="mode-pill-group" role="radiogroup" aria-label={`${label} selection mode`}>
                        <button
                          type="button"
                          className={`mode-pill ${currentMode === "multi" ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleMode(key, "multi");
                          }}
                          role="radio"
                          aria-checked={currentMode === "multi"}
                          title="Multi-select: select multiple findings using checkboxes"
                        >
                          Multi
                        </button>
                        <button
                          type="button"
                          className={`mode-pill ${currentMode === "single" ? "active" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleMode(key, "single");
                          }}
                          role="radio"
                          aria-checked={currentMode === "single"}
                          title="Single-select: select one finding at a time"
                        >
                          Single
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="dropdown-popover-list" role="group">
                    {items.length === 0 ? (
                      <div className="dropdown-empty-state">
                        No {label.toLowerCase()} findings recorded for this query.
                      </div>
                    ) : (
                      items.map((item) => {
                        const isChecked = selectedIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            className={`dropdown-option-item ${isChecked ? "checked" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(item.id, key, currentMode);
                            }}
                            role={currentMode === "single" ? "radio" : "checkbox"}
                            aria-checked={isChecked}
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === " " || e.key === "Enter") {
                                e.preventDefault();
                                onToggleSelect(item.id, key, currentMode);
                              }
                            }}
                          >
                            <input
                              type={currentMode === "single" ? "radio" : "checkbox"}
                              className="dropdown-checkbox"
                              checked={isChecked}
                              onChange={() => {}} // Controlled by onClick on parent container
                              aria-label={item.point}
                              tabIndex={-1}
                            />
                            <div className="dropdown-option-content">
                              <span className="dropdown-option-text">{item.point}</span>
                              {item.source && (
                                <span className="dropdown-option-source">
                                  {item.source}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Popover Footer Info */}
                  <div className="dropdown-popover-footer">
                    <span>
                      {currentMode === "multi"
                        ? `${selectedInCat.length} of ${count} selected`
                        : selectedInCat.length > 0
                        ? "1 finding selected"
                        : "Click finding to select"}
                    </span>
                    {selectedInCat.length > 0 && (
                      <button
                        type="button"
                        className="popover-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Clear items in this category
                          itemIds.forEach((id) => {
                            if (selectedIds.includes(id)) {
                              onToggleSelect(id, key, "multi");
                            }
                          });
                        }}
                      >
                        Clear {label}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter status & Reset All */}
      <div className="filter-summary-meta">
        {selectedIds.length > 0 ? (
          <div className="filter-active-tag">
            <span className="filter-count-info">
              Showing <strong>{filteredCount}</strong> of {totalCount} findings
            </span>
            <button
              type="button"
              className="btn-reset-filters"
              onClick={onResetAll}
              title="Reset all filters to show all findings (default)"
            >
              <span>Show All</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ) : (
          <span className="filter-all-default-hint">
            Showing all findings by default
          </span>
        )}
      </div>
    </div>
  );
}
