"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

const MAX_SUGGESTIONS = 8;

// Free-text input with optional suggestions. Replaces the native <datalist>:
// on iPad with a hardware keyboard Safari turns a datalist into a picker that
// opens on focus and gets in the way of typing a new name. Here the list only
// appears while typing, never blocks free text, and closes with Escape or blur.
// The list is position: fixed so it is not clipped by scrolling table wrappers.
export function SuggestInput({
  value,
  onChange,
  suggestions,
  className = "input",
  placeholder,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  className?: string;
  placeholder?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [rect, setRect] = useState<{ left: number; top: number; width: number } | null>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const name of suggestions) {
      const n = name.toLowerCase();
      if (n === q) continue;
      if (n.startsWith(q)) starts.push(name);
      else if (n.includes(q)) contains.push(name);
      if (starts.length >= MAX_SUGGESTIONS) break;
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [value, suggestions]);

  const visible = open && matches.length > 0;

  useEffect(() => {
    if (!visible) return;
    function place() {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setRect({ left: r.left, top: r.bottom + 4, width: Math.max(r.width, 220) });
    }
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [visible]);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (visible) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, matches.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === "Enter" && active >= 0) {
        e.preventDefault();
        pick(matches[active]);
        return;
      }
    }
    onKeyDown?.(e);
  }

  return (
    <>
      <input
        ref={inputRef}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {visible && rect && (
        <div
          id={listId}
          role="listbox"
          className="flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5"
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            zIndex: 60,
            background: "var(--dc-bg)",
            border: "1px solid var(--dc-divider)",
            boxShadow: "var(--dc-shadow-lg)",
          }}
        >
          {matches.map((name, i) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={i === active}
              className="navbtn"
              // Keep focus in the input so blur does not close the list first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(name)}
              style={{
                textAlign: "left",
                ...(i === active ? { background: "var(--dc-accent-100)", color: "var(--dc-accent-800)" } : {}),
              }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
