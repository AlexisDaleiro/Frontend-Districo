// Ilustraciones de la tienda B2B: siluetas de especies e íconos de tipo de
// producto, dibujadas en petróleo sobre lima (boceto aprobado el 9/10/2026).
const INK = "#163d4a";
const LIME = "#b1ca00";
const SHADOW = "rgba(22,61,74,.2)";

export type SpeciesKind = "dog" | "puppy" | "cat" | "kitten" | "rabbit" | "cow";

// `ground` es el color del fondo: se usa para los cortes internos (oreja, pata).
export function SpeciesArt({
  kind,
  ground = LIME,
  className = "species-art",
}: {
  kind: SpeciesKind;
  ground?: string;
  className?: string;
}) {
  return (
    <svg className={className} viewBox="0 0 140 90" aria-hidden="true">
      {kind === "dog" && (
        <>
          <ellipse cx="78" cy="85" rx="44" ry="3" fill={SHADOW} />
          <g fill={INK}>
            <path d="M72 57 L78 57 L77 81 C77 83 76 84 74 84 L70 84 C69 84 69 83 70 82 Z" />
            <path d="M92 56 L99 57 L96 81 C96 83 95 84 93 84 L89 84 C88 84 88 83 89 82 Z" />
            <path d="M17 26 C17 24 19 23 22 23 L26 23 C29 19 32 16 37 15 C42 14 46 16 48 20 C52 25 56 30 62 32 C76 34 92 32 104 33 C108 33 111 35 112 38 C118 44 124 50 128 60 C129 62 127 63 125 61 C120 53 116 48 113 45 C114 52 113 60 109 66 L111 81 C111 83 110 84 108 84 L102 84 C101 84 101 82 103 81 L103 70 C101 64 99 60 96 58 C88 59 76 59 68 57 L67 81 C67 83 66 84 64 84 L58 84 C57 84 57 82 59 81 L59 62 C56 56 50 50 44 44 C40 41 35 39 30 37 C26 36 22 35 20 34 C18 33 17 31 17 29 Z" />
          </g>
          <path d="M43 18 C47 23 48 30 46 35 C45 36 43 35 42 33" fill="none" stroke={ground} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="33" cy="22" r="1.6" fill={ground} />
        </>
      )}
      {kind === "puppy" && (
        <>
          <ellipse cx="62" cy="85" rx="34" ry="3" fill={SHADOW} />
          <path fill={INK} d="M28 30 C29 26 32 23 36 22 C38 15 44 11 51 11 C58 11 62 16 62 22 C63 27 62 32 60 36 C66 40 71 45 75 51 C81 59 84 67 83 74 C88 76 93 77 97 76 C98 78 94 80 89 80 C86 80 84 80 82 81 C80 83 78 84 75 84 L41 84 C38 84 38 81 41 80 L43 79 L44 58 C43 52 41 47 39 44 C36 40 33 38 31 36 C29 35 27 33 28 30 Z" />
          <path d="M57 19 C61 23 62 30 59 36" fill="none" stroke={ground} strokeWidth="1.3" strokeLinecap="round" />
          <path d="M58 84 C55 75 60 66 70 62" fill="none" stroke={ground} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="41" cy="20" r="1.7" fill={ground} />
        </>
      )}
      {kind === "cat" && (
        <>
          <ellipse cx="78" cy="85" rx="40" ry="3" fill={SHADOW} />
          <g fill={INK}>
            <path d="M62 58 L68 58 L69 82 C69 84 68 84 67 84 L64 84 C63 84 63 83 64 82 Z" />
            <path d="M90 57 L96 58 L93 82 C93 84 92 84 91 84 L88 84 C87 84 87 83 88 82 Z" />
            <path d="M20 34 C20 31 22 28 25 27 L27 15 L33 23 C35 22 37 22 39 23 L42 15 L43 27 C47 31 53 34 60 34 C75 32 92 33 102 36 C112 38 118 36 121 28 C123 22 122 15 126 12 C128 11 129 13 128 15 C125 19 127 25 125 31 C122 40 114 43 106 43 C106 50 104 56 102 60 L104 82 C104 84 103 84 101 84 L97 84 C96 84 96 83 97 82 L98 66 C96 62 94 60 92 59 C84 60 74 60 66 58 L64 82 C64 84 63 84 61 84 L57 84 C56 84 56 83 57 82 L56 60 C52 54 46 46 42 42 C38 39 33 38 28 38 C24 38 21 37 20 34 Z" />
          </g>
          <circle cx="29" cy="30" r="1.5" fill={ground} />
        </>
      )}
      {kind === "kitten" && (
        <>
          <ellipse cx="60" cy="85" rx="32" ry="3" fill={SHADOW} />
          <path fill={INK} d="M40 30 C40 27 41 25 43 24 L44 12 L50 19 C52 18 54 18 56 19 L60 11 L61 23 C63 28 63 33 61 38 C66 45 72 53 76 61 C80 68 81 76 77 81 C75 83 72 84 69 84 L40 84 C36 84 34 82 36 80 C38 79 40 80 43 80 L47 80 L48 52 C47 46 45 41 43 38 C42 35 41 33 40 30 Z" />
          <path d="M57 84 C55 74 59 65 67 61" fill="none" stroke={ground} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="46" cy="27" r="1.5" fill={ground} />
        </>
      )}
      {kind === "rabbit" && (
        <>
          <ellipse cx="58" cy="85" rx="36" ry="3" fill={SHADOW} />
          <g fill={INK}>
            <circle cx="90" cy="70" r="5" />
            <path d="M22 52 C22 47 26 43 32 41 L34 14 C35 10 40 10 40 14 L40 39 L45 16 C46 12 51 13 50 17 L45 42 C52 40 62 42 72 46 C84 51 90 60 90 70 C90 76 88 80 84 82 C82 84 78 84 74 84 L30 84 C27 84 27 81 30 81 L34 80 L35 66 C32 62 28 58 26 57 C23 56 22 54 22 52 Z" />
          </g>
          <path d="M58 84 C56 72 64 62 78 62" fill="none" stroke={ground} strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="30" cy="47" r="1.6" fill={ground} />
        </>
      )}
      {kind === "cow" && (
        <>
          <ellipse cx="78" cy="85" rx="46" ry="3" fill={SHADOW} />
          <g fill={INK}>
            <path d="M64 61 L70 61 L71 82 C71 84 70 84 69 84 L65 84 C64 84 64 83 65 82 Z" />
            <path d="M100 62 L106 62 L102 82 C102 84 101 84 100 84 L96 84 C95 84 95 83 96 82 Z" />
            <path d="M22 30 C26 28 32 28 36 31 C40 31 46 28 54 27 C74 25 98 26 112 28 C116 28 118 30 118 34 C118 42 117 48 115 52 L116 82 C116 84 115 84 113 84 L108 84 C107 84 107 83 108 82 L106 64 C102 64 100 66 98 68 C96 70 92 70 90 68 C89 66 88 64 86 63 C76 63 66 62 60 61 L59 82 C59 84 58 84 56 84 L51 84 C50 84 50 83 51 82 L50 62 C46 60 42 58 38 54 C34 54 28 58 22 58 C17 58 14 56 14 52 C14 46 17 38 20 33 C20 31 21 30 22 30 Z" />
            <path d="M33 31 C37 28 41 28 43 30 C40 33 36 33 33 33 Z" />
            <ellipse cx="120" cy="64" rx="2.5" ry="4" />
          </g>
          <path d="M118 32 C122 40 121 52 120 61" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M26 29 C24 25 25 22 28 21" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          <g fill={ground}>
            <path d="M74 30 C82 28 92 32 90 40 C88 47 76 46 72 41 C69 37 70 31 74 30 Z" />
            <path d="M100 44 C106 42 110 46 108 51 C106 55 99 54 98 50 C97 47 98 45 100 44 Z" />
          </g>
          <circle cx="24" cy="38" r="1.6" fill={ground} />
        </>
      )}
    </svg>
  );
}

export type TileKind = "featured" | "pharmacy" | "human" | "brands";

export function TileArt({ kind }: { kind: TileKind }) {
  return (
    <svg viewBox="0 0 140 90" aria-hidden="true">
      {kind === "featured" && (
        <>
          <circle cx="70" cy="45" r="30" fill={LIME} />
          <polygon points="70,27 75.3,39 88.5,40.4 78.6,49.2 81.5,62.2 70,55.5 58.5,62.2 61.4,49.2 51.5,40.4 64.7,39" fill={INK} />
        </>
      )}
      {kind === "pharmacy" && (
        <>
          <ellipse cx="72" cy="84" rx="38" ry="4" fill={SHADOW} />
          <g fill={INK}>
            <rect x="40" y="28" width="36" height="54" rx="8" />
            <rect x="47" y="20" width="22" height="10" rx="2" />
            <rect x="44" y="10" width="28" height="12" rx="3" />
          </g>
          <rect x="45" y="44" width="26" height="24" rx="3" fill="#fff" />
          <g fill={INK}>
            <rect x="55" y="48" width="6" height="16" rx="1" />
            <rect x="50" y="53" width="16" height="6" rx="1" />
          </g>
          <g transform="rotate(-35 100 64)">
            <rect x="82" y="56.5" width="36" height="15" rx="7.5" fill="#fff" stroke={INK} strokeWidth="3" />
            <path d="M100 56.5 H89.5 A7.5 7.5 0 0 0 89.5 71.5 H100 Z" fill={INK} />
          </g>
        </>
      )}
      {kind === "human" && (
        <>
          <ellipse cx="72" cy="84" rx="40" ry="4" fill={SHADOW} />
          <g fill={INK}>
            <path d="M40 22 H84 L88 82 H36 Z" />
            <rect x="38" y="12" width="48" height="12" rx="2" />
            <circle cx="106" cy="68" r="15" />
          </g>
          <path d="M38 23 H86" stroke={LIME} strokeWidth="2" />
          <circle cx="62" cy="52" r="13" fill="#fff" />
          <path d="M56 57 C56 47 64 44 70 46 C70 54 64 59 56 57 Z" fill={INK} />
          <g fill={LIME}>
            <circle cx="100" cy="64" r="2.5" />
            <circle cx="110" cy="62" r="2.2" />
            <circle cx="106" cy="72" r="2.5" />
            <circle cx="114" cy="70" r="2" />
          </g>
        </>
      )}
      {kind === "brands" && (
        <>
          <g fill={INK}>
            <path d="M58 62 L50 84 L59 80 L63 88 L69 68 Z" />
            <path d="M82 62 L90 84 L81 80 L77 88 L71 68 Z" />
            <circle cx="70" cy="42" r="27" />
          </g>
          <polygon points="70,29 73.23,37.55 82.36,37.98 75.23,43.70 77.64,52.52 70,47.5 62.36,52.52 64.77,43.70 57.64,37.98 66.77,37.55" fill="#fff" />
        </>
      )}
    </svg>
  );
}

// Tipos de producto que acepta el filtro `productType` de la API.
export const productTypeLinks = [
  { type: "FOOD", name: "Alimento" },
  { type: "HYGIENE", name: "Higiene y cuidado" },
  { type: "ACCESSORY", name: "Accesorios" },
  { type: "SUPPLEMENT", name: "Suplementos" },
  { type: "MEDICATION", name: "Medicamentos" },
] as const;

export function TypeIcon({ type, className = "type-icon" }: { type: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 30" aria-hidden="true">
      {type === "FOOD" && (
        <>
          <path d="M10 15 C12 7 36 7 38 15 Z" fill={INK} />
          <path d="M5 15 H43 C41 25 35 27 24 27 C13 27 7 25 5 15 Z" fill={LIME} />
        </>
      )}
      {type === "HYGIENE" && (
        <>
          <rect x="14" y="9" width="16" height="19" rx="4" fill={LIME} />
          <rect x="18" y="3" width="8" height="7" rx="1.5" fill={INK} />
          <rect x="17" y="15" width="10" height="7" rx="1.5" fill="#fff" />
          <path d="M38 8 C41 13 43 16 43 19 A5 5 0 0 1 33 19 C33 16 35 13 38 8 Z" fill={INK} />
        </>
      )}
      {type === "ACCESSORY" && (
        <>
          <circle cx="24" cy="14" r="12" fill={LIME} />
          <path d="M13.5 8 C20 12 22 18 29 25" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M33 4.5 C28 9 28.5 15 35.5 20" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {type === "SUPPLEMENT" && (
        <>
          <ellipse cx="24" cy="27.5" rx="15" ry="1.8" fill={SHADOW} />
          <g fill={LIME}>
            <circle cx="10" cy="10" r="5.5" />
            <circle cx="10" cy="20" r="5.5" />
            <circle cx="38" cy="10" r="5.5" />
            <circle cx="38" cy="20" r="5.5" />
            <rect x="10" y="9.5" width="28" height="11" rx="2" />
          </g>
        </>
      )}
      {type === "MEDICATION" && (
        <>
          <path d="M24 3 L38 8 V15 C38 22 32 26 24 28 C16 26 10 22 10 15 V8 Z" fill={LIME} />
          <path d="M18 15 L22.5 19.5 L30 11" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
