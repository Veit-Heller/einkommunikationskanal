"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

export interface FilterRule {
  field: "age" | "company" | "hasPhone" | "hasEmail";
  operator: "lt" | "gt" | "between" | "eq" | "contains" | "is";
  value: string | number;
  value2?: number;
}

export interface ContactGroup {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
  description?: string | null;
  filter?: string | null;
  _count?: { members: number };
}

interface Props {
  group?: ContactGroup | null;
  onClose: () => void;
  onSaved: (group: ContactGroup) => void;
}

const COLORS = ["#F2EAD3", "#1B77BA", "#22C55E", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const FIELD_LABELS: Record<string, string> = {
  age:      "Alter",
  company:  "Unternehmen",
  hasPhone: "Hat Telefon",
  hasEmail: "Hat E-Mail",
};

const OPERATOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  age:      [
    { value: "lt",      label: "jünger als" },
    { value: "gt",      label: "älter als" },
    { value: "between", label: "zwischen" },
    { value: "eq",      label: "genau" },
  ],
  company:  [
    { value: "contains", label: "enthält" },
    { value: "eq",       label: "ist genau" },
  ],
  hasPhone: [{ value: "is", label: "ist" }],
  hasEmail: [{ value: "is", label: "ist" }],
};

const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  borderRadius: "8px",
  color: "var(--text-primary)",
  padding: "8px 12px",
  fontSize: "13px",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: FilterRule;
  onChange: (r: FilterRule) => void;
  onRemove: () => void;
}) {
  const ops = OPERATOR_OPTIONS[rule.field] || [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Field selector */}
      <select
        value={rule.field}
        onChange={(e) => {
          const field = e.target.value as FilterRule["field"];
          const defaultOp = (OPERATOR_OPTIONS[field]?.[0]?.value || "eq") as FilterRule["operator"];
          onChange({ field, operator: defaultOp, value: field === "hasPhone" || field === "hasEmail" ? "true" : "" });
        }}
        style={{ ...selectStyle, minWidth: 130 }}
      >
        {Object.entries(FIELD_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as FilterRule["operator"] })}
        style={{ ...selectStyle, minWidth: 110 }}
      >
        {ops.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value input(s) */}
      {(rule.field === "age" || rule.field === "company") && (
        <>
          <input
            type={rule.field === "age" ? "number" : "text"}
            value={String(rule.value)}
            onChange={(e) => onChange({ ...rule, value: rule.field === "age" ? Number(e.target.value) : e.target.value })}
            placeholder={rule.field === "age" ? "Alter" : "Wert"}
            style={{ ...inputStyle, width: 80 }}
            min={0}
            max={130}
          />
          {rule.operator === "between" && (
            <>
              <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>und</span>
              <input
                type="number"
                value={String(rule.value2 ?? "")}
                onChange={(e) => onChange({ ...rule, value2: Number(e.target.value) })}
                placeholder="Alter"
                style={{ ...inputStyle, width: 80 }}
                min={0}
                max={130}
              />
            </>
          )}
          {rule.field === "age" && (
            <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Jahre</span>
          )}
        </>
      )}

      {(rule.field === "hasPhone" || rule.field === "hasEmail") && (
        <select
          value={String(rule.value)}
          onChange={(e) => onChange({ ...rule, value: e.target.value })}
          style={{ ...selectStyle, minWidth: 90 }}
        >
          <option value="true">vorhanden</option>
          <option value="false">nicht vorhanden</option>
        </select>
      )}

      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg transition-all ml-auto"
        style={{ color: "var(--text-secondary)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#EF4444"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
      >
        <Icon icon="solar:trash-bin-trash-linear" style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

export default function GroupModal({ group, onClose, onSaved }: Props) {
  const [name, setName]             = useState(group?.name || "");
  const [color, setColor]           = useState(group?.color || "#F2EAD3");
  const [emoji, setEmoji]           = useState(group?.emoji || "");
  const [description, setDescription] = useState(group?.description || "");
  const [rules, setRules]           = useState<FilterRule[]>(() => {
    if (group?.filter) {
      try { return JSON.parse(group.filter); } catch { return []; }
    }
    return [];
  });
  const [saving, setSaving]         = useState(false);
  const [preview, setPreview]       = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Preview count when rules change
  useEffect(() => {
    if (rules.length === 0) { setPreview(null); return; }
    const validRules = rules.filter(r => r.value !== "" && r.value !== undefined);
    if (validRules.length === 0) { setPreview(null); return; }

    setPreviewLoading(true);
    const groupId = group?.id || "new";
    const url = group?.id
      ? `/api/groups/${group.id}/apply`
      : `/api/groups/preview-filter`;

    // Use preview mode for existing groups, otherwise we need a temp endpoint
    const body = group?.id
      ? { rules: validRules, preview: true }
      : { rules: validRules, preview: true };

    // For new groups (no id yet), use a general preview endpoint
    fetch(group?.id ? `/api/groups/${group.id}/apply` : "/api/groups/preview-filter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((d) => setPreview(d.matched ?? null))
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules]);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        color,
        emoji: emoji || null,
        description: description || null,
        filter: rules.length > 0 ? rules : null,
      };

      let saved: ContactGroup;
      if (group?.id) {
        const res = await fetch(`/api/groups/${group.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        saved = (await res.json()).group;
      } else {
        const res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        saved = (await res.json()).group;
      }

      // If rules exist, apply filter immediately
      if (saved?.id && rules.length > 0) {
        const validRules = rules.filter(r => r.value !== "" && r.value !== undefined);
        if (validRules.length > 0) {
          await fetch(`/api/groups/${saved.id}/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rules: validRules }),
          });
        }
      }

      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  const addRule = () => {
    setRules([...rules, { field: "age", operator: "lt", value: 30 }]);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(242,234,211,0.1)" }}>
              <Icon icon="solar:users-group-two-rounded-linear" style={{ color: "#F2EAD3", width: 16, height: 16 }} />
            </div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {group ? "Gruppe bearbeiten" : "Neue Gruppe"}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-secondary)" }}>
            <Icon icon="solar:close-circle-linear" style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name + emoji */}
          <div className="flex gap-2">
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(-2))}
                placeholder="👥"
                style={{ ...inputStyle, width: 52, textAlign: "center", fontSize: 18 }}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Unter 30, Senioren, VIP..."
                style={{ ...inputStyle, width: "100%" }}
                autoFocus
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Farbe</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    background: c,
                    outline: color === c ? `2px solid ${c}` : "none",
                    outlineOffset: 2,
                    opacity: color === c ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Beschreibung (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Kunden unter 30 Jahre"
              style={{ ...inputStyle, width: "100%" }}
            />
          </div>

          {/* Filter rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                Automatischer Filter <span style={{ color: "var(--text-dim)" }}>(optional)</span>
              </label>
              {preview !== null && (
                <span className="text-xs" style={{ color: color }}>
                  {previewLoading ? "…" : `${preview} passende Kontakte`}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {rules.map((rule, i) => (
                <div key={i} className="rounded-xl p-2.5" style={{ background: "var(--input-bg)" }}>
                  <RuleRow
                    rule={rule}
                    onChange={(r) => setRules(rules.map((x, j) => j === i ? r : x))}
                    onRemove={() => setRules(rules.filter((_, j) => j !== i))}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addRule}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all"
              style={{ color: "var(--text-secondary)", background: "var(--input-bg)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}
            >
              <Icon icon="solar:add-circle-linear" style={{ width: 14, height: 14 }} />
              Filterregel hinzufügen
            </button>

            {rules.length > 0 && (
              <p className="mt-2 text-[11px]" style={{ color: "var(--text-dim)" }}>
                Beim Speichern werden alle passenden Kontakte automatisch hinzugefügt.
                Du kannst den Filter jederzeit erneut anwenden.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--input-bg)", color: "var(--text-secondary)" }}
          >
            Abbrechen
          </button>
          <button
            onClick={save}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{
              background: color,
              color: color === "#F2EAD3" ? "#000" : "#fff",
              opacity: (saving || !name.trim()) ? 0.5 : 1,
            }}
          >
            {saving ? (
              <><div className="w-3.5 h-3.5 rounded-full animate-spin" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000" }} /> Speichert…</>
            ) : (
              group ? "Speichern" : "Gruppe erstellen"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
