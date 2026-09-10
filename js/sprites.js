/*
 * Splash — hand-illustrated SVG sprites
 *
 * Every building is drawn in the same cozy storybook style: warm fills, a
 * soft cocoa outline, simple geometry. Houses get color variants so the town
 * feels lived-in. Damage and protection effects are layered on in CSS, so
 * these sprites only describe the "happy" building.
 */

const INK = "#4a3527";

/* Warm roof + wall pairings for the seven houses. */
const HOUSE_PALETTES = [
  { wall: "#f3d9b1", roof: "#cf6b4c", door: "#9c5b3b" },
  { wall: "#e9c6cb", roof: "#a86b86", door: "#7d4f63" },
  { wall: "#cfe0c3", roof: "#6f9e6b", door: "#4f7350" },
  { wall: "#cfe0ea", roof: "#5f8bb0", door: "#436a8a" },
  { wall: "#f6e2a8", roof: "#d99a3e", door: "#a06d2c" },
  { wall: "#e7d3ef", roof: "#8d6fae", door: "#63497f" },
  { wall: "#f3cdb0", roof: "#c97f57", door: "#945534" },
];

function houseSprite(variant = 0) {
  const c = HOUSE_PALETTES[variant % HOUSE_PALETTES.length];
  return `
  <svg viewBox="0 0 100 100" class="bsvg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="92" rx="34" ry="6" fill="rgba(74,53,39,.16)"/>
    <!-- chimney -->
    <rect x="64" y="24" width="9" height="16" rx="2" fill="${c.door}" stroke="${INK}" stroke-width="2.4"/>
    <!-- roof -->
    <path d="M22 46 L50 22 L78 46 Z" fill="${c.roof}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <!-- body -->
    <rect x="28" y="46" width="44" height="40" rx="3" fill="${c.wall}" stroke="${INK}" stroke-width="3"/>
    <!-- door -->
    <rect x="44" y="62" width="14" height="24" rx="3" fill="${c.door}" stroke="${INK}" stroke-width="2.6"/>
    <circle cx="54.5" cy="74" r="1.6" fill="#ffe9b0"/>
    <!-- window -->
    <rect x="33" y="54" width="12" height="12" rx="2" fill="#fff4d6" stroke="${INK}" stroke-width="2.4"/>
    <line x1="39" y1="54" x2="39" y2="66" stroke="${INK}" stroke-width="1.6"/>
    <line x1="33" y1="60" x2="45" y2="60" stroke="${INK}" stroke-width="1.6"/>
  </svg>`;
}

function apartmentSprite() {
  const wall = "#e9d2b6";
  const trim = "#c98a5e";
  let windows = "";
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 28 + col * 16;
      const y = 28 + row * 14;
      const lit = (row + col) % 2 === 0 ? "#ffe9ab" : "#bfe0e4";
      windows += `<rect x="${x}" y="${y}" width="10" height="9" rx="1.6" fill="${lit}" stroke="${INK}" stroke-width="2"/>`;
    }
  }
  return `
  <svg viewBox="0 0 100 100" class="bsvg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="93" rx="36" ry="6" fill="rgba(74,53,39,.16)"/>
    <rect x="24" y="18" width="52" height="74" rx="4" fill="${wall}" stroke="${INK}" stroke-width="3"/>
    <rect x="20" y="12" width="60" height="10" rx="3" fill="${trim}" stroke="${INK}" stroke-width="3"/>
    ${windows}
    <rect x="42" y="78" width="16" height="14" rx="2" fill="${trim}" stroke="${INK}" stroke-width="2.6"/>
  </svg>`;
}

function grocerySprite() {
  const wall = "#f0ddc0";
  let awning = "";
  for (let i = 0; i < 6; i++) {
    awning += `<rect x="${20 + i * 10}" y="44" width="10" height="10" fill="${i % 2 ? "#e07a5f" : "#fdf0dd"}"/>`;
  }
  return `
  <svg viewBox="0 0 100 100" class="bsvg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="93" rx="38" ry="6" fill="rgba(74,53,39,.16)"/>
    <rect x="18" y="40" width="64" height="52" rx="4" fill="${wall}" stroke="${INK}" stroke-width="3"/>
    <rect x="30" y="24" width="40" height="16" rx="3" fill="#8aa06f" stroke="${INK}" stroke-width="3"/>
    <text x="50" y="36" text-anchor="middle" font-family="Fraunces, serif" font-size="9" font-weight="700" fill="#fff7e6">SHOP</text>
    <g clip-path="url(#gawn)"><rect x="18" y="44" width="64" height="10" fill="#fdf0dd"/>${awning}</g>
    <clipPath id="gawn"><rect x="18" y="44" width="64" height="10"/></clipPath>
    <line x1="18" y1="54" x2="82" y2="54" stroke="${INK}" stroke-width="2.4"/>
    <rect x="26" y="60" width="20" height="28" rx="2" fill="#bfe0e4" stroke="${INK}" stroke-width="2.6"/>
    <line x1="36" y1="60" x2="36" y2="88" stroke="${INK}" stroke-width="1.6"/>
    <rect x="54" y="62" width="22" height="26" rx="2" fill="#8c5a3c" stroke="${INK}" stroke-width="2.6"/>
  </svg>`;
}

function hospitalSprite() {
  const wall = "#f4eee6";
  return `
  <svg viewBox="0 0 100 100" class="bsvg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="93" rx="38" ry="6" fill="rgba(74,53,39,.16)"/>
    <rect x="20" y="30" width="60" height="62" rx="4" fill="${wall}" stroke="${INK}" stroke-width="3"/>
    <rect x="40" y="18" width="20" height="14" rx="2" fill="#fbfbf8" stroke="${INK}" stroke-width="3"/>
    <rect x="48" y="20" width="4" height="10" fill="#d65b5b"/>
    <rect x="45" y="23.5" width="10" height="3.5" fill="#d65b5b"/>
    <rect x="29" y="42" width="12" height="12" rx="1.6" fill="#bfe0e4" stroke="${INK}" stroke-width="2.2"/>
    <rect x="59" y="42" width="12" height="12" rx="1.6" fill="#bfe0e4" stroke="${INK}" stroke-width="2.2"/>
    <rect x="29" y="60" width="12" height="12" rx="1.6" fill="#bfe0e4" stroke="${INK}" stroke-width="2.2"/>
    <rect x="59" y="60" width="12" height="12" rx="1.6" fill="#bfe0e4" stroke="${INK}" stroke-width="2.2"/>
    <rect x="44" y="70" width="12" height="22" rx="2" fill="#9bb3c4" stroke="${INK}" stroke-width="2.6"/>
  </svg>`;
}

function schoolSprite() {
  const wall = "#e8c9a0";
  const roof = "#b5543e";
  return `
  <svg viewBox="0 0 100 100" class="bsvg" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="50" cy="93" rx="38" ry="6" fill="rgba(74,53,39,.16)"/>
    <rect x="20" y="46" width="60" height="46" rx="4" fill="${wall}" stroke="${INK}" stroke-width="3"/>
    <path d="M16 46 L50 28 L84 46 Z" fill="${roof}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <!-- bell tower -->
    <rect x="44" y="14" width="12" height="16" fill="#f0ddc0" stroke="${INK}" stroke-width="2.6"/>
    <path d="M42 14 L50 6 L58 14 Z" fill="${roof}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="50" cy="22" r="3" fill="#f4c542" stroke="${INK}" stroke-width="1.8"/>
    <rect x="28" y="56" width="12" height="12" rx="1.6" fill="#bfe0e4" stroke="${INK}" stroke-width="2.2"/>
    <rect x="60" y="56" width="12" height="12" rx="1.6" fill="#bfe0e4" stroke="${INK}" stroke-width="2.2"/>
    <rect x="43" y="68" width="14" height="24" rx="2" fill="#8c5a3c" stroke="${INK}" stroke-width="2.6"/>
    <line x1="50" y1="68" x2="50" y2="92" stroke="${INK}" stroke-width="1.6"/>
  </svg>`;
}

const HOUSE_VARIANT = {
  "House 1": 0, "House 2": 1, "House 3": 2, "House 4": 3,
  "House 5": 4, "House 6": 5, "House 7": 6,
};

export function buildingSprite(kind, propName) {
  switch (kind) {
    case "apartment": return apartmentSprite();
    case "grocery": return grocerySprite();
    case "hospital": return hospitalSprite();
    case "school": return schoolSprite();
    default: return houseSprite(HOUSE_VARIANT[propName] ?? 0);
  }
}

/* ---- decorative scenery ---- */

/* Scenery sprites are rendered as their own DOM nodes (each wrapped in a
   sized .sprite div) so they stay crisp and never distort, even when the
   stretched scene background does. */
export function treeSprite(variant = 0) {
  const greens = ["#6f9e6b", "#5f8f5d", "#86ab72"];
  const g = greens[variant % greens.length];
  return `<svg viewBox="0 0 40 56" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="53" rx="13" ry="3" fill="rgba(74,53,39,.14)"/>
    <rect x="17" y="34" width="6" height="18" rx="2" fill="#8a5a39"/>
    <circle cx="20" cy="22" r="15" fill="${g}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="13" cy="28" r="9" fill="${g}" stroke="${INK}" stroke-width="2.4"/>
    <circle cx="27" cy="28" r="9" fill="${g}" stroke="${INK}" stroke-width="2.4"/>
  </svg>`;
}

export function pineSprite() {
  return `<svg viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="20" cy="57" rx="11" ry="3" fill="rgba(74,53,39,.14)"/>
    <rect x="17.5" y="44" width="5" height="14" rx="2" fill="#7a4a2e"/>
    <path d="M20 6 L33 28 L7 28 Z" fill="#5b7d52" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M20 18 L35 44 L5 44 Z" fill="#6b9160" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
  </svg>`;
}

export function mountainSprite(variant = 0) {
  // A cozy snow-capped peak with a forested foot, so it blends into the ridge.
  const tones = [
    { sun: "#95a98f", sh: "#728a6c" },
    { sun: "#a2b2ab", sh: "#7e928a" },
    { sun: "#9bac8a", sh: "#788c69" },
  ];
  const t = tones[variant % tones.length];
  const snow = "#f3f4ec";
  return `<svg viewBox="0 0 240 192" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="120" cy="184" rx="98" ry="8" fill="rgba(74,53,39,.12)"/>
    <path d="M120 16 L228 176 H12 Z" fill="${t.sun}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M120 16 L228 176 H120 Z" fill="${t.sh}"/>
    <path d="M120 16 L228 176 H12 Z" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M93 76 L120 16 L147 76 L135 64 L126 78 L116 60 L106 78 L99 67 Z"
          fill="${snow}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <!-- forested foot -->
    <path d="M4 180 Q42 152 78 162 L70 150 L86 158 L80 144 Q104 156 120 158 Q150 162 168 150
             L162 162 Q200 152 236 180 Z"
          fill="#6e8e5b" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  </svg>`;
}

export function reedSprite() {
  // cattails along the waterline
  return `<svg viewBox="0 0 30 46" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#5f7d52" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M8 46 C6 32 6 24 9 13"/>
      <path d="M15 46 C15 30 15 22 15 8"/>
      <path d="M22 46 C24 32 24 26 21 16"/>
    </g>
    <rect x="13" y="6" width="4.4" height="12" rx="2.2" fill="#9a6b3f" stroke="${INK}" stroke-width="1.4"/>
    <ellipse cx="9" cy="14" rx="2.3" ry="5" fill="#8a5a36" stroke="${INK}" stroke-width="1.2"/>
    <ellipse cx="21" cy="17" rx="2.3" ry="5" fill="#8a5a36" stroke="${INK}" stroke-width="1.2"/>
  </svg>`;
}

export function flowerSprite(color = "#e8a0b0") {
  return `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <g fill="${color}" stroke="${INK}" stroke-width="1">
      <circle cx="10" cy="6" r="3.4"/><circle cx="6" cy="10" r="3.4"/>
      <circle cx="14" cy="10" r="3.4"/><circle cx="8" cy="14" r="3.4"/><circle cx="12" cy="14" r="3.4"/>
    </g>
    <circle cx="10" cy="10" r="3" fill="#fff3c4" stroke="${INK}" stroke-width="1"/>
  </svg>`;
}

export function cloudSprite() {
  return `<svg viewBox="0 0 90 44" xmlns="http://www.w3.org/2000/svg">
    <g fill="#fffaf0" stroke="rgba(74,53,39,.10)" stroke-width="2">
      <circle cx="26" cy="26" r="16"/><circle cx="46" cy="20" r="20"/>
      <circle cx="66" cy="27" r="15"/><rect x="22" y="26" width="50" height="16" rx="8"/>
    </g></svg>`;
}
