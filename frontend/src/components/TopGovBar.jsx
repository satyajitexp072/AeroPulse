import React from "react";
import { Eye } from "lucide-react";

/**
 * TopGovBar Component
 * Institutional Indian Public Data Platform Utility Bar
 * Provides accessibility controls, text scaling (A-, A, A+), skip to main content, and language indicators.
 */
export const TopGovBar = ({
  fontSize = "normal",
  onFontSizeChange,
  highContrast = false,
  onToggleContrast,
  currentLanguage = "en",
  onLanguageChange,
}) => {
  return (
    <div className={"gov-top-utility-bar " + (highContrast ? "high-contrast" : "")} role="region" aria-label="Utility and Accessibility Bar">
      <div className="gov-top-inner">
        {/* Skip to Main Content Link for Keyboard Accessibility */}
        <a href="#main-content" className="gov-skip-link">
          Skip to main content
        </a>

        {/* Left: Neutral Institutional Label with Subtle Tricolor Accent */}
        <div className="gov-top-left">
          <div className="gov-tricolor-strip" aria-hidden="true">
            <span className="strip-saffron" />
            <span className="strip-white" />
            <span className="strip-green" />
          </div>
          <span className="gov-top-title">
            भारतीय सार्वजनिक डेटा मंच • Digital Public Data Platform
          </span>
          <span className="gov-top-sub">SIH26056 Airfare Intelligence Initiative</span>
        </div>

        {/* Right: Accessibility Controls & Language Selector */}
        <div className="gov-top-right">
          {/* Text Resizing Controls */}
          <div className="gov-font-resizer" role="group" aria-label="Text size controls">
            <button
              type="button"
              className={"btn-resizer " + (fontSize === "small" ? "active" : "")}
              onClick={() => onFontSizeChange && onFontSizeChange("small")}
              title="Decrease text size (A-)"
              aria-label="Decrease text size"
            >
              A-
            </button>
            <button
              type="button"
              className={"btn-resizer " + (fontSize === "normal" ? "active" : "")}
              onClick={() => onFontSizeChange && onFontSizeChange("normal")}
              title="Default text size (A)"
              aria-label="Default text size"
            >
              A
            </button>
            <button
              type="button"
              className={"btn-resizer " + (fontSize === "large" ? "active" : "")}
              onClick={() => onFontSizeChange && onFontSizeChange("large")}
              title="Increase text size (A+)"
              aria-label="Increase text size"
            >
              A+
            </button>
          </div>

          <div className="gov-utility-divider" aria-hidden="true" />

          {/* High Contrast Toggle */}
          <button
            type="button"
            className={"btn-contrast-toggle " + (highContrast ? "active" : "")}
            onClick={onToggleContrast}
            title={highContrast ? "Switch to standard contrast" : "Switch to high contrast"}
            aria-pressed={highContrast}
          >
            <Eye size={13} aria-hidden="true" />
            <span>{highContrast ? "Standard Contrast" : "Accessibility"}</span>
          </button>

          <div className="gov-utility-divider" aria-hidden="true" />

          {/* Language Indicator */}
          <div className="gov-lang-selector" role="group" aria-label="Language selection">
            <button
              type="button"
              className={"btn-lang " + (currentLanguage === "en" ? "active" : "")}
              onClick={() => onLanguageChange && onLanguageChange("en")}
              aria-label="English language selected"
            >
              English
            </button>
            <span className="lang-sep" aria-hidden="true">|</span>
            <button
              type="button"
              className={"btn-lang " + (currentLanguage === "hi" ? "active" : "")}
              onClick={() => onLanguageChange && onLanguageChange("hi")}
              aria-label="Hindi language selector"
            >
              हिंदी
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopGovBar;
