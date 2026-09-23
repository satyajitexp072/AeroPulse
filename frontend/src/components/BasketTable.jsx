import React, { useState, useMemo } from "react";
import { Filter, ArrowUpDown, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";

export const BasketTable = ({ basketCells }) => {
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [cabinFilter, setCabinFilter] = useState("ALL");
  const [leadFilter, setLeadFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState("route");
  const [sortOrder, setSortOrder] = useState("asc");
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  const routes = ["BLR-DEL", "BOM-BLR", "CCU-BOM", "DEL-BOM", "DEL-HYD", "MAA-BLR"];
  const leadBuckets = ["T-1", "T-3", "T-7", "T-15", "T-30", "T-60"];

  // Filter cells
  const filteredCells = useMemo(() => {
    if (!Array.isArray(basketCells)) return [];

    return basketCells.filter((cell) => {
      if (routeFilter !== "ALL" && cell.route !== routeFilter) return false;
      if (cabinFilter !== "ALL" && cell.cabinClass !== cabinFilter) return false;
      if (leadFilter !== "ALL" && cell.leadBucket !== leadFilter) return false;

      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const match =
          cell.route.toLowerCase().includes(q) ||
          cell.cabinClass.toLowerCase().includes(q) ||
          cell.leadBucket.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [basketCells, routeFilter, cabinFilter, leadFilter, searchQuery]);

  // Sort cells
  const sortedCells = useMemo(() => {
    return [...filteredCells].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) valA = 0;
      if (valB === null || valB === undefined) valB = 0;

      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredCells, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedCells.length / pageSize) || 1;
  const paginatedCells = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedCells.slice(start, start + pageSize);
  }, [sortedCells, currentPage, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleResetFilters = () => {
    setRouteFilter("ALL");
    setCabinFilter("ALL");
    setLeadFilter("ALL");
    setSearchQuery("");
    setCurrentPage(1);
  };

  return (
    <div className="card basket-table-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Representative Fare Basket (72 Cells)</h2>
          <p className="card-subtitle">
            Granular route × cabin × lead-time cells powering the Laspeyres index computation
          </p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="table-controls-bar">
        <div className="filters-row">
          <div className="filter-group">
            <span className="filter-lbl">Route:</span>
            <select
              className="filter-select"
              value={routeFilter}
              onChange={(e) => {
                setRouteFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Routes (6)</option>
              {routes.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-lbl">Cabin:</span>
            <select
              className="filter-select"
              value={cabinFilter}
              onChange={(e) => {
                setCabinFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Cabins</option>
              <option value="ECONOMY">Economy</option>
              <option value="BUSINESS">Business</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-lbl">Lead Time:</span>
            <select
              className="filter-select"
              value={leadFilter}
              onChange={(e) => {
                setLeadFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ALL">All Horizons (6)</option>
              {leadBuckets.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <button className="btn-secondary" onClick={handleResetFilters}>
            Reset Filters
          </button>
        </div>

        <div className="search-box-wrap">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search cells..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Basket Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("route")} className="sortable-th">
                <div className="th-content">
                  Route <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("cabinClass")} className="sortable-th">
                <div className="th-content">
                  Cabin <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("leadBucket")} className="sortable-th">
                <div className="th-content">
                  Lead Time <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("medianFare")} className="sortable-th numeric-th highlight-th">
                <div className="th-content right">
                  Median Comparable Fare (₹) <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("meanFare")} className="sortable-th numeric-th">
                <div className="th-content right">
                  Mean Fare (₹) <ArrowUpDown size={12} />
                </div>
              </th>
              <th className="numeric-th">Min / Max (₹)</th>
              <th onClick={() => handleSort("observationCount")} className="sortable-th numeric-th">
                <div className="th-content right">
                  Observations <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort("availabilityRate")} className="sortable-th numeric-th">
                <div className="th-content right">
                  Availability <ArrowUpDown size={12} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedCells.length > 0 ? (
              paginatedCells.map((cell, idx) => (
                <tr key={cell.cellKey || idx}>
                  <td>
                    <span className="route-cell-tag">{cell.route}</span>
                  </td>
                  <td>
                    <span className={`cabin-badge ${cell.cabinClass === "ECONOMY" ? "badge-eco" : "badge-biz"}`}>
                      {cell.cabinClass}
                    </span>
                  </td>
                  <td>
                    <span className="lead-tag">{cell.leadBucket}</span>
                  </td>
                  <td className="numeric-td highlight-cell">
                    <strong>₹{cell.medianFare ? cell.medianFare.toLocaleString("en-IN") : "—"}</strong>
                  </td>
                  <td className="numeric-td">
                    {cell.meanFare ? `₹${cell.meanFare.toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="numeric-td range-td">
                    {cell.minFare && cell.maxFare
                      ? `₹${cell.minFare.toLocaleString("en-IN")} – ₹${cell.maxFare.toLocaleString("en-IN")}`
                      : "—"}
                  </td>
                  <td className="numeric-td">
                    <span className="obs-pill">{cell.observationCount}</span>
                  </td>
                  <td className="numeric-td">
                    <span className={`avail-rate-tag ${cell.availabilityRate > 80 ? "high" : cell.availabilityRate > 50 ? "mid" : "low"}`}>
                      {cell.availabilityRate}%
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="empty-table-cell">
                  No matching basket cells found for selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="table-footer">
        <div className="table-counts-lbl">
          Showing <strong>{filteredCells.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{" "}
          <strong>{Math.min(currentPage * pageSize, filteredCells.length)}</strong> of{" "}
          <strong>{filteredCells.length}</strong> basket cells
        </div>

        <div className="pagination-controls">
          <div className="page-size-selector">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={72}>72 (All)</option>
            </select>
          </div>

          <div className="page-nav-btns">
            <button
              className="page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="page-indicator">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
