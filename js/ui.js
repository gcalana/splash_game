/*
 * Splash — UI controller
 *
 * Drives the cozy diorama: lays out the town, runs the yearly phase machine
 * (Plan ▸ Enter hazard ▸ Enter damage ▸ Harvest ▸ Rebuild), animates hazards,
 * and wires every decision back to the SplashGame engine.
 *
 * Matches splash_game_oop_manual_input_v4.py: nothing is rolled. The player
 * enters which hazard struck and which buildings it damaged.
 */

import { SplashGame } from "./game.js";
import * as D from "./data.js";
import {
  buildingSprite, treeSprite, pineSprite, cloudSprite, flowerSprite,
  mountainSprite, reedSprite,
} from "./sprites.js";

/* ----------------------------------------------------------- helpers */
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function money(n) {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  const trim = (v) => parseFloat(v.toFixed(2)).toString();
  if (a >= 1e6) return `${sign}$${trim(a / 1e6)}M`;
  if (a >= 1e3) return `${sign}$${trim(a / 1e3)}K`;
  return `${sign}$${a}`;
}

/* Where each building sits in the diorama (% of the scene). These share the
   same coordinate space as the background SVG (viewBox 1000×640, stretched to
   fill), so buildings always land exactly on the painted ground and zones.
   Wildfire homes sit on the forest ridge; flood-prone ones line the river;
   House 4 + the Hospital rest in the safe central meadow. */
const POSITIONS = {
  // forested mountainside — wildfire zone (upper-left); homes sit on the
  // lower slopes, below the peaks.
  "House 2": { x: 24, y: 35 },
  "House 1": { x: 9.5, y: 44 },
  "Apartment Building": { x: 33, y: 47 },
  "House 3": { x: 12, y: 59 },
  // safe meadow (center)
  "House 4": { x: 56, y: 55 },
  "Hospital": { x: 77, y: 52 },
  // riverbank floodplain — flood zone (bottom); on land, close to the water
  "House 5": { x: 13, y: 78 },
  "House 6": { x: 30, y: 83 },
  "House 7": { x: 47.5, y: 78 },
  "Grocery Store": { x: 66, y: 81 },
  "School": { x: 85, y: 72 },
};

/* Decorative scenery, placed in scene % so it sits on the painted ground.
   Mountains rise behind the forest; pines clothe the slopes; leafy trees +
   flowers dot the meadow; reeds line the waterline. */
const MOUNTAINS = [
  { x: 6, y: 38, v: 1, size: "md" },
  { x: 20, y: 35, v: 0, size: "lg" },
  { x: 35, y: 33, v: 2, size: "md" },
];
const PINES = [
  [4, 46], [19, 44], [33, 48], [2, 56], [27, 55], [13, 62], [42, 53],
];
const TREES = [
  [49, 60, 0], [67, 57, 1], [91, 47, 2], [44, 67, 0], [73, 65, 1],
];
const FLOWERS = [
  [52, 64, "#e8a0b0"], [62, 70, "#f0c14b"], [85, 61, "#cf7f8e"], [38, 71, "#f0c14b"],
];
const REEDS = [
  [22, 90], [40, 92], [57, 90], [75, 89], [33, 93], [69, 93], [9, 91],
];

const KIND_LABEL = {
  house: "Home", apartment: "Apartments",
  grocery: "Grocery", hospital: "Hospital", school: "School",
};

/* ----------------------------------------------------------- scene art */
function sceneBackgroundSVG() {
  // Design space 1000×640, stretched to exactly fill the scene
  // (preserveAspectRatio="none") so it shares one coordinate system with the
  // building/scenery layers. Only large organic bands live here — anything
  // that mustn't distort (trees, sun, labels) is a DOM sprite instead.
  // Strokes use non-scaling-stroke so borders stay an even thickness.
  return `
  <svg viewBox="0 0 1000 640" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#cfeaf2"/>
        <stop offset="1" stop-color="#e6f0e7"/>
      </linearGradient>
      <linearGradient id="meadowG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#dfe7b4"/>
        <stop offset="1" stop-color="#cdd897"/>
      </linearGradient>
      <linearGradient id="forestG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7ba268"/>
        <stop offset="1" stop-color="#5f8450"/>
      </linearGradient>
      <linearGradient id="plainG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#cdcd8a"/>
        <stop offset="1" stop-color="#bcc079"/>
      </linearGradient>
      <linearGradient id="sandG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ecdcb0"/>
        <stop offset="1" stop-color="#e0cc95"/>
      </linearGradient>
      <linearGradient id="riverG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8cc1d6"/>
        <stop offset="1" stop-color="#5a96bb"/>
      </linearGradient>
    </defs>

    <!-- sky + distant hills + meadow -->
    <rect x="0" y="0" width="1000" height="340" fill="url(#skyG)"/>
    <path d="M0 308 Q 260 258 540 302 Q 780 340 1000 292 L1000 360 L0 360 Z" fill="#cfdcab" opacity=".7"/>
    <rect x="0" y="306" width="1000" height="334" fill="url(#meadowG)"/>

    <!-- WILDFIRE ZONE: forested lower slopes (peaks are DOM mountains on top).
         A soft tree-line tops the green; warm tint + dashed border mark risk. -->
    <path d="M-30 408 L-30 214 Q 120 150 270 188 Q 420 224 458 320 Q 472 366 452 408 Z" fill="url(#forestG)"/>
    <path d="M-30 408 L-30 214 Q 120 150 270 188 Q 420 224 458 320 Q 472 366 452 408 Z" fill="#3f6b32" opacity=".14"/>
    <path d="M-30 408 L-30 214 Q 120 150 270 188 Q 420 224 458 320 Q 472 366 452 408 Z" fill="#e07a3a" opacity=".10"/>
    <path d="M-30 214 Q 120 150 270 188 Q 420 224 458 320 Q 472 366 452 408"
          fill="none" stroke="#c9632f" stroke-width="3.5" stroke-dasharray="11 9"
          vector-effect="non-scaling-stroke" opacity=".85"/>

    <!-- winding path through the meadow -->
    <path d="M250 330 Q 400 392 560 388 Q 740 384 884 470"
          fill="none" stroke="#e7d4a6" stroke-width="30" stroke-linecap="round"
          vector-effect="non-scaling-stroke"/>
    <path d="M250 330 Q 400 392 560 388 Q 740 384 884 470"
          fill="none" stroke="#d3bc88" stroke-width="30" stroke-linecap="round"
          stroke-dasharray="2 32" vector-effect="non-scaling-stroke" opacity=".45"/>

    <!-- FLOOD ZONE: low riverbank — damp grassy floodplain (land!), a sandy
         shore, then the river. Dashed border marks where the water can reach. -->
    <path d="M-30 452 Q 260 416 530 452 Q 780 484 1030 446 L1030 640 L-30 640 Z" fill="url(#plainG)"/>
    <!-- patches of damp grass for texture -->
    <path d="M-30 470 Q 200 448 430 472 Q 360 486 250 480 Q 120 474 -30 486 Z" fill="#c2c57f" opacity=".55"/>
    <path d="M560 486 Q 760 470 1030 486 L1030 506 Q 800 492 600 506 Z" fill="#c2c57f" opacity=".5"/>
    <!-- sandy shore -->
    <path d="M-30 556 Q 260 530 540 560 Q 790 588 1030 552 L1030 640 L-30 640 Z" fill="url(#sandG)"/>
    <!-- the river -->
    <path d="M-30 588 Q 270 562 560 592 Q 800 616 1030 582 L1030 700 L-30 700 Z" fill="url(#riverG)"/>
    <path d="M-30 588 Q 270 562 560 592 Q 800 616 1030 582"
          fill="none" stroke="#ecf7fa" stroke-width="3.5" vector-effect="non-scaling-stroke" opacity=".7"/>
    <path d="M-30 624 Q 280 600 570 628 Q 810 650 1030 618"
          fill="none" stroke="#d6eef3" stroke-width="2.5" vector-effect="non-scaling-stroke" opacity=".5"/>
    <!-- dashed flood-risk border along the top of the plain -->
    <path d="M-30 452 Q 260 416 530 452 Q 780 484 1030 446"
          fill="none" stroke="#3f8aa8" stroke-width="3.5" stroke-dasharray="11 9"
          vector-effect="non-scaling-stroke" opacity=".85"/>
    <!-- pebbles + lily pads near the water -->
    <g fill="#b9b29c" stroke="#4a3527" stroke-width="2" vector-effect="non-scaling-stroke">
      <ellipse cx="150" cy="566" rx="11" ry="6"/><ellipse cx="172" cy="572" rx="7" ry="4"/>
      <ellipse cx="690" cy="572" rx="10" ry="6"/><ellipse cx="712" cy="576" rx="6" ry="4"/>
    </g>
    <g fill="#7fae73" stroke="#4a3527" stroke-width="2" vector-effect="non-scaling-stroke" opacity=".9">
      <ellipse cx="430" cy="618" rx="16" ry="7"/><ellipse cx="860" cy="612" rx="14" ry="6"/>
    </g>
  </svg>`;
}

/* ----------------------------------------------------------- app */
class SplashUI {
  constructor() {
    this.game = null;
    this.phase = "plan";
    this.selected = null;
    this.totalYears = 5;
    this.currentHazard = null;   // hazard the player entered this year
    this.marked = new Set();     // buildings the player marked as damaged
    this.stats = { hazards: [], buildingsLost: 0, yearsAllSafe: 0 };

    this.cacheDom();
    this.buildScene();
    this.bindGlobal();
    this.setupTitle();
  }

  cacheDom() {
    this.dom = {
      hud: $("#hud"),
      yearV: $("#year-value"),
      budgetV: $("#budget-value"),
      popV: $("#pop-value"),
      statBudget: $("#stat-budget"),
      statPop: $("#stat-pop"),
      scene: $("#scene"),
      bg: $("#scene-bg"),
      scenery: $("#scenery"),
      zones: $("#zones"),
      clouds: $("#clouds"),
      buildings: $("#buildings"),
      fx: $("#fx"),
      legendBtn: $("#legend-btn"),
      legendCard: $("#legend-card"),
      ledgerPhase: $("#ledger-phase"),
      ledgerHint: $("#ledger-hint"),
      panel: $("#flood-panel"),
      journal: $("#journal"),
      primary: $("#primary-btn"),
      ribbonText: $("#phase-ribbon-text"),
      popover: $("#popover"),
      banner: $("#hazard-banner"),
      bannerIcon: $("#hazard-icon"),
      bannerTitle: $("#hazard-title"),
      bannerSub: $("#hazard-sub"),
      title: $("#title"),
      lengthChoice: $("#length-choice"),
      startBtn: $("#start-btn"),
      report: $("#report"),
      reportCard: $("#report-card"),
    };
  }

  /* ---- one-time scene scaffolding ---- */
  buildScene() {
    this.dom.bg.innerHTML = sceneBackgroundSVG();
    this.buildScenery();
    this.buildZoneTags();
    this.buildClouds();
    this.bindLegend();
  }

  buildScenery() {
    const layer = this.dom.scenery;
    layer.innerHTML = "";

    // mountains first so they sit behind the pines & forest
    for (const m of MOUNTAINS) {
      const s = el("div", `sprite sprite--mountain sprite--mountain-${m.size}`, mountainSprite(m.v));
      s.style.left = m.x + "%"; s.style.top = m.y + "%";
      layer.appendChild(s);
    }

    const sun = el("div", "sun");
    sun.style.left = "89%";
    sun.style.top = "14%";
    layer.appendChild(sun);

    for (const [x, y] of PINES) {
      const s = el("div", "sprite sprite--pine", pineSprite());
      s.style.left = x + "%"; s.style.top = y + "%";
      layer.appendChild(s);
    }
    for (const [x, y, v] of TREES) {
      const s = el("div", "sprite sprite--tree", treeSprite(v));
      s.style.left = x + "%"; s.style.top = y + "%";
      layer.appendChild(s);
    }
    for (const [x, y] of REEDS) {
      const s = el("div", "sprite sprite--reed", reedSprite());
      s.style.left = x + "%"; s.style.top = y + "%";
      layer.appendChild(s);
    }
    for (const [x, y, c] of FLOWERS) {
      const s = el("div", "sprite sprite--flower", flowerSprite(c));
      s.style.left = x + "%"; s.style.top = y + "%";
      layer.appendChild(s);
    }
  }

  buildZoneTags() {
    const layer = this.dom.zones;
    layer.innerHTML = "";
    const fire = el("div", "zone-tag zone-tag--fire", "🔥 Wildfire Risk");
    fire.style.left = "2.5%"; fire.style.top = "60%";
    const flood = el("div", "zone-tag zone-tag--flood", "🌊 Flood Risk");
    flood.style.left = "2.5%"; flood.style.top = "92%";
    layer.append(fire, flood);
  }

  buildClouds() {
    const clouds = [
      { top: 9, dur: 70, scale: 1, delay: 0 },
      { top: 20, dur: 98, scale: 0.7, delay: -32 },
      { top: 5, dur: 120, scale: 0.85, delay: -64 },
    ];
    for (const c of clouds) {
      const node = el("div", "cloud", cloudSprite());
      node.style.top = c.top + "%";
      node.style.setProperty("--s", c.scale);
      node.style.animationDuration = c.dur + "s";
      node.style.animationDelay = c.delay + "s";
      this.dom.clouds.appendChild(node);
    }
  }

  bindLegend() {
    this.dom.legendBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const card = this.dom.legendCard;
      card.hidden = !card.hidden;
      this.dom.legendBtn.classList.toggle("is-open", !card.hidden);
    });
    document.addEventListener("click", (e) => {
      if (this.dom.legendCard.hidden) return;
      if (e.target.closest("#legend-card") || e.target.closest("#legend-btn")) return;
      this.dom.legendCard.hidden = true;
      this.dom.legendBtn.classList.remove("is-open");
    });
  }

  bindGlobal() {
    this.dom.primary.addEventListener("click", () => this.onPrimary());
    document.addEventListener("click", (e) => {
      if (
        this.dom.popover.hidden ||
        this.dom.popover.contains(e.target) ||
        e.target.closest(".building")
      ) return;
      this.closePopover();
    });
    window.addEventListener("resize", () => this.closePopover());
  }

  /* ---- title screen ---- */
  setupTitle() {
    const opts = [
      { y: 3, label: "Short Stay", note: "3 years" },
      { y: 5, label: "Cozy Settle", note: "5 years" },
      { y: 10, label: "Long Roots", note: "10 years" },
    ];
    for (const o of opts) {
      const b = el("button", "len-opt" + (o.y === 5 ? " is-on" : ""),
        `${o.label}<small>${o.note}</small>`);
      b.addEventListener("click", () => {
        this.totalYears = o.y;
        [...this.dom.lengthChoice.children].forEach((c) => c.classList.remove("is-on"));
        b.classList.add("is-on");
      });
      this.dom.lengthChoice.appendChild(b);
    }
    this.dom.startBtn.addEventListener("click", () => this.startGame());
  }

  startGame() {
    this.game = new SplashGame({ totalYears: this.totalYears });
    this.stats = { hazards: [], buildingsLost: 0, yearsAllSafe: 0 };
    this.currentHazard = null;
    this.marked = new Set();
    this.dom.title.hidden = true;
    this.dom.report.hidden = true;
    this.dom.journal.innerHTML = "";
    this.game.beginYear();
    this.renderBuildings();
    this.log(`<b>Year ${this.game.year}</b> begins. The town fund holds ${money(this.game.budget)}.`, "j-year");
    this.setPhase("plan");
    this.updateHUD();
  }

  /* ---- HUD ---- */
  updateHUD(flash) {
    const g = this.game;
    this.dom.yearV.textContent = `${g.year} / ${g.totalYears}`;
    this.dom.budgetV.textContent = money(g.budget);
    this.dom.popV.textContent = `${g.totalPopulation}`;
    if (flash === "budget") this.flashStat(this.dom.statBudget);
    if (flash === "pop") this.flashStat(this.dom.statPop);
  }
  flashStat(node) {
    node.classList.remove("stat--flash");
    void node.offsetWidth;
    node.classList.add("stat--flash");
  }

  /* ---- journal ---- */
  log(html, cls = "") {
    const entry = el("div", "j-entry " + cls, html);
    this.dom.journal.appendChild(entry);
    this.dom.journal.scrollTop = this.dom.journal.scrollHeight;
  }

  /* ---- buildings ---- */
  renderBuildings() {
    const g = this.game;
    this.dom.buildings.innerHTML = "";
    for (const prop of g.properties) {
      const pos = POSITIONS[prop];
      const kind = D.PROPERTY_KIND[prop];
      const node = el("div", "building");
      node.style.left = pos.x + "%";
      node.style.top = pos.y + "%";
      node.dataset.prop = prop;
      node.innerHTML = buildingSprite(kind, prop);

      // population pill (residential, functional only)
      const basePop = g.basePopulation[prop];
      if (basePop > 0 && g.buildingFunctional[prop]) {
        node.appendChild(el("div", "building__pop", `🧍 ${g.population[prop]}`));
      }

      // damage state
      if (!g.buildingFunctional[prop]) {
        const cause = g.damageCausedBy[prop];
        node.classList.add("dmg");
        node.appendChild(this.damageLayer(cause));
        if (cause === "earthquake") node.classList.add("dmg-earthquake");
      } else {
        // protection badges
        const badges = el("div", "building__badges");
        if (g.decisions[`wildfire|${prop}`]) badges.appendChild(el("div", "badge", "🔥"));
        if (g.decisions[`earthquake|${prop}`]) badges.appendChild(el("div", "badge", "🪨"));
        const floodSafe =
          (g.isExposed("small_flood", prop) || g.isExposed("big_flood", prop)) &&
          (g.mitigateSmallFlood || g.mitigateBigFlood);
        if (floodSafe) badges.appendChild(el("div", "badge", "💧"));
        if (badges.children.length) node.appendChild(badges);
      }

      node.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onBuildingClick(prop, node);
      });
      this.dom.buildings.appendChild(node);
    }
    this.refreshActionable();
  }

  damageLayer(cause) {
    const layer = el("div", "dmg-layer");
    if (cause === "wildfire") {
      layer.innerHTML = `
        <div class="fire-plume"></div><div class="fire-plume f2"></div><div class="fire-plume f3"></div>
        <div class="smoke"></div>`;
    } else if (cause === "small_flood" || cause === "big_flood") {
      layer.innerHTML = `<div class="water-line"></div>`;
    } else if (cause === "earthquake") {
      layer.innerHTML = `<div class="crack"></div>`;
    }
    return layer;
  }

  refreshActionable() {
    const g = this.game;
    if (!g) return;
    for (const node of this.dom.buildings.children) {
      const prop = node.dataset.prop;
      node.classList.remove("is-actionable", "is-selected", "is-marked");
      let active = false;
      if (this.phase === "plan") {
        active = g.buildingFunctional[prop] && g.propertyMitigationOptions(prop).length > 0;
      } else if (this.phase === "damage") {
        active = g.canBeDamagedBy(this.currentHazard, prop);
        if (this.marked.has(prop)) node.classList.add("is-marked");
      } else if (this.phase === "repair") {
        active = !g.buildingFunctional[prop];
      }
      if (active) node.classList.add("is-actionable");
      if (prop === this.selected) node.classList.add("is-selected");
    }
  }

  /* ---- side panel (changes with the phase) ---- */
  renderPanel() {
    const wrap = this.dom.panel;
    wrap.innerHTML = "";
    if (!this.game) return;
    if (this.phase === "plan") this.renderFloodPanel(wrap);
    else if (this.phase === "hazard") this.renderHazardPicker(wrap);
    else if (this.phase === "damage") this.renderDamagePanel(wrap);
  }

  /* ---- plan phase: town-wide river defenses ---- */
  renderFloodPanel(wrap) {
    const g = this.game;
    const card = el("div", "flood-card" + (g.mitigateSmallFlood ? " is-active" : ""));
    let inner = `<div class="flood-card__row">
        <span class="flood-card__title">🌊 River Defenses</span>
      </div>
      <p class="flood-card__desc">Sandbags and levees protect the whole riverside at once.</p>`;

    if (g.mitigateBigFlood) {
      inner += `<div class="popover__protected">🛡 Big-flood levees stand ready.</div>`;
    } else {
      // small
      if (!g.mitigateSmallFlood) {
        const cost = g.floodMitigationCost("small");
        const can = g.canBuyFlood("small");
        inner += `<button class="act-btn act-btn--flood" data-flood="small" ${can ? "" : "disabled"}>
          <span>Sandbag the banks <small>(small floods)</small></span><span class="cost">${money(cost)}</span></button>`;
      } else {
        inner += `<div class="popover__protected">🛡 Sandbags ready for small floods.</div>`;
      }
      // big / upgrade
      const cost = g.floodMitigationCost("big");
      const can = g.canBuyFlood("big");
      const label = g.mitigateSmallFlood ? "Upgrade to levees <small>(big floods)</small>" : "Build levees <small>(all floods)</small>";
      inner += `<button class="act-btn act-btn--flood" data-flood="big" ${can ? "" : "disabled"} style="margin-top:6px">
        <span>${label}</span><span class="cost">${money(cost)}</span></button>`;
    }
    card.innerHTML = inner;
    card.querySelectorAll("[data-flood]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tier = btn.dataset.flood;
        const cost = this.game.floodMitigationCost(tier);
        if (this.game.buyFloodMitigation(tier)) {
          const label = tier === "big" ? "river levees" : "riverside sandbags";
          this.log(`🌊 Built ${label} for the town (${money(cost)}). The riverside is safer.`, "j-money");
          this.updateHUD("budget");
          this.renderBuildings();
          this.renderPanel();
        }
      });
    });
    wrap.appendChild(card);
  }

  /* ---- hazard entry: the player says what happened ---- */
  renderHazardPicker(wrap) {
    const card = el("div", "entry-card");
    card.innerHTML = `<div class="entry-card__row">
        <span class="entry-card__title">🎲 What happened this year?</span>
      </div>
      <p class="entry-card__desc">Roll the dice, draw the card, ask the room — then record it here. Nothing is decided for you.</p>`;

    const list = el("div", "hz-list");
    for (const hazard of this.game.hazardOptions) {
      const meta = D.HAZARD_META[hazard];
      const btn = el("button", `hz-btn hz-btn--${hazard}`,
        `<span class="hz-btn__ic">${meta.icon}</span><span class="hz-btn__label">${meta.label}</span>`);
      btn.addEventListener("click", () => this.onHazardChosen(hazard));
      list.appendChild(btn);
    }
    card.appendChild(list);
    wrap.appendChild(card);
  }

  /* ---- damage entry: the player says what broke ---- */
  renderDamagePanel(wrap) {
    const g = this.game;
    const hazard = this.currentHazard;
    const meta = D.HAZARD_META[hazard];
    const candidates = g.damageCandidates(hazard);

    const card = el("div", "entry-card");
    card.innerHTML = `<div class="entry-card__row">
        <span class="entry-card__title">${meta.icon} What did the ${meta.label.toLowerCase()} damage?</span>
      </div>
      <p class="entry-card__desc">Tap buildings in town or tick them here. Only those in the hazard's path are listed; 🛡 marks the ones you shielded.</p>`;

    const list = el("div", "dmg-list");
    for (const prop of candidates) {
      const on = this.marked.has(prop);
      const shielded = g.isMitigated(hazard, prop);
      const cost = g.repairCostFor(hazard, prop);
      const btn = el("button", "dmg-item" + (on ? " is-on" : ""),
        `<span class="dmg-item__box">${on ? "✓" : ""}</span>
         <span class="dmg-item__name">${D.PROPERTY_LABEL[prop]}${shielded ? ' <span class="dmg-item__shield" title="Shielded">🛡</span>' : ""}</span>
         <span class="cost">${money(cost)}</span>`);
      btn.addEventListener("click", () => this.toggleMark(prop));
      list.appendChild(btn);
    }
    card.appendChild(list);

    const quick = el("div", "dmg-quick");
    const all = el("button", "mini-btn", "Tick all");
    all.addEventListener("click", () => {
      candidates.forEach((p) => this.marked.add(p));
      this.afterMarkChange();
    });
    const none = el("button", "mini-btn", "Clear");
    none.addEventListener("click", () => {
      this.marked.clear();
      this.afterMarkChange();
    });
    quick.append(all, none);
    card.appendChild(quick);

    wrap.appendChild(card);
  }

  toggleMark(prop) {
    if (this.phase !== "damage") return;
    if (!this.game.canBeDamagedBy(this.currentHazard, prop)) return;
    if (this.marked.has(prop)) this.marked.delete(prop);
    else this.marked.add(prop);
    this.afterMarkChange();
  }

  afterMarkChange() {
    this.renderPanel();
    this.refreshActionable();
    this.updateDamageButton();
  }

  updateDamageButton() {
    const n = this.marked.size;
    this.dom.primary.disabled = false;
    this.dom.primary.textContent =
      n === 0 ? "Nothing was damaged ▸"
              : `Record damage to ${n} building${n === 1 ? "" : "s"} ▸`;
  }

  /* ---- building click → popover ---- */
  onBuildingClick(prop, node) {
    // no poking at the town while the season plays out or a hazard is pending
    if (this.phase === "hazard" || this.phase === "season") return;
    if (this.phase === "damage") {
      this.toggleMark(prop);
      return;
    }
    this.selected = prop;
    this.refreshActionable();
    this.openPopover(prop, node);
  }

  openPopover(prop, node) {
    const g = this.game;
    const pop = this.dom.popover;
    const kind = D.PROPERTY_KIND[prop];
    const label = D.PROPERTY_LABEL[prop];
    const functional = g.buildingFunctional[prop];

    let body = `<h3 class="popover__name">${label}</h3>
      <p class="popover__kind">${KIND_LABEL[kind]}</p>
      <div class="popover__meta">`;

    if (g.basePopulation[prop] > 0) {
      body += `<span class="chip chip--pop">🧍 ${functional ? g.population[prop] : 0} home</span>`;
    } else {
      body += `<span class="chip chip--safe">🏛 serves the town</span>`;
    }

    // risk chips
    const risks = [];
    if (g.isExposed("wildfire", prop)) risks.push("🔥");
    if (g.isExposed("small_flood", prop) || g.isExposed("big_flood", prop)) risks.push("💧");
    risks.push("🪨"); // everything feels the quake
    body += `<span class="chip chip--risk">at risk ${risks.join(" ")}</span>`;
    body += `</div>`;

    if (!functional) {
      const cause = g.damageCausedBy[prop];
      const meta = D.HAZARD_META[cause];
      body += `<div class="popover__meta"><span class="chip chip--dmg">${meta.icon} damaged by ${meta.label.toLowerCase()}</span></div>`;
    }

    body += `<div class="popover__actions" id="pop-actions"></div>`;
    pop.innerHTML = body;

    const actions = pop.querySelector("#pop-actions");
    this.fillPopoverActions(prop, actions);

    // position near the building
    pop.hidden = false;
    const r = node.getBoundingClientRect();
    const pw = 252;
    let left = r.right + 12;
    if (left + pw > window.innerWidth - 12) left = r.left - pw - 12;
    if (left < 12) left = 12;
    let top = r.top + r.height / 2 - 60;
    top = Math.max(12, Math.min(top, window.innerHeight - pop.offsetHeight - 12));
    pop.style.left = left + "px";
    pop.style.top = top + "px";
    // re-clamp after content height known
    requestAnimationFrame(() => {
      let t = r.top + r.height / 2 - pop.offsetHeight / 2;
      t = Math.max(12, Math.min(t, window.innerHeight - pop.offsetHeight - 12));
      pop.style.top = t + "px";
    });
  }

  fillPopoverActions(prop, actions) {
    const g = this.game;
    actions.innerHTML = "";
    const functional = g.buildingFunctional[prop];

    if (!functional) {
      // repair (only acted on in repair phase, but show context anytime)
      const cost = g.repairCost(prop);
      if (this.phase === "repair") {
        const can = g.canRepair(prop);
        const btn = el("button", "act-btn act-btn--repair" + (can ? "" : ""),
          `<span>🔨 Rebuild</span><span class="cost">${money(cost)}</span>`);
        btn.disabled = !can;
        if (!can) btn.title = "Not enough in the town fund.";
        btn.addEventListener("click", () => {
          if (g.repair(prop)) {
            this.log(`🔨 Rebuilt <b>${D.PROPERTY_LABEL[prop]}</b> for ${money(cost)}. Families move back in.`, "j-good");
            this.updateHUD("budget");
            this.renderBuildings();
            // reopen so post-repair mitigation can be bought
            const node = this.findNode(prop);
            this.openPopover(prop, node);
          }
        });
        actions.appendChild(btn);
      } else {
        actions.appendChild(el("p", "popover__note", "Repairs happen after the season has passed."));
      }
      return;
    }

    // mitigation options (wildfire / earthquake)
    const options = g.propertyMitigationOptions(prop);
    for (const opt of options) {
      const meta = D.HAZARD_META[opt.hazard];
      const can = opt.cost <= g.budget;
      const verb = opt.hazard === "wildfire" ? "Fireproof" : "Reinforce";
      const btn = el("button", "act-btn",
        `<span>${meta.icon} ${verb} <small>(${meta.label.toLowerCase()})</small></span><span class="cost">${money(opt.cost)}</span>`);
      btn.disabled = !can;
      btn.addEventListener("click", () => {
        if (g.buyMitigation(opt.hazard, prop)) {
          this.log(`${meta.icon} Protected <b>${D.PROPERTY_LABEL[prop]}</b> from ${meta.label.toLowerCase()} (${money(opt.cost)}).`, "j-money");
          this.updateHUD("budget");
          this.renderBuildings();
          const node = this.findNode(prop);
          this.openPopover(prop, node);
        }
      });
      actions.appendChild(btn);
    }

    // existing protections
    const have = [];
    if (g.decisions[`wildfire|${prop}`]) have.push("🔥 wildfire");
    if (g.decisions[`earthquake|${prop}`]) have.push("🪨 quake");
    if ((g.isExposed("small_flood", prop) || g.isExposed("big_flood", prop)) &&
        (g.mitigateSmallFlood || g.mitigateBigFlood)) have.push("💧 flood");
    if (have.length) actions.appendChild(el("div", "popover__protected", `🛡 Protected: ${have.join(", ")}`));

    if (!options.length && !have.length) {
      const note = (g.isExposed("small_flood", prop) || g.isExposed("big_flood", prop))
        ? "Flood protection is bought town-wide in the ledger."
        : "Nothing more to do here for now.";
      actions.appendChild(el("p", "popover__note", note));
    } else if ((g.isExposed("small_flood", prop) || g.isExposed("big_flood", prop)) &&
               !(g.mitigateSmallFlood || g.mitigateBigFlood)) {
      actions.appendChild(el("p", "popover__note", "Flood defenses are bought town-wide in the ledger."));
    }
  }

  findNode(prop) {
    return [...this.dom.buildings.children].find((n) => n.dataset.prop === prop);
  }

  closePopover() {
    this.dom.popover.hidden = true;
    this.selected = null;
    this.refreshActionable();
  }

  /* ---- phase machine ---- */
  setPhase(phase) {
    this.phase = phase;
    this.closePopover();
    const copy = {
      plan: {
        title: "Plan the Year",
        hint: "Tap any glowing building to shield it, or shore up the river in the ledger. Spend wisely — then see what the season brings.",
        ribbon: "Plan the year",
        btn: "Face the season ▸",
      },
      hazard: {
        title: "The Season Turns",
        hint: "Pick the hazard that struck Cardinal Grove this year. You decide — the town keeps no dice.",
        ribbon: "What happened this year?",
        btn: "Choose a hazard ◂",
      },
      damage: {
        title: "Record the Damage",
        hint: "Mark every building the hazard wrecked. Anything you leave unmarked came through fine.",
        ribbon: "Record the damage",
        btn: "Nothing was damaged ▸",
      },
      repair: {
        title: "Rebuild",
        hint: "Tap the smoking, soaked, or cracked buildings to rebuild them and bring families home.",
        ribbon: "Rebuild the town",
        btn: "Finish the year ▸",
      },
    }[phase];
    this.dom.ledgerPhase.textContent = copy.title;
    this.dom.ledgerHint.textContent = copy.hint;
    this.dom.ribbonText.textContent = copy.ribbon;
    this.dom.primary.textContent = copy.btn;
    // In the hazard phase the only way forward is picking a hazard.
    this.dom.primary.disabled = phase === "hazard";
    this.renderPanel();
    this.refreshActionable();
    if (phase === "damage") this.updateDamageButton();
  }

  onPrimary() {
    if (this.phase === "plan") this.beginSeason();
    else if (this.phase === "damage") this.applyDamageEntry();
    else if (this.phase === "repair") this.endYear();
  }

  /* ---- the season: hazard entry ▸ damage entry ▸ revenue ---- */
  beginSeason() {
    this.closePopover();
    this.currentHazard = null;
    this.marked = new Set();
    this.setPhase("hazard");
  }

  async onHazardChosen(hazard) {
    if (this.phase !== "hazard") return;
    const g = this.game;
    if (!g.isValidHazard(hazard)) return;

    this.currentHazard = hazard;
    this.stats.hazards.push(hazard);
    const meta = D.HAZARD_META[hazard];

    // lock the board while the announcement plays
    this.phase = "season";
    this.dom.panel.innerHTML = "";
    this.dom.primary.disabled = true;
    this.dom.ribbonText.textContent = "The season turns…";
    this.refreshActionable();

    await this.showBanner(meta);
    this.log(`${meta.icon} <b>${meta.label}.</b> ${meta.verb}`,
      hazard === "no_hazard" ? "j-good" : "");

    if (hazard === "no_hazard") {
      this.stats.yearsAllSafe += 1;
      this.log("The town rests easy — no damage to record.", "j-good");
      await this.afterDamage();
      return;
    }

    await this.playHazardFx(hazard);

    const candidates = g.damageCandidates(hazard);
    if (candidates.length === 0) {
      this.log(
        `Nothing left standing lies in the path of ${meta.label.toLowerCase()} — no damage to record.`,
        "j-good"
      );
      await this.afterDamage();
      return;
    }

    this.setPhase("damage");
  }

  async applyDamageEntry() {
    const g = this.game;
    const hazard = this.currentHazard;
    const damaged = g.sanitizeDamageEntry(hazard, [...this.marked]);

    // lock the board while damage lands
    this.phase = "season";
    this.dom.primary.disabled = true;
    this.dom.panel.innerHTML = "";
    this.closePopover();
    this.refreshActionable();

    if (damaged.length === 0) {
      this.log("Every building held. No damage recorded.", "j-good");
    } else {
      g.applyDamage(damaged, hazard);
      this.stats.buildingsLost += damaged.length;
      this.renderBuildings();
      const names = damaged.map((p) => D.PROPERTY_LABEL[p]).join(", ");
      this.log(`Damaged: <b>${names}</b>.`, "j-bad");
      this.updateHUD("pop");
      await wait(600);
    }

    this.marked = new Set();
    await this.afterDamage();
  }

  /* ---- revenue, then on to rebuilding ---- */
  async afterDamage() {
    const g = this.game;
    await wait(400);

    const { byProperty, totalRevenue } = g.collectRevenue();
    this.spawnCoins(byProperty);
    this.updateHUD("budget");
    this.flashStat(this.dom.statPop);
    this.log(`🪙 The town earns <b>${money(totalRevenue)}</b>. Fund is now ${money(g.budget)}.`, "j-money");

    await wait(700);

    if (g.damagedProperties.length > 0) {
      this.setPhase("repair");
    } else {
      this.dom.ribbonText.textContent = "A tidy year";
      this.dom.primary.textContent = "Begin the next year ▸";
      this.dom.primary.disabled = false;
      this.phase = "repair"; // primary → endYear; no damaged buildings to repair
      this.dom.ledgerPhase.textContent = "All Is Well";
      this.dom.ledgerHint.textContent = "Nothing to rebuild this year. Enjoy the calm and carry on.";
      this.renderPanel();
      this.refreshActionable();
    }
  }

  showBanner(meta) {
    const b = this.dom.banner;
    this.dom.bannerIcon.textContent = meta.icon;
    this.dom.bannerTitle.textContent = meta.label;
    this.dom.bannerSub.textContent = meta.verb;
    b.hidden = false;
    b.classList.remove("show");
    void b.offsetWidth;
    b.classList.add("show");
    return wait(1600);
  }

  async playHazardFx(hazard) {
    const scene = this.dom.scene;
    if (hazard === "wildfire") scene.classList.add("flash-fire");
    else if (hazard === "small_flood" || hazard === "big_flood") scene.classList.add("flash-flood");
    else if (hazard === "earthquake") { scene.classList.add("flash-quake", "shaking"); }
    await wait(1400);
    scene.classList.remove("flash-fire", "flash-flood", "flash-quake", "shaking");
  }

  spawnCoins(byProperty) {
    for (const [prop, amount] of Object.entries(byProperty)) {
      if (amount <= 0) continue;
      const node = this.findNode(prop);
      if (!node) continue;
      const sceneRect = this.dom.scene.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      const coin = el("div", "float-coin", `+${money(amount)}`);
      coin.style.left = r.left - sceneRect.left + r.width / 2 - 14 + "px";
      coin.style.top = r.top - sceneRect.top + "px";
      this.dom.fx.appendChild(coin);
      setTimeout(() => coin.remove(), 1500);
    }
  }

  /* ---- end of year ---- */
  endYear() {
    const g = this.game;
    g.recordYear({
      year: g.year,
      hazard: this.stats.hazards[this.stats.hazards.length - 1],
      budget: g.budget,
      population: g.totalPopulation,
    });

    if (g.year >= g.totalYears) {
      this.endGame();
      return;
    }
    g.beginYear();
    this.log(`<b>Year ${g.year}</b> begins. Fund: ${money(g.budget)} · Townsfolk: ${g.totalPopulation}.`, "j-year");
    this.renderBuildings();
    this.setPhase("plan");
    this.updateHUD();
  }

  /* ---- end game report ---- */
  endGame() {
    const g = this.game;
    const popShare = g.totalPopulation / g.basePopulationTotal;
    const functional = g.functionalProperties.length;
    let stars = 1;
    if (popShare >= 0.5) stars = 2;
    if (popShare >= 0.75 && functional >= 9) stars = 3;
    if (popShare >= 0.9 && functional === g.properties.length && g.budget >= 1_000_000) stars = 4;
    if (popShare >= 1 && functional === g.properties.length && g.budget >= 3_000_000) stars = 5;

    const verdicts = {
      1: "Cardinal Grove weathered hard years. The town endures.",
      2: "A scrappy, resilient little town. Folks are proud.",
      3: "A thriving, well-tended home by the river.",
      4: "Cardinal Grove flourishes — a model town.",
      5: "A golden age. Every light is on in Cardinal Grove.",
    };

    const safe = this.stats.yearsAllSafe;
    this.dom.reportCard.innerHTML = `
      <div class="title-card__emblem">🏡</div>
      <h2>The Years Pass…</h2>
      <p class="report-card__verdict">${verdicts[stars]}</p>
      <div class="report-card__stars">${"★".repeat(stars)}${"☆".repeat(5 - stars)}</div>
      <div class="report-grid">
        <div class="report-stat"><span class="n">${money(g.budget)}</span><span class="l">Town Fund</span></div>
        <div class="report-stat"><span class="n">${g.totalPopulation} / ${g.basePopulationTotal}</span><span class="l">Townsfolk Home</span></div>
        <div class="report-stat"><span class="n">${functional} / ${g.properties.length}</span><span class="l">Buildings Standing</span></div>
        <div class="report-stat"><span class="n">${safe}</span><span class="l">Calm Years</span></div>
      </div>
      <button class="primary-btn primary-btn--lg" id="replay-btn">Settle in again ▸</button>
    `;
    this.dom.report.hidden = false;
    this.dom.reportCard.querySelector("#replay-btn")
      .addEventListener("click", () => { this.dom.report.hidden = true; this.dom.title.hidden = false; });
  }
}

/* boot */
window.addEventListener("DOMContentLoaded", () => {
  window.__splash = new SplashUI();
});
