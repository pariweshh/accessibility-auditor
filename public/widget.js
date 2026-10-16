/**
 * Equivance — Embeddable Public Compliance & Accessibility Statement Widget
 * Zero-dependency, lightweight, Shadow-DOM isolated WCAG 2.2 AA conformance trigger & dialog.
 * 
 * Usage:
 * <script src="https://equivance.app/widget.js" data-scan-id="<SCAN_UUID>" data-position="bottom-right" async defer></script>
 */
(function () {
  "use strict";

  // Prevent double-initialization
  if (window.__EQUIVANCE_WIDGET_LOADED__) return;
  window.__EQUIVANCE_WIDGET_LOADED__ = true;

  // Locate the executing script tag
  const currentScript =
    document.currentScript ||
    document.querySelector("script[data-scan-id]") ||
    (function () {
      const scripts = document.querySelectorAll("script");
      for (let i = scripts.length - 1; i >= 0; i--) {
        if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
          return scripts[i];
        }
      }
      return null;
    })();

  if (!currentScript) {
    console.warn("[Equivance Widget] Unable to identify widget script tag.");
    return;
  }

  const scanId = currentScript.getAttribute("data-scan-id");
  if (!scanId) {
    console.warn("[Equivance Widget] Missing required attribute 'data-scan-id'.");
    return;
  }

  const position = currentScript.getAttribute("data-position") || "bottom-right";
  const theme = currentScript.getAttribute("data-theme") || "dark";
  const customColor = currentScript.getAttribute("data-color");
  const customLabel = currentScript.getAttribute("data-label");
  const contactOverride = currentScript.getAttribute("data-contact");

  // Derive API origin from script source URL
  let apiOrigin = "https://equivance.app";
  try {
    if (currentScript.src) {
      const parsed = new URL(currentScript.src);
      apiOrigin = parsed.origin;
    }
  } catch (e) {
    apiOrigin = window.location.origin;
  }

  // Create isolated container host
  const host = document.createElement("div");
  host.id = "equivance-compliance-widget";
  host.setAttribute("role", "region");
  host.setAttribute("aria-label", "Accessibility Statement Widget");

  function mountHost() {
    if (document.body) {
      if (!document.getElementById("equivance-compliance-widget")) {
        document.body.appendChild(host);
      }
    } else {
      document.addEventListener("DOMContentLoaded", function () {
        if (!document.getElementById("equivance-compliance-widget")) {
          document.body.appendChild(host);
        }
      });
    }
  }
  mountHost();

  const shadow = host.attachShadow({ mode: "open" });

  // Fetch widget metadata from API
  fetch(apiOrigin + "/api/widget/" + encodeURIComponent(scanId))
    .then(function (res) {
      if (!res.ok) {
        if (res.status === 403) {
          console.warn("[Equivance Widget] Widget embed requires an active Pro or Agency subscription.");
        } else if (res.status === 404) {
          console.warn("[Equivance Widget] Scan record not found or not completed.");
        }
        return null;
      }
      return res.json();
    })
    .then(function (data) {
      if (!data) return;
      initWidget(data);
    })
    .catch(function (err) {
      console.error("[Equivance Widget] Error loading widget data:", err);
    });

  function initWidget(data) {
    const isDark = theme !== "light";
    const brandColor = customColor || data.branding.color || "#4f46e5";
    const brandName = data.branding.name || "Equivance";
    const isWhiteLabel = Boolean(data.branding.whiteLabel);
    const score = data.score || 0;
    const scoreColor = score >= 90 ? "#10b981" : score >= 70 ? "#f59e0b" : "#f43f5e";

    const auditDateStr = data.auditDate
      ? new Date(data.auditDate).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "Recent";

    const barrierContactHref = contactOverride
      ? contactOverride.indexOf("@") !== -1 && contactOverride.indexOf("mailto:") === -1
        ? "mailto:" + contactOverride
        : contactOverride
      : "mailto:accessibility@" + (window.location.hostname.replace(/^www\./, "") || "website.com") + "?subject=Accessibility%20Barrier%20Report";

    // Stylesheet for Shadow DOM
    const style = document.createElement("style");
    style.textContent = `
      :host {
        --font-stack: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
        --accent: ${brandColor};
        --bg-main: ${isDark ? "#090d16" : "#ffffff"};
        --bg-card: ${isDark ? "#111827" : "#f8fafc"};
        --bg-hover: ${isDark ? "#1e293b" : "#f1f5f9"};
        --border-color: ${isDark ? "#1e293b" : "#e2e8f0"};
        --text-primary: ${isDark ? "#f8fafc" : "#0f172a"};
        --text-muted: ${isDark ? "#94a3b8" : "#64748b"};
        --text-dim: ${isDark ? "#64748b" : "#94a3b8"};
        font-family: var(--font-stack);
        -webkit-font-smoothing: antialiased;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      /* Floating Trigger Button */
      .widget-trigger {
        position: fixed;
        ${position.indexOf("bottom") !== -1 ? "bottom: 20px;" : "top: 20px;"}
        ${position.indexOf("left") !== -1 ? "left: 20px;" : "right: 20px;"}
        z-index: 2147483640;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--bg-main);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        padding: 8px 14px 8px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        text-decoration: none;
      }

      .widget-trigger:hover {
        transform: translateY(-2px);
        border-color: var(--accent);
        box-shadow: 0 14px 28px -4px rgba(0, 0, 0, 0.3);
      }

      .widget-trigger:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
      }

      .trigger-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--accent);
        color: #ffffff;
        flex-shrink: 0;
      }

      .trigger-icon svg {
        width: 14px;
        height: 14px;
      }

      .trigger-badge {
        display: inline-flex;
        align-items: center;
        padding: 2px 7px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        color: #ffffff;
        background: ${scoreColor};
      }

      /* Modal Dialog Overlay */
      .widget-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        z-index: 2147483645;
        display: none;
        align-items: flex-end;
        justify-content: ${position.indexOf("left") !== -1 ? "flex-start" : "flex-end"};
        padding: 20px;
        opacity: 0;
        transition: opacity 0.25s ease;
      }

      .widget-overlay.is-open {
        display: flex;
        opacity: 1;
      }

      /* Dialog Canvas */
      .widget-dialog {
        width: 100%;
        max-width: 400px;
        background: var(--bg-main);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        border-radius: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        transform: translateY(20px) scale(0.97);
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .widget-overlay.is-open .widget-dialog {
        transform: translateY(0) scale(1);
      }

      /* Header */
      .dialog-header {
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--bg-card);
      }

      .header-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .brand-logo-img {
        height: 24px;
        max-width: 90px;
        object-fit: contain;
      }

      .brand-title {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.01em;
      }

      .brand-subtitle {
        font-size: 10px;
        font-weight: 500;
        color: var(--text-muted);
      }

      .close-button {
        background: transparent;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 6px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s ease, color 0.15s ease;
      }

      .close-button:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .close-button:focus-visible {
        outline: 2px solid var(--accent);
      }

      /* Body Content */
      .dialog-body {
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .score-banner {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 14px 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .score-info h4 {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 2px;
      }

      .score-info p {
        font-size: 11px;
        color: var(--text-muted);
      }

      .score-circle {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: ${isDark ? "#0f172a" : "#f1f5f9"};
        border: 2px solid ${scoreColor};
        width: 48px;
        height: 48px;
        border-radius: 50%;
        font-size: 14px;
        font-weight: 800;
        color: ${scoreColor};
      }

      .score-circle span {
        font-size: 9px;
        font-weight: 600;
        margin-top: -3px;
      }

      /* POUR Principles Grid */
      .pour-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .pour-card {
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 10px 12px;
      }

      .pour-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }

      .pour-name {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-primary);
      }

      .pour-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 1px 5px;
        border-radius: 4px;
      }

      .pour-pass {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
      }

      .pour-review {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
      }

      .pour-desc {
        font-size: 9.5px;
        color: var(--text-muted);
        line-height: 1.3;
      }

      /* Actions & Feedback */
      .action-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
      }

      .action-btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--accent);
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        padding: 10px 16px;
        border-radius: 10px;
        text-decoration: none;
        transition: opacity 0.15s ease;
      }

      .action-btn-primary:hover {
        opacity: 0.92;
      }

      .action-btn-primary:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      .action-btn-secondary {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        background: var(--bg-card);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
        font-size: 12px;
        font-weight: 600;
        padding: 10px 16px;
        border-radius: 10px;
        text-decoration: none;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .action-btn-secondary:hover {
        background: var(--bg-hover);
        border-color: var(--text-muted);
      }

      .action-btn-secondary:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      /* Disclaimer Footer */
      .dialog-footer {
        padding: 12px 20px;
        background: var(--bg-card);
        border-top: 1px solid var(--border-color);
        font-size: 9.5px;
        color: var(--text-dim);
        line-height: 1.4;
      }

      .footer-brand-tag {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--border-color);
      }

      .footer-brand-tag a {
        color: var(--accent);
        text-decoration: none;
        font-weight: 600;
      }

      .footer-brand-tag a:hover {
        text-decoration: underline;
      }

      @media (prefers-reduced-motion: reduce) {
        .widget-trigger,
        .widget-overlay,
        .widget-dialog {
          transition: none !important;
          animation: none !important;
        }
      }

      @media (max-width: 480px) {
        .widget-overlay {
          padding: 0;
        }
        .widget-dialog {
          max-width: 100%;
          border-radius: 20px 20px 0 0;
          max-height: 85vh;
        }
      }
    `;

    // Root HTML container
    const container = document.createElement("div");
    container.className = "equivance-widget-wrapper";

    // 1. Trigger Pill Button
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "widget-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", "equivance-dialog");
    trigger.setAttribute("aria-label", "Accessibility Statement & Compliance Status");

    trigger.innerHTML = `
      <span class="trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="4.5" r="2.5"></circle>
          <path d="M4 8.5h16"></path>
          <path d="M12 8.5v6"></path>
          <path d="m8 20.5 4-6 4 6"></path>
        </svg>
      </span>
      <span>${customLabel || "Accessibility"}</span>
      <span class="trigger-badge">${score}%</span>
    `;

    // 2. Modal Dialog Overlay
    const overlay = document.createElement("div");
    overlay.className = "widget-overlay";
    overlay.setAttribute("aria-hidden", "true");

    const dialog = document.createElement("div");
    dialog.className = "widget-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "equivance-title");
    dialog.id = "equivance-dialog";

    // Build POUR cards
    const pour = data.pour || {};
    const pourKeys = ["perceivable", "operable", "understandable", "robust"];
    const pourCardsHtml = pourKeys
      .map(function (k) {
        const item = pour[k] || { name: k, status: "Pass", description: "" };
        const isPass = item.status === "Pass";
        return `
        <div class="pour-card">
          <div class="pour-card-header">
            <span class="pour-name">${item.name}</span>
            <span class="pour-badge ${isPass ? "pour-pass" : "pour-review"}">${item.status}</span>
          </div>
          <p class="pour-desc">${item.description}</p>
        </div>
      `;
      })
      .join("");

    dialog.innerHTML = `
      <div class="dialog-header">
        <div class="header-brand">
          ${
            data.branding.logo
              ? `<img src="${data.branding.logo}" alt="${brandName} Logo" class="brand-logo-img" />`
              : `<div class="trigger-icon" aria-hidden="true" style="width:28px;height:28px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.5" r="2.5"></circle><path d="M4 8.5h16"></path><path d="M12 8.5v6"></path><path d="m8 20.5 4-6 4 6"></path></svg></div>`
          }
          <div>
            <h3 class="brand-title" id="equivance-title">${brandName}</h3>
            <p class="brand-subtitle">${data.branding.tagline || "Accessibility Conformance"}</p>
          </div>
        </div>
        <button type="button" class="close-button" aria-label="Close accessibility statement">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="dialog-body">
        <div class="score-banner">
          <div class="score-info">
            <h4>${data.conformance}</h4>
            <p>Audited: ${auditDateStr} · WCAG 2.2 AA</p>
          </div>
          <div class="score-circle">
            ${score}
            <span>SCORE</span>
          </div>
        </div>

        <div class="pour-grid">
          ${pourCardsHtml}
        </div>

        <div class="action-group">
          <a href="${data.verifyUrl}" target="_blank" rel="noopener noreferrer" class="action-btn-primary">
            <span>View Verified Audit Report</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
          <a href="${barrierContactHref}" class="action-btn-secondary">
            <span>Report an Accessibility Barrier</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
          </a>
        </div>
      </div>

      <div class="dialog-footer">
        <p>This statement reflects continuous automated and assisted evaluations against WCAG 2.2 Level AA, EAA 2025, and ADA Title III.</p>
        ${
          !isWhiteLabel
            ? `<div class="footer-brand-tag">
                <span>Verified by <a href="${apiOrigin}" target="_blank" rel="noopener noreferrer">Equivance</a></span>
                <span>ISO/IEC 40500</span>
               </div>`
            : data.branding.footerText
            ? `<div class="footer-brand-tag"><span>${data.branding.footerText}</span></div>`
            : ""
        }
      </div>
    `;

    overlay.appendChild(dialog);
    container.appendChild(trigger);
    container.appendChild(overlay);

    shadow.appendChild(style);
    shadow.appendChild(container);

    // Event Listeners & Focus Management
    const closeBtn = dialog.querySelector(".close-button");

    function openModal() {
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      trigger.setAttribute("aria-expanded", "true");
      closeBtn.focus();
      document.addEventListener("keydown", handleKeydown);
    }

    function closeModal() {
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
      document.removeEventListener("keydown", handleKeydown);
    }

    function handleKeydown(e) {
      if (e.key === "Escape") {
        closeModal();
        return;
      }

      // Focus trap within Shadow DOM dialog
      if (e.key === "Tab") {
        const focusable = dialog.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && shadow.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && shadow.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });

    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) {
        closeModal();
      }
    });
  }
})();
