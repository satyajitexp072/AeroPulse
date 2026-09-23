import React from "react";
import { FileSpreadsheet, Bot, ArrowRight, Filter, ShieldCheck, Database, ShoppingBag, LineChart, LayoutDashboard } from "lucide-react";

export const PipelineVisualizer = () => {
  const stages = [
    {
      id: "input",
      title: "Data Sources",
      items: [
        { name: "Static Excel (360 Obs)", status: "active", icon: <FileSpreadsheet size={13} /> },
        { name: "Live Scrapers (Planned)", status: "future", icon: <Bot size={13} /> },
      ],
    },
    {
      id: "norm",
      title: "Normalization (M5)",
      desc: "Date ISO, Lead T-Buckets, Comparable Fare, Deduplication MD5",
      icon: <Filter size={15} />,
      status: "active",
    },
    {
      id: "val",
      title: "Validation (M4)",
      desc: "IATA Master, ₹500–₹1L bounds, Availability checks",
      icon: <ShieldCheck size={15} />,
      status: "active",
    },
    {
      id: "db",
      title: "MongoDB (M3)",
      desc: "Idempotent collection with unique hash index",
      icon: <Database size={15} />,
      status: "active",
    },
    {
      id: "basket",
      title: "Fare Basket (M7)",
      desc: "72 Cells (Route × Cabin × Lead Time)",
      icon: <ShoppingBag size={15} />,
      status: "active",
    },
    {
      id: "index",
      title: "Price Index (M7)",
      desc: "Laspeyres Fixed-Base Formula (Base = 100)",
      icon: <LineChart size={15} />,
      status: "active",
    },
    {
      id: "ui",
      title: "Dashboard (M8)",
      desc: "Real-time visual monitoring & reporting",
      icon: <LayoutDashboard size={15} />,
      status: "active",
    },
  ];

  return (
    <div className="card pipeline-card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">SIH26056 End-to-End System Architecture</h2>
          <p className="card-subtitle">
            Convergent dual-input ingestion pipeline powering the statistical index
          </p>
        </div>
      </div>

      <div className="pipeline-flow-wrapper">
        {stages.map((stage, idx) => (
          <React.Fragment key={stage.id}>
            <div className={`pipeline-stage-box ${stage.status}`}>
              <div className="stage-top-row">
                <div className="stage-icon-circle">{stage.icon || <FileSpreadsheet size={13} />}</div>
                <span className="stage-num">0{idx + 1}</span>
              </div>

              <div className="stage-title">{stage.title}</div>

              {stage.items ? (
                <div className="stage-items-list">
                  {stage.items.map((item, i) => (
                    <div key={i} className={`stage-source-badge ${item.status}`}>
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="stage-desc">{stage.desc}</div>
              )}

              <div className="stage-status-badge">
                {stage.status === "active" ? "✓ Operational" : "⏳ Production Planned"}
              </div>
            </div>

            {idx < stages.length - 1 && (
              <div className="pipeline-arrow">
                <ArrowRight size={16} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
