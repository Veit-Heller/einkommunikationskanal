import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Buttons / badges rendered on the right side */
  actions?: React.ReactNode;
  /** Optional second row (search bar, filter tabs, etc.) rendered below the title row */
  children?: React.ReactNode;
}

/**
 * Unified top-of-page header used across all CRM pages.
 */
export default function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div
      className="flex-shrink-0 px-6 py-4"
      style={{
        background: "var(--header-bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-xl leading-tight"
            style={{ color: "var(--text-primary)", fontWeight: 400, letterSpacing: "-0.025em" }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}
