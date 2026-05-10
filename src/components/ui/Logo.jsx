// src/components/ui/Logo.jsx
// Versi full  → login page (tengah, besar)
// Versi compact → navbar (kecil, horizontal)

const FONT = "'Nunito', 'Inter', sans-serif";

/* ── Full logo (login page) ──────────────────────────────── */
export function LogoFull({ light = true }) {
  return (
    <div className="flex flex-col items-center select-none">
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: '3.5rem',       // ~56px
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: light ? '#ffffff' : '#0f172a',
        }}
      >
        joborder<span style={{ color: light ? '#ffffff' : '#0f172a' }}>.</span>
      </span>
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 300,
          fontSize: '0.72rem',
          letterSpacing: '0.35em',
          marginTop: '6px',
          color: light ? 'rgba(255,255,255,0.55)' : '#94a3b8',
          textTransform: 'lowercase',
        }}
      >
        wonokitri
      </span>
    </div>
  );
}

/* ── Compact logo (navbar) ───────────────────────────────── */
export function LogoCompact({ dark = false }) {
  return (
    <div className="flex flex-col justify-center select-none leading-none">
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: '1.25rem',      // ~20px
          letterSpacing: '-0.03em',
          lineHeight: 1,
          color: dark ? '#ffffff' : '#0f172a',
        }}
      >
        joborder<span style={{ color: dark ? '#ffffff' : '#0f172a' }}>.</span>
      </span>
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 300,
          fontSize: '0.58rem',
          letterSpacing: '0.3em',
          marginTop: '3px',
          color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8',
          textTransform: 'lowercase',
        }}
      >
        wonokitri
      </span>
    </div>
  );
}
