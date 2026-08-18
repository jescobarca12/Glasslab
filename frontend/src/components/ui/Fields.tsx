import type { ReactNode } from "react";

interface BaseProps {
  label: string;
  hint?: string;
}

export function TextField({
  label, hint, value, onChange, type = "text", placeholder,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label} {hint && <span className="hint">— {hint}</span>}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function NumberField({
  label, hint, value, onChange, min, max,
}: BaseProps & {
  value: number | "";
  onChange: (v: number | "") => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="field">
      <label>{label} {hint && <span className="hint">— {hint}</span>}</label>
      <input
        type="number" value={value} min={min} max={max}
        onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
      />
    </div>
  );
}

export function SelectField({
  label, hint, value, onChange, options, placeholder = "Selecciona…",
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <div className="field">
      <label>{label} {hint && <span className="hint">— {hint}</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function TextAreaField({
  label, hint, value, onChange, rows = 3,
}: BaseProps & {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="field">
      <label>{label} {hint && <span className="hint">— {hint}</span>}</label>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function CheckField({
  label, checked, onChange,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="field-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <label onClick={() => onChange(!checked)}>{label}</label>
    </div>
  );
}
