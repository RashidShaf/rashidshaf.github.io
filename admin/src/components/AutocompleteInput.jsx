import { useState, useRef, useEffect } from 'react';

export default function AutocompleteInput({ name, value, onChange, suggestions = [], className = '', dir, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = value
    ? suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase())
    : suggestions;

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        name={name}
        value={value}
        onChange={(e) => { onChange(e); setOpen(true); }}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className={className}
        dir={dir}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {filtered.map((item) => (
            <button
              key={item}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(item)}
              className="w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
