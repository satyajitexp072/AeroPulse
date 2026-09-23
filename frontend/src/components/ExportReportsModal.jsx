import React, { useState } from "react";
import { Download, FileSpreadsheet, FileText, Code2, X, CheckCircle2, FileCheck } from "lucide-react";
import { API_BASE_URL } from "../services/indexApi";

export const ExportReportsModal = ({ isOpen, onClose }) => {
  const [sourceTypeFilter, setSourceTypeFilter] = useState("ALL");
  const [downloading, setDownloading] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  if (!isOpen) return null;

  const handleDownload = (endpoint, format, filename) => {
    setDownloading(`${endpoint}-${format}`);
    setDownloadSuccess(null);

    const baseUrl = `${API_BASE_URL}/export`;
    let url = `${baseUrl}/${endpoint}?format=${format}`;
    if (endpoint === "observations" && sourceTypeFilter !== "ALL") {
      url += `&sourceType=${sourceTypeFilter}`;
    }

    if (format === "json") {
      window.open(url, "_blank");
      setDownloading(null);
      setDownloadSuccess(`Opened JSON feed for ${endpoint}`);
      return;
    }

    // Direct browser download
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(null);
      setDownloadSuccess(`Downloaded ${filename} successfully`);
    }, 800);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card export-modal-card">
        <div className="modal-header">
          <div className="modal-title-row">
            <div className="modal-icon-box export-icon-box">
              <Download size={20} />
            </div>
            <div>
              <h2 className="modal-title">Export & MoSPI / CPI Reporting Engine (M12)</h2>
              <p className="modal-subtitle">
                Generate machine-readable datasets and official statistical audit workbooks
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body export-modal-body">
          {downloadSuccess && (
            <div className="export-success-banner">
              <CheckCircle2 size={16} />
              <span>{downloadSuccess}</span>
            </div>
          )}

          {/* Section 1: MoSPI Statistical Summary Report */}
          <div className="export-card primary-report-card">
            <div className="export-card-header">
              <div className="export-badge-row">
                <span className="export-tag-primary">OFFICIAL STATISTICAL FORMAT</span>
                <span className="export-tag-meta">7 Structured Sheets</span>
              </div>
              <h3 className="export-card-title">MoSPI / CPI Statistical Summary Report</h3>
              <p className="export-card-desc">
                Complete statistical workbook containing Executive Summary, 72-Cell Laspeyres Basket, Route and Cabin slices, Lead-time dynamics, and Data Quality validation compliance.
              </p>
            </div>
            <div className="export-btn-group">
              <button
                className="btn-export-excel"
                onClick={() => handleDownload("report", "xlsx", "MoSPI_Airfare_Index_Report.xlsx")}
                disabled={downloading !== null}
              >
                <FileSpreadsheet size={15} />
                <span>Download Multi-Tab Excel (.xlsx)</span>
              </button>
              <button
                className="btn-export-csv"
                onClick={() => handleDownload("report", "csv", "MoSPI_Airfare_Index_Summary.csv")}
                disabled={downloading !== null}
              >
                <FileText size={15} />
                <span>CSV Summary</span>
              </button>
              <button
                className="btn-export-json"
                onClick={() => handleDownload("report", "json", "MoSPI_Report.json")}
                disabled={downloading !== null}
              >
                <Code2 size={15} />
                <span>JSON API</span>
              </button>
            </div>
          </div>

          <div className="export-grid-2col">
            {/* Section 2: 72-Cell Stratified Basket */}
            <div className="export-card">
              <h4 className="export-sub-title">72-Cell Stratified Fare Basket</h4>
              <p className="export-card-desc">
                Full 6×2×6 stratified matrix with baseline price, current median price, price relatives, and cell weights.
              </p>
              <div className="export-btn-group">
                <button
                  className="btn-export-excel-sm"
                  onClick={() => handleDownload("basket", "xlsx", "Fare_Basket_72_Cells.xlsx")}
                  disabled={downloading !== null}
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel</span>
                </button>
                <button
                  className="btn-export-csv-sm"
                  onClick={() => handleDownload("basket", "csv", "Fare_Basket_72_Cells.csv")}
                  disabled={downloading !== null}
                >
                  <FileText size={13} />
                  <span>CSV</span>
                </button>
                <button
                  className="btn-export-json-sm"
                  onClick={() => handleDownload("basket", "json", "Fare_Basket.json")}
                  disabled={downloading !== null}
                >
                  <Code2 size={13} />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Section 3: Airfare Price Index */}
            <div className="export-card">
              <h4 className="export-sub-title">Price Index Calculation Summary</h4>
              <p className="export-card-desc">
                Current index level (Base = 100.00), coverage rate, and breakdown across all 72 basket cells.
              </p>
              <div className="export-btn-group">
                <button
                  className="btn-export-excel-sm"
                  onClick={() => handleDownload("index", "xlsx", "Airfare_Price_Index.xlsx")}
                  disabled={downloading !== null}
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel</span>
                </button>
                <button
                  className="btn-export-csv-sm"
                  onClick={() => handleDownload("index", "csv", "Airfare_Price_Index.csv")}
                  disabled={downloading !== null}
                >
                  <FileText size={13} />
                  <span>CSV</span>
                </button>
                <button
                  className="btn-export-json-sm"
                  onClick={() => handleDownload("index", "json", "Airfare_Index.json")}
                  disabled={downloading !== null}
                >
                  <Code2 size={13} />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: Granular Observations */}
          <div className="export-card">
            <div className="export-filter-row">
              <div>
                <h4 className="export-sub-title">Granular Fare Observations</h4>
                <p className="export-card-desc">
                  Individual normalized records with split taxes, fuel surcharge, airport fees, and provenance.
                </p>
              </div>
              <div className="source-filter-selector">
                <label className="filter-label">Filter Source:</label>
                <select
                  className="filter-select"
                  value={sourceTypeFilter}
                  onChange={(e) => setSourceTypeFilter(e.target.value)}
                >
                  <option value="ALL">All Observations (372)</option>
                  <option value="STATIC">STATIC Research Dataset (358 Excel Rows)</option>
                  <option value="DYNAMIC">DYNAMIC Live Scraped (Multi-Source)</option>
                </select>
              </div>
            </div>
            <div className="export-btn-group">
              <button
                className="btn-export-excel"
                onClick={() => handleDownload("observations", "xlsx", `Fare_Observations_${sourceTypeFilter}.xlsx`)}
                disabled={downloading !== null}
              >
                <FileSpreadsheet size={14} />
                <span>Download Observations Excel (.xlsx)</span>
              </button>
              <button
                className="btn-export-csv"
                onClick={() => handleDownload("observations", "csv", `Fare_Observations_${sourceTypeFilter}.csv`)}
                disabled={downloading !== null}
              >
                <FileText size={14} />
                <span>CSV</span>
              </button>
              <button
                className="btn-export-json"
                onClick={() => handleDownload("observations", "json", `Fare_Observations_${sourceTypeFilter}.json`)}
                disabled={downloading !== null}
              >
                <Code2 size={14} />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer export-modal-footer">
          <div className="export-footer-info">
            <FileCheck size={14} />
            <span>Read-only exports generated directly from canonical MongoDB models without data mutation.</span>
          </div>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
