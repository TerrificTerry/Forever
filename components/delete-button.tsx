"use client";

export function DeleteButton() {
  return <button type="submit" className="button-danger" onClick={(event) => { if (!window.confirm("Delete this record? This cannot be undone.")) event.preventDefault(); }}>Delete record</button>;
}
