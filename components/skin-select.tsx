"use client";

// Selector SKIN de la barra superior de PlayRoom, reutilizable por cualquier
// juego con skins (mismo aspecto que el de Bloques, pero con tokens CSS).
export function SkinSelect<T extends string>({
  value,
  skins,
  onChange,
}: {
  value: T;
  skins: ReadonlyArray<{ id: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-[10px] tracking-[2px] text-texto-tenue">SKIN</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="whitespace-nowrap border border-cian/40 bg-background px-2.5 py-1.5 font-display text-[9px] text-cian transition-colors hover:border-cian focus:border-cian focus:outline-none"
      >
        {skins.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
