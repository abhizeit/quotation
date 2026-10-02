"use client";

export function SaveRow({
  pending,
  error,
  onSave,
  label = "Save",
}: {
  pending: boolean;
  error: string;
  onSave: () => void;
  label?: string;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <button className="btn small" type="button" disabled={pending} onClick={onSave}>
        {pending ? "Saving..." : label}
      </button>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
