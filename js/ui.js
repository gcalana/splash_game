/*
 * Splash — UI controller
 *
 * Drives the cozy diorama: lays out the town, runs the yearly phase machine
 * (Plan ▸ Enter hazard ▸ Enter damage ▸ Harvest ▸ Repair), animates hazards,
 * and wires every decision back to the SplashGame engine.
 *
 * Matches splash_game_oop_manual_input_v4.py: nothing is rolled. The player
 * enters which hazard struck and which buildings it damaged.
 */

// NOTE: the ?v= stamps below must be bumped together with the ones in
// index.html on every deploy. Stamping only index.html is not enough: the
// browser would load a fresh ui.js but keep a cached copy of these imports,
// which shows up as $NaN / missing features. From this folder:
//   grep -rl 'v=13' index.html js | xargs sed -i '' 's/v=13/v=14/g'      (macOS)
import { SplashGame } from "./game.js?v=13";
import * as D from "./data.js?v=13";
/* The painted town supplies all the scenery; sprites.js is no longer used. */

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
  // Guard against undefined/NaN so a stale cached module degrades to a dash
  // instead of rendering "$NaN" all over the report.
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  const trim = (v) => parseFloat(v.toFixed(2)).toString();
  if (a >= 1e6) return `${sign}$${trim(a / 1e6)}M`;
  if (a >= 1e3) return `${sign}$${trim(a / 1e3)}K`;
  return `${sign}$${a}`;
}

/*
 * The town is a painted illustration (img/town.jpg, 1672 x 800 after the
 * painted HUD was cropped off). Each building is an invisible hotspot laid
 * over the artwork, given in the artwork's own pixel coordinates and
 * converted to percentages at render time, so everything scales together.
 */
const ART = { w: 1672, h: 800 };

/* The three homes built to a higher code, as drawn in the artwork. */
const HIGH_CODE_HOUSES = new Set(["House 1", "House 5", "House 6"]);

const HOTSPOTS = {
  "House 1": { x: 35, y: 282, w: 220, h: 193 },
  "House 2": { x: 335, y: 253, w: 164, h: 161 },
  "House 3": { x: 534, y: 150, w: 165, h: 145 },
  "House 4": { x: 690, y: 292, w: 179, h: 153 },
  "House 5": { x: 402, y: 588, w: 254, h: 188 },
  "House 6": { x: 1280, y: 434, w: 241, h: 192 },
  "House 7": { x: 1480, y: 177, w: 188, h: 159 },
  "Apartment Building": { x: 790, y: 16, w: 150, h: 228 },
  "School": { x: 715, y: 449, w: 220, h: 195 },
  "Grocery Store": { x: 1032, y: 646, w: 228, h: 146 },
  "Hospital": { x: 1420, y: 632, w: 195, h: 168 },
};

const KIND_LABEL = {
  house: "Home", apartment: "Apartments",
  grocery: "Grocery", hospital: "Hospital", school: "School",
};

/* ----------------------------------------------------------- scene art */
/*
 * One painted image fills the scene. Everything that used to be drawn as SVG
 * scenery — mountains, forest, river, bridge, meadow — is part of the picture.
 */
const TOWN_ART = "img/town.jpg?v=13";
const TOWN_ALT =
  "A forested mountain town: seven homes, an apartment building, a school, " +
  "a grocery store and a hospital beside a winding river and a timber bridge.";

/* ----------------------------------------------------------- app */
/*
 * Wording for the practice year. Same phases as a real year, but every screen
 * says plainly that nothing counts, so a new player can poke at retrofits,
 * hazards, damage and repairing once before the town is really at stake.
 */
/*
 * Wording for the "what if?" replay of the final year. Same screens as the
 * real final year, labelled so it is clear this run is only an experiment.
 */
const WHATIF_COPY = {
  hazard: {
    title: "What If: The Season Turns",
    hint: "Same town, same plan — pick a different hazard for the final year and see how Cardinal Grove would have fared. This replay isn't saved to your record.",
    ribbon: "What if? · pick a hazard",
  },
  damage: {
    title: "What If: Record the Damage",
    hint: "Mark the buildings this hazard would have wrecked.",
    ribbon: "What if? · record the damage",
  },
  final: {
    title: "What If: The Final Reckoning",
    hint: "As in the real final year, there is no time left to repair.",
    ribbon: "What if? · the years are done",
    btn: "See the what-if results ▸",
  },
};

const TRIAL_COPY = {
  plan: {
    title: "Practice: Plan the Year",
    hint: "This is a practice run — nothing you spend or lose here counts. Tap a glowing building to shield it, or buy river defenses below, then face the season.",
    ribbon: "Practice year · plan",
  },
  hazard: {
    title: "Practice: The Season Turns",
    hint: "Pick any hazard to see what it does to the town. In a real year this is where you record whatever the dice, the cards, or the room decided.",
    ribbon: "Practice year · what happened?",
  },
  damage: {
    title: "Practice: Record the Damage",
    hint: "Mark whichever buildings you like — tap them in town or tick them here. Try marking one to see what a wrecked building looks like.",
    ribbon: "Practice year · record damage",
  },
  repair: {
    title: "Practice: Repair",
    hint: "Tap a damaged building to repair it; undo works here too. When you have seen enough, finish the practice year and the real game begins.",
    ribbon: "Practice year · repair",
    btn: "Finish practice · begin Year 1 ▸",
  },
};

class SplashUI {
  constructor() {
    this.game = null;
    this.phase = "plan";
    this.selected = null;
    this.totalYears = 5;
    this.currentHazard = null;   // hazard the player entered this year
    this.marked = new Set();     // buildings the player marked as damaged
    this.undoStack = [];         // reversible decisions made in this phase
    this.isTrial = false;        // true during the throwaway practice year
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
      undo: $("#undo-btn"),
      skipTrial: $("#skip-trial-btn"),
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
    // the painted town replaces the old SVG diorama and all its scenery
    this.dom.bg.innerHTML =
      `<img class="scene__art" src="${TOWN_ART}" alt="${TOWN_ALT}" draggable="false">`;
    this.dom.scenery.innerHTML = "";
    this.dom.clouds.innerHTML = "";
    this.bindLegend();
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
    this.dom.undo.addEventListener("click", () => this.undoLast());
    this.dom.skipTrial.addEventListener("click", () => this.beginRealGame());
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

  /*
   * Every game opens with a throwaway practice year: one full turn of
   * retrofit ▸ hazard ▸ damage ▸ repair on a town that is thrown away
   * afterwards. beginRealGame() then starts Year 1 from a clean slate.
   */
  startGame() {
    this.isTrial = true;
    this.resetRun();
    this.log(
      "<b>Practice year.</b> One run through the whole cycle — retrofit, hazard, damage, repair. Nothing here counts.",
      "j-year"
    );
    this.log("Spend freely and break things; the town resets when you finish.", "j-undo");
    this.setPhase("plan");
    this.updateHUD();
  }

  beginRealGame() {
    this.isTrial = false;
    this.resetRun();
    this.log(
      `<b>Year ${this.game.year}</b> begins. The town fund holds ${money(this.game.budget)}.`,
      "j-year"
    );
    this.setPhase("plan");
    this.updateHUD();
  }

  /* Fresh town, fresh books — shared by the practice year and the real game. */
  resetRun() {
    this.game = new SplashGame({ totalYears: this.totalYears });
    this.whatIf = false;           // replaying the final year's hazard
    this.finalCheckpoint = null;   // the town just before that hazard
    this.originalEnd = null;       // the town as the real game ended
    this.originalCsv = null;       // the record, frozen at the real ending
    this.originalSummary = null;   // headline numbers, for the comparison
    this.stats = { hazards: [], buildingsLost: 0, yearsAllSafe: 0 };
    this.currentHazard = null;
    this.marked = new Set();
    this.undoStack = [];
    this.dom.title.hidden = true;
    this.dom.report.hidden = true;
    this.dom.journal.innerHTML = "";
    this.game.beginYear();
    this.renderBuildings();
  }

  /* ---- HUD ---- */
  updateHUD(flash) {
    const g = this.game;
    this.dom.yearV.textContent = this.isTrial ? "Practice" : `${g.year} / ${g.totalYears}`;
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
      const box = HOTSPOTS[prop];
      const node = el("div", "building");
      // the building is painted into the artwork; this is just its footprint
      node.style.left = (box.x / ART.w) * 100 + "%";
      node.style.top = (box.y / ART.h) * 100 + "%";
      node.style.width = (box.w / ART.w) * 100 + "%";
      node.style.height = (box.h / ART.h) * 100 + "%";
      node.dataset.prop = prop;
      node.title = prop;

      // damage state
      if (!g.buildingFunctional[prop]) {
        const cause = g.damageCausedBy[prop];
        node.classList.add("dmg", `dmg--${cause}`);
        node.appendChild(el("div", "building__scrim"));
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
        // every building has a retrofit available at the start of the year,
        // so highlighting them all would say nothing — leave the map clean
        active = false;
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
        const undoPoint = this.game.snapshot();
        if (this.game.buyFloodMitigation(tier)) {
          this.undoStack.push({
            label: tier === "big" ? "the river levees" : "the riverside sandbags",
            snap: undoPoint,
          });
          this.renderUndo();
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

    const build = kind === "house"
      ? (HIGH_CODE_HOUSES.has(prop) ? " · built to a higher code" : " · older building code")
      : "";

    let body = `<h3 class="popover__name">${label}</h3>
      <p class="popover__kind">${KIND_LABEL[kind]}${build}</p>
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
          `<span>🔨 Repair</span><span class="cost">${money(cost)}</span>`);
        btn.disabled = !can;
        if (!can) btn.title = "Not enough in the town fund.";
        btn.addEventListener("click", () => {
          const undoPoint = g.snapshot();
          if (g.repair(prop)) {
            this.undoStack.push({ label: `repairing ${D.PROPERTY_LABEL[prop]}`, snap: undoPoint });
            this.log(`🔨 Repaired <b>${D.PROPERTY_LABEL[prop]}</b> for ${money(cost)}. Families move back in.`, "j-good");
            this.renderUndo();
            this.updateHUD("budget");
            this.renderBuildings();
            // reopen so the card reflects the repaired state
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

    // Retrofits are a start-of-year decision only: nothing can be bought once
    // the season has turned, so the repair phase offers repairing and nothing else.
    const canRetrofit = this.phase === "plan";
    const available = g.propertyMitigationOptions(prop);
    const options = canRetrofit ? available : [];
    for (const opt of options) {
      const meta = D.HAZARD_META[opt.hazard];
      const can = opt.cost <= g.budget;
      const verb = opt.hazard === "wildfire" ? "Fireproof" : "Reinforce";
      const btn = el("button", "act-btn",
        `<span>${meta.icon} ${verb} <small>(${meta.label.toLowerCase()})</small></span><span class="cost">${money(opt.cost)}</span>`);
      btn.disabled = !can;
      btn.addEventListener("click", () => {
        const undoPoint = g.snapshot();
        if (g.buyMitigation(opt.hazard, prop)) {
          this.undoStack.push({
            label: `the ${meta.label.toLowerCase()} retrofit on ${D.PROPERTY_LABEL[prop]}`,
            snap: undoPoint,
          });
          this.log(`${meta.icon} Protected <b>${D.PROPERTY_LABEL[prop]}</b> from ${meta.label.toLowerCase()} (${money(opt.cost)}).`, "j-money");
          this.renderUndo();
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

    if (!canRetrofit) {
      const note = available.length
        ? "Retrofits are bought at the start of the year, before the season turns."
        : "Nothing more to do here this year.";
      actions.appendChild(el("p", "popover__note", note));
      return;
    }

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

  /* ---- year log ----
   *
   * The CSV needs more than the HUD shows, so each year is measured at its
   * phase boundaries: what the town looked like when planning opened, what
   * changed by the time the hazard was entered, what the hazard broke, and
   * what was repaired. Deriving everything from snapshots (rather than adding
   * up purchases as they happen) means undo needs no special handling.
   */
  startYearLog() {
    const g = this.game;
    this.yearLog = {
      startBudget: g.budget,
      startPopulation: g.totalPopulation,
      startValue: g.townValueLeft,
      startDecisions: Object.keys(g.decisions),
      startSmallFlood: g.mitigateSmallFlood,
      startBigFlood: g.mitigateBigFlood,
      retrofits: [],
      retrofitSpend: 0,
      floodBought: "",
      floodSpend: 0,
      damaged: [],
      repaired: [],
      repairSpend: 0,
      revenue: 0,
    };
  }

  /* Called once the hazard is entered: everything before it was planning. */
  closePlanLog() {
    const g = this.game;
    const log = this.yearLog;
    if (!log) return;

    const bought = Object.keys(g.decisions).filter((k) => !log.startDecisions.includes(k));
    log.retrofits = bought.map((k) => {
      const [hazard, prop] = k.split("|");
      return `${prop} (${hazard})`;
    });
    if (g.mitigateBigFlood && !log.startBigFlood) log.floodBought = "levees (big flood)";
    else if (g.mitigateSmallFlood && !log.startSmallFlood) log.floodBought = "sandbags (small flood)";

    const spent = log.startBudget - g.budget;
    // split the planning spend between per-building retrofits and the levee
    const floodCost = log.floodBought
      ? (log.floodBought.startsWith("levees")
          ? D.BIG_FLOOD_MITIGATION_COST
          : D.SMALL_FLOOD_MITIGATION_COST)
      : 0;
    log.floodSpend = Math.min(floodCost, Math.max(0, spent));
    log.retrofitSpend = Math.max(0, spent - log.floodSpend);
  }

  /* ---- undo ----
   *
   * Every spending decision is stacked with a snapshot taken just before it,
   * so undo is "put the town back the way it was". The stack is wiped at each
   * phase change: once you have seen the hazard you cannot un-buy a retrofit,
   * and once the year is closed the books are closed.
   */
  pushUndo(label) {
    this.undoStack.push({ label, snap: this.game.snapshot() });
    this.renderUndo();
  }

  clearUndo() {
    this.undoStack = [];
    this.renderUndo();
  }

  /* The skip link only appears in the practice year, and only in the two
     phases where no animation is mid-flight. */
  renderTrialChrome() {
    const btn = this.dom.skipTrial;
    if (!btn) return;
    btn.hidden = !(this.isTrial && (this.phase === "plan" || this.phase === "repair"));
  }

  renderUndo() {
    const btn = this.dom.undo;
    if (!btn) return;
    // Only the two decision phases have anything to take back.
    const undoable = this.phase === "plan" || this.phase === "repair";
    const last = this.undoStack[this.undoStack.length - 1];

    // Stay visible (greyed out) through the decision phases so the control is
    // discoverable before the first purchase; hide it only when the phase
    // itself has no decisions to reverse.
    btn.hidden = !undoable;
    btn.disabled = !last;
    btn.textContent = last ? `↩ Undo ${last.label}` : "↩ Nothing to undo yet";
  }

  undoLast() {
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.game.restore(entry.snap);
    this.log(`↩ Undid ${entry.label}. The fund is back to ${money(this.game.budget)}.`, "j-undo");
    this.closePopover();
    this.renderBuildings();
    this.renderPanel();
    this.refreshActionable();
    this.updateHUD();
    this.renderUndo();
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
      final: {
        title: "The Final Reckoning",
        hint: "The last season has passed. There is no time left to repair — whatever stands, stands.",
        ribbon: "The years are done",
        btn: "See how the years went ▸",
      },
      repair: {
        title: "Repair",
        hint: "Tap the smoking, soaked, or cracked buildings to repair them. Retrofits wait until next year's planning. This year's revenue lands once you finish the year.",
        ribbon: "Repair the town",
        btn: "Finish the year ▸",
      },
    }[phase];
    // The practice year reuses every phase, just says so on every screen.
    if (this.isTrial && TRIAL_COPY[phase]) Object.assign(copy, TRIAL_COPY[phase]);
    if (this.whatIf && WHATIF_COPY[phase]) Object.assign(copy, WHATIF_COPY[phase]);

    this.dom.ledgerPhase.textContent = copy.title;
    this.dom.ledgerHint.textContent = copy.hint;
    this.dom.ribbonText.textContent = copy.ribbon;
    this.dom.primary.textContent = copy.btn;
    // In the hazard phase the only way forward is picking a hazard.
    this.dom.primary.disabled = phase === "hazard";
    if (phase === "plan") this.startYearLog();
    this.clearUndo();
    this.renderTrialChrome();
    this.renderPanel();
    this.refreshActionable();
    if (phase === "damage") this.updateDamageButton();
  }

  onPrimary() {
    if (this.phase === "plan") this.beginSeason();
    else if (this.phase === "damage") this.applyDamageEntry();
    else if (this.phase === "repair") this.endYear();
    else if (this.phase === "final") this.endYear();
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

    this.closePlanLog();

    // Remember the town exactly as it stood when the final year's hazard was
    // entered, so the report can offer a "what if?" replay of that hazard.
    if (!this.isTrial && !this.whatIf && g.year >= g.totalYears) {
      this.finalCheckpoint = this.captureRun();
    }

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
      if (this.yearLog) this.yearLog.damaged = [...damaged];
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

  /* ---- on to repairing (revenue comes after, as in the Python) ---- */
  async afterDamage() {
    const g = this.game;
    await wait(400);

    // the repair phase starts here; note what is broken and what is in hand
    if (this.yearLog) {
      this.yearLog.repairStartBudget = g.budget;
      this.yearLog.brokenAtRepairStart = g.damagedProperties;
    }

    // After the final year's hazard there is no repairing — the game is over
    // as soon as the damage is recorded. (The practice year is exempt.)
    if (!this.isTrial && g.year >= g.totalYears) {
      this.setPhase("final");
      return;
    }

    if (g.damagedProperties.length > 0) {
      this.setPhase("repair");
    } else {
      this.dom.ribbonText.textContent = this.isTrial ? "Practice year · nothing broke" : "A tidy year";
      this.dom.primary.textContent = this.isTrial
        ? "Finish practice · begin Year 1 ▸"
        : "Begin the next year ▸";
      this.dom.primary.disabled = false;
      this.phase = "repair"; // primary → endYear; no damaged buildings to repair
      this.clearUndo();
      this.dom.ledgerPhase.textContent = this.isTrial ? "Practice: All Is Well" : "All Is Well";
      this.dom.ledgerHint.textContent = this.isTrial
        ? "Nothing broke, so there is nothing to repair. Finish the practice year to start for real."
        : "Nothing to repair this year. Enjoy the calm and carry on.";
      this.renderTrialChrome();
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
      // position relative to the fx layer, which sits inside the art board
      const layerRect = this.dom.fx.getBoundingClientRect();
      const r = node.getBoundingClientRect();
      const coin = el("div", "float-coin", `+${money(amount)}`);
      coin.style.left = r.left - layerRect.left + r.width / 2 - 14 + "px";
      coin.style.top = r.top - layerRect.top + "px";
      this.dom.fx.appendChild(coin);
      setTimeout(() => coin.remove(), 1500);
    }
  }

  /* ---- end of year: revenue, then close the books ---- */
  async endYear() {
    const g = this.game;

    // Revenue is collected after the repair phase, exactly as in
    // splash_game_oop_manual_input_v4.py, so repairs are paid for out of
    // the budget the town started the year with.
    this.dom.primary.disabled = true;

    // close out the repair phase before revenue lands
    const log = this.yearLog;
    if (log) {
      const brokenNow = g.damagedProperties;
      log.repaired = (log.brokenAtRepairStart || []).filter((p) => !brokenNow.includes(p));
      log.repairSpend = Math.max(0, (log.repairStartBudget ?? g.budget) - g.budget);
    }

    const { byProperty, totalRevenue } = g.collectRevenue();
    this.spawnCoins(byProperty);
    this.updateHUD("budget");
    this.flashStat(this.dom.statPop);
    this.log(`🪙 The town earns <b>${money(totalRevenue)}</b>. Fund is now ${money(g.budget)}.`, "j-money");
    await wait(1100);

    // The practice year is thrown away: nothing recorded, nothing carried over.
    if (this.isTrial) {
      this.beginRealGame();
      return;
    }

    if (log) log.revenue = totalRevenue;

    g.recordYear({
      year: g.year,
      hazard: this.stats.hazards[this.stats.hazards.length - 1],
      budget: g.budget,
      population: g.totalPopulation,

      // everything the CSV reports, measured across the year
      startBudget: log?.startBudget ?? null,
      startPopulation: log?.startPopulation ?? null,
      startValue: log?.startValue ?? null,
      retrofits: log?.retrofits ?? [],
      retrofitSpend: log?.retrofitSpend ?? 0,
      floodBought: log?.floodBought ?? "",
      floodSpend: log?.floodSpend ?? 0,
      damaged: log?.damaged ?? [],
      repaired: log?.repaired ?? [],
      repairSpend: log?.repairSpend ?? 0,
      revenue: totalRevenue,
      endValue: g.townValueLeft,
      totalValue: g.finalValue,
      standing: g.functionalProperties.length,
      stillDamaged: g.damagedProperties,
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

  /* ---- the downloadable record ----
   *
   * One CSV: a row per year covering the decisions, the hazard, the damage,
   * the repairs and the money, followed by a summary block of the totals the
   * report shows. Mirrors the columns the Python script writes out.
   */
  buildCsv() {
    const g = this.game;
    const q = (v) => {
      const t = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const row = (cells) => cells.map(q).join(",");
    const list = (a) => (a && a.length ? a.join("; ") : "none");

    const lines = [];
    lines.push(row(["Splash — Cardinal Grove"]));
    lines.push(row(["exported", new Date().toISOString().slice(0, 10)]));
    lines.push(row(["years played", g.year]));
    lines.push("");

    lines.push(row([
      "year", "hazard",
      "starting_budget", "retrofits_bought", "retrofit_spending",
      "flood_defense_bought", "flood_defense_spending",
      "buildings_damaged", "buildings_damaged_count",
      "buildings_repaired", "repair_spending",
      "revenue", "ending_budget",
      "starting_population", "ending_population", "population_change",
      "buildings_standing", "damaged_at_year_end",
      "town_value_standing", "total_value",
    ]));

    for (const r of g.history) {
      lines.push(row([
        r.year, r.hazard,
        r.startBudget, list(r.retrofits), r.retrofitSpend,
        r.floodBought || "none", r.floodSpend,
        list(r.damaged), (r.damaged || []).length,
        list(r.repaired), r.repairSpend,
        r.revenue, r.budget,
        r.startPopulation, r.population,
        (r.population ?? 0) - (r.startPopulation ?? 0),
        r.standing, list(r.stillDamaged),
        r.endValue, r.totalValue,
      ]));
    }

    lines.push("");
    lines.push(row(["FINAL SUMMARY", ""]));
    lines.push(row(["metric", "value"]));
    const summary = [
      ["years_played", g.year],
      ["ending_budget", g.budget],
      ["remaining_population", g.totalPopulation],
      ["original_population", g.basePopulationTotal],
      ["population_over_time", g.populationOverTime],
      ["max_population_over_time", g.maxPopulationOverTime],
      ["population_by_year", g.populationByYear.join("; ")],
      ["buildings_standing", g.functionalProperties.length],
      ["buildings_total", g.properties.length],
      ["damaged_at_end", list(g.damagedProperties)],
      ["original_town_value", g.originalTownValue],
      ["value_left_in_town", g.townValueLeft],
      ["value_lost", g.townValueLost],
      ["final_town_value", g.finalValue],
      ["calm_years", this.stats.yearsAllSafe],
      ["buildings_damaged_total", this.stats.buildingsLost],
      ["hazards_in_order", this.stats.hazards.join("; ")],
    ];
    for (const [k, v] of summary) lines.push(row([k, v]));

    lines.push("");
    lines.push(row(["FINAL STATE BY BUILDING", ""]));
    lines.push(row([
      "building", "standing_at_end", "residents_at_end", "base_residents",
      "build_value", "damaged_by", "wildfire_retrofit", "earthquake_retrofit",
      "flood_defense",
    ]));
    const floodTier = g.mitigateBigFlood ? "levees" : g.mitigateSmallFlood ? "sandbags" : "none";
    for (const prop of g.properties) {
      const exposedToFlood = g.isExposed("small_flood", prop) || g.isExposed("big_flood", prop);
      lines.push(row([
        prop,
        g.buildingFunctional[prop] ? "yes" : "no",
        g.population[prop] ?? 0,
        g.basePopulation[prop] ?? 0,
        D.PROPERTY_COST[prop] ?? 0,
        g.buildingFunctional[prop] ? "" : g.damageCausedBy[prop],
        g.decisions[`wildfire|${prop}`] ? "yes" : (g.isExposed("wildfire", prop) ? "no" : "n/a"),
        g.decisions[`earthquake|${prop}`] ? "yes" : (g.isExposed("earthquake", prop) ? "no" : "n/a"),
        exposedToFlood ? floodTier : "n/a",
      ]));
    }

    return lines.join("\n");
  }

  downloadCsv() {
    // after the game ends the record is frozen, so a what-if replay can
    // never change what gets downloaded
    const csv = this.originalCsv ?? this.buildCsv();
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `cardinal-grove-${this.game.year}-years-${stamp}.csv`;
    // BOM so Excel opens the file as UTF-8
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---- end game report ---- */
  /* ---- saving and restoring a whole run (for the what-if replay) ---- */
  captureRun() {
    const clone = (v) => JSON.parse(JSON.stringify(v));
    return {
      engine: this.game.snapshot(),
      year: this.game.year,
      history: clone(this.game.history),
      stats: clone(this.stats),
      yearLog: clone(this.yearLog ?? null),
    };
  }

  restoreRun(run) {
    const clone = (v) => JSON.parse(JSON.stringify(v));
    this.game.restore(run.engine);
    this.game.year = run.year;
    this.game.history = clone(run.history);
    this.stats = clone(run.stats);
    this.yearLog = clone(run.yearLog);
    this.currentHazard = null;
    this.marked = new Set();
    this.undoStack = [];
  }

  /* ---- what-if replay of the final year's hazard ---- */
  startWhatIf() {
    if (!this.finalCheckpoint) return;
    this.whatIf = true;
    this.restoreRun(this.finalCheckpoint);
    this.dom.report.hidden = true;
    this.closePopover();
    this.renderBuildings();
    this.updateHUD();
    this.log(
      `↺ <b>What if?</b> Year ${this.game.year} again with the same plan — choose a different hazard. ` +
        "This replay isn't saved to your record.",
      "j-year"
    );
    this.setPhase("hazard");
  }

  backToOriginal() {
    if (!this.originalEnd) return;
    this.whatIf = false;
    this.restoreRun(this.originalEnd);
    this.renderBuildings();
    this.updateHUD();
    this.log("← Back to your original results.", "j-undo");
    this.renderReport();
  }

  /* ---- end game report ---- */
  endGame() {
    if (!this.whatIf) {
      // The real game just ended: freeze the record and remember the ending,
      // so nothing done in a what-if replay can change either.
      this.originalCsv = this.buildCsv();
      this.originalEnd = this.captureRun();
      const g = this.game;
      this.originalSummary = {
        hazard: this.stats.hazards[this.stats.hazards.length - 1],
        finalValue: g.finalValue,
        budget: g.budget,
        popOverTime: g.populationOverTime,
        standing: g.functionalProperties.length,
        population: g.totalPopulation,
      };
    }
    this.renderReport();
  }

  /* The four tiles and two totals, for whatever state the town is in now. */
  reportBody() {
    const g = this.game;
    const functional = g.functionalProperties.length;
    const safe = this.stats.yearsAllSafe;
    const popOverTime = g.populationOverTime;
    const maxPopOverTime = g.maxPopulationOverTime;
    const yearChips = g.populationByYear
      .map((n, i) => `<span class="report-years__chip"><b>${n}</b><small>yr ${i + 1}</small></span>`)
      .join("");
    return `
      <div class="report-grid">
        <div class="report-stat"><span class="n">${money(g.budget)}</span><span class="l">Town Fund</span></div>
        <div class="report-stat"><span class="n">${g.totalPopulation} / ${g.basePopulationTotal}</span><span class="l">Townsfolk Home</span></div>
        <div class="report-stat"><span class="n">${functional} / ${g.properties.length}</span><span class="l">Buildings Standing</span></div>
        <div class="report-stat"><span class="n">${safe}</span><span class="l">Calm Years</span></div>
      </div>
      <div class="report-total report-total--value">
        <span class="report-total__n">${money(g.finalValue)}</span>
        <span class="report-total__l">Final Town Value</span>
        <span class="report-total__note">
          ${money(g.townValueLeft)} standing in buildings + ${money(g.budget)} in the fund
        </span>
        <span class="report-total__note">
          ${money(g.townValueLost)} of ${money(g.originalTownValue)} lost to hazards
        </span>
      </div>
      <div class="report-total">
        <span class="report-total__n">${popOverTime.toLocaleString()}</span>
        <span class="report-total__l">Population Over Time</span>
        <span class="report-total__note">
          sum of year-end population · ${popOverTime.toLocaleString()} of a possible ${maxPopOverTime.toLocaleString()}
        </span>
        <div class="report-years">${yearChips}</div>
      </div>`;
  }

  renderReport() {
    const g = this.game;
    const yearWord = g.year === 1 ? "year" : "years";
    const card = this.dom.reportCard;

    if (!this.whatIf) {
      card.innerHTML = `
        <div class="title-card__emblem">🏡</div>
        <h2>The Years Pass…</h2>
        <p class="report-card__verdict">How Cardinal Grove came through ${g.year} ${yearWord}.</p>
        ${this.reportBody()}
        <button class="csv-btn" id="csv-btn">⤓ Download the full record (CSV)</button>
        <button class="whatif-btn" id="whatif-btn">↺ What if the final year's hazard had been different?</button>
        <button class="primary-btn primary-btn--lg" id="replay-btn">Settle in again ▸</button>
      `;
      card.querySelector("#csv-btn").addEventListener("click", () => this.downloadCsv());
    } else {
      const o = this.originalSummary;
      const now = {
        hazard: this.stats.hazards[this.stats.hazards.length - 1],
        finalValue: g.finalValue,
        popOverTime: g.populationOverTime,
        standing: g.functionalProperties.length,
        population: g.totalPopulation,
      };
      const label = (h) => D.HAZARD_META[h]?.label ?? h;
      const delta = (a, b, fmt) => {
        const d = b - a;
        if (d === 0) return `<span class="whatif-delta">no change</span>`;
        const cls = d > 0 ? "whatif-delta whatif-delta--up" : "whatif-delta whatif-delta--down";
        return `<span class="${cls}">${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</span>`;
      };
      const row = (name, a, b, fmt) => `
        <tr><th>${name}</th><td>${fmt(a)}</td><td>${fmt(b)}</td><td>${delta(a, b, fmt)}</td></tr>`;
      const count = (n) => n.toLocaleString();

      card.innerHTML = `
        <div class="title-card__emblem">↺</div>
        <h2>What If…</h2>
        <p class="report-card__verdict">
          Year ${g.year} replayed with <b>${label(now.hazard)}</b> instead of <b>${label(o.hazard)}</b> —
          same plan, different hazard.
        </p>
        <p class="whatif-note">For learning only — this replay is not included in your downloaded record.</p>
        <table class="whatif-compare">
          <thead><tr><th></th><th>Your game</th><th>What if</th><th>Difference</th></tr></thead>
          <tbody>
            ${row("Final Town Value", o.finalValue, now.finalValue, money)}
            ${row("Population Over Time", o.popOverTime, now.popOverTime, count)}
            ${row("Buildings Standing", o.standing, now.standing, count)}
            ${row("Townsfolk Home", o.population, now.population, count)}
          </tbody>
        </table>
        ${this.reportBody()}
        <button class="whatif-btn" id="whatif-btn">↺ Try a different hazard</button>
        <button class="csv-btn" id="back-btn">← Back to my original results</button>
        <button class="primary-btn primary-btn--lg" id="replay-btn">Settle in again ▸</button>
      `;
      card.querySelector("#back-btn").addEventListener("click", () => this.backToOriginal());
    }

    this.dom.report.hidden = false;
    card.querySelector("#whatif-btn").addEventListener("click", () => this.startWhatIf());
    card.querySelector("#replay-btn")
      .addEventListener("click", () => { this.dom.report.hidden = true; this.dom.title.hidden = false; });
  }
}

/* boot */
window.addEventListener("DOMContentLoaded", () => {
  window.__splash = new SplashUI();
});
