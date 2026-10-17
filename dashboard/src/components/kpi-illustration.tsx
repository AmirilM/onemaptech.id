import { Fragment } from "react";

/**
 * Ilustrasi "faux-3D" untuk 4 KPI card — sebahasa dengan tile kaca di kartu
 * Hero Total Revenue (lihat page.tsx), tapi versi ringkas karena kartunya kecil.
 *
 * Server Component: SVG + gaya murni CSS, tanpa state maupun aset eksternal.
 * Penempatan: pojok kanan atas DI DALAM kartu, sebab wrapper kartu memakai
 * `overflow-hidden` — dekorasi yang keluar tepi pasti terpotong.
 */

export type KpiVariant = "apple" | "android" | "accessories" | "vas";

/** Stagger supaya keempat tile tidak mengapung serempak. */
const DELAY_MS: Record<KpiVariant, number> = {
  apple: 0,
  android: 900,
  accessories: 1800,
  vas: 2700,
};

/** Gradien & `id` unik per varian — tanpa ini 4 instance di satu halaman saling menimpa. */
const ART: Record<KpiVariant, React.ReactNode> = {
  // Apple Revenue — apel glossy
  apple: (
    <Fragment>
      <defs>
        <linearGradient id="kpiApple" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#A5B4FC" />
        </linearGradient>
      </defs>
      <path
        d="M48 32C40 24 24 27 24 47c0 19 13 33 24 33s24-14 24-33c0-20-16-23-24-15Z"
        fill="url(#kpiApple)"
      />
      <path
        d="M50 30c3-13 15-18 24-17 1 11-8 18-20 18Z"
        fill="#818CF8"
      />
      <ellipse
        cx="37"
        cy="45"
        rx="6"
        ry="9"
        fill="#fff"
        opacity="0.45"
        transform="rotate(-25 37 45)"
      />
    </Fragment>
  ),

  // Android Revenue — robot Android
  android: (
    <Fragment>
      <defs>
        <linearGradient id="kpiAndroid" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#818CF8" />
        </linearGradient>
      </defs>
      <path
        d="M33 33 25 21M63 33l8-12"
        stroke="url(#kpiAndroid)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M26 60V46a22 22 0 0 1 44 0v14a6 6 0 0 1-6 6H32a6 6 0 0 1-6-6Z"
        fill="url(#kpiAndroid)"
      />
      <circle cx="40" cy="46" r="4" fill="#fff" />
      <circle cx="56" cy="46" r="4" fill="#fff" />
      <path
        d="M34 39a16 16 0 0 1 12-8"
        stroke="#fff"
        strokeOpacity="0.45"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </Fragment>
  ),

  // Accessories Revenue — headphone
  accessories: (
    <Fragment>
      <defs>
        <linearGradient id="kpiAccessories" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#A5B4FC" />
        </linearGradient>
      </defs>
      <path
        d="M24 58v-6a24 24 0 0 1 48 0v6"
        stroke="url(#kpiAccessories)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="16" y="54" width="16" height="26" rx="7" fill="url(#kpiAccessories)" />
      <rect x="64" y="54" width="16" height="26" rx="7" fill="url(#kpiAccessories)" />
      <path
        d="M39 32a18 18 0 0 1 18 5"
        stroke="#fff"
        strokeOpacity="0.45"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </Fragment>
  ),

  // VAS Revenue — kilau layanan digital
  vas: (
    <Fragment>
      <defs>
        <linearGradient id="kpiVas" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#A5B4FC" />
        </linearGradient>
      </defs>
      <path
        d="M48 16 56 40 80 48 56 56 48 80 40 56 16 48 40 40Z"
        fill="url(#kpiVas)"
      />
      <path d="M24 62 27 71 36 74 27 77 24 86 21 77 12 74 21 71Z" fill="#818CF8" />
      <circle cx="74" cy="24" r="6" fill="#C4B5FD" />
    </Fragment>
  ),
};

export default function KpiIllustration({ variant }: { variant: KpiVariant }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute right-3 top-3 z-10 h-[68px] w-[68px]"
    >
      {/* Blob kaca di belakang tile */}
      <div className="absolute -bottom-1 -left-1 h-9 w-9 rounded-[13px] bg-gradient-to-br from-[#C4B5FD]/45 to-[#818CF8]/20 ring-1 ring-white/60" />

      {/* Tile utama — mengapung (staggered) dan terangkat saat kartu di-hover.
          `animate-float` menggerakkan `translate`, hover memakai `transform`,
          jadi keduanya tidak saling menimpa. */}
      <div
        className="animate-float absolute right-0 top-0 flex h-[58px] w-[58px] items-center justify-center rounded-[20px] bg-gradient-to-br from-white/90 via-white/50 to-[#A5B4FC]/45 shadow-[0_16px_30px_-14px_rgba(79,70,229,0.5)] ring-1 ring-white/70 transition-transform duration-300 ease-out group-hover:-rotate-3 group-hover:scale-[1.06]"
        style={{ animationDelay: `${DELAY_MS[variant]}ms` }}
      >
        <svg viewBox="0 0 96 96" className="h-9 w-9" fill="none" aria-hidden>
          {ART[variant]}
        </svg>
      </div>
    </div>
  );
}
