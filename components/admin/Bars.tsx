import type { Count } from '@/lib/admin-data';

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);

/** Horizontal bars with count and share. `total` is the denominator for the percentage. */
export function Bars({ items, total, color }: { items: Count[]; total: number; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="adm-bars">
      {items.map((i) => (
        <div key={i.label} className="adm-bar">
          <div className="lbl">
            <span title={i.label}>{i.label}</span>
            <div className="track"><div className="fill" style={{ width: `${(i.count / max) * 100}%`, background: i.color ?? color }} /></div>
          </div>
          <div className="num"><b>{i.count}</b> · {pct(i.count, total)}%</div>
        </div>
      ))}
    </div>
  );
}
