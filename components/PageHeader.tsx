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
 * Produces a white bar with bottom border, consistent padding,
 * and a standard title / subtitle / actions layout.
 */
export default function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
  return (
    <div className="bg-white border-b border-slate-100 px-6 py-4 flex-shrink-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
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
