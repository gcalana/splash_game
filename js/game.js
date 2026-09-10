/*
 * Splash — game engine
 *
 * A faithful port of SplashGame from splash_game_oop_manual_input_v4.py.
 *
 * As in v4, nothing here is random: there is no seed, no hazard generation and
 * no damage calculation. The hazard and the list of damaged buildings are
 * supplied from outside (the player enters them), and the engine only applies
 * them. It exposes pure operations (mitigate, apply damage, collect revenue,
 * repair, ...) and the UI orchestrates the yearly phases so we can animate
 * between them.
 */

import * as D from "./data.js";

const key = (hazard, prop) => `${hazard}|${prop}`;

export class SplashGame {
  constructor({ totalYears = 10 } = {}) {
    this.totalYears = totalYears;

    this.startingBudget = D.STARTING_BUDGET;
    this.budget = D.STARTING_BUDGET;
    this.year = 0;

    this.properties = [...D.PROPERTIES];
    this.basePopulation = { ...D.BASE_POPULATION };
    this.population = { ...D.BASE_POPULATION };
    this.buildingFunctional = {};
    this.damageCausedBy = {};
    this.damagedSinceYear = {};
    for (const p of this.properties) {
      this.buildingFunctional[p] = true;
      this.damageCausedBy[p] = "No damage";
      this.damagedSinceYear[p] = null;
    }

    /* per-building wildfire / earthquake mitigation flags, keyed "hazard|prop" */
    this.decisions = {};
    this.mitigateSmallFlood = false;
    this.mitigateBigFlood = false;

    this.history = [];
  }

  /* ----- derived state ----- */
  get residentialProperties() {
    return this.properties.filter((p) => this.basePopulation[p] > 0);
  }
  get totalPopulation() {
    return this.residentialProperties.reduce((s, p) => s + this.population[p], 0);
  }
  get damagedProperties() {
    return this.properties.filter((p) => !this.buildingFunctional[p]);
  }
  get functionalProperties() {
    return this.properties.filter((p) => this.buildingFunctional[p]);
  }
  get basePopulationTotal() {
    return this.residentialProperties.reduce((s, p) => s + this.basePopulation[p], 0);
  }

  isExposed(hazard, prop) {
    return !!D.EXPOSED[key(hazard, prop)];
  }

  /* ----- mitigation ----- */
  isMitigated(hazard, prop) {
    if (hazard === "wildfire") return !!this.decisions[key("wildfire", prop)];
    if (hazard === "earthquake") return !!this.decisions[key("earthquake", prop)];
    if (hazard === "small_flood") return this.mitigateSmallFlood || this.mitigateBigFlood;
    if (hazard === "big_flood") return this.mitigateBigFlood;
    return false;
  }

  /* Per-building wildfire/earthquake mitigation choices still available. */
  propertyMitigationOptions(prop) {
    if (!this.buildingFunctional[prop]) return [];
    const options = [];
    for (const hazard of ["wildfire", "earthquake"]) {
      const k = key(hazard, prop);
      const exposed = !!D.EXPOSED[k];
      const hasCost = k in D.MITIGATION_COST;
      const already = !!this.decisions[k];
      if (exposed && hasCost && !already) {
        options.push({ hazard, prop, cost: D.MITIGATION_COST[k] });
      }
    }
    return options;
  }

  mitigationCost(hazard, prop) {
    return D.MITIGATION_COST[key(hazard, prop)] ?? null;
  }

  buyMitigation(hazard, prop) {
    const cost = this.mitigationCost(hazard, prop);
    if (cost == null || cost > this.budget) return false;
    if (!this.buildingFunctional[prop]) return false;
    if (this.decisions[key(hazard, prop)]) return false;
    this.budget -= cost;
    this.decisions[key(hazard, prop)] = true;
    return true;
  }

  /* Cost to buy the next flood tier right now (accounts for upgrade discount). */
  floodMitigationCost(tier) {
    if (tier === "small") return D.SMALL_FLOOD_MITIGATION_COST;
    if (tier === "big") {
      return this.mitigateSmallFlood
        ? D.BIG_FLOOD_MITIGATION_COST - D.SMALL_FLOOD_MITIGATION_COST
        : D.BIG_FLOOD_MITIGATION_COST;
    }
    return null;
  }

  canBuyFlood(tier) {
    if (this.mitigateBigFlood) return false;
    if (tier === "small" && this.mitigateSmallFlood) return false;
    return this.floodMitigationCost(tier) <= this.budget;
  }

  buyFloodMitigation(tier) {
    if (!this.canBuyFlood(tier)) return false;
    const cost = this.floodMitigationCost(tier);
    this.budget -= cost;
    if (tier === "small") {
      this.mitigateSmallFlood = true;
    } else {
      this.mitigateBigFlood = true;
      this.mitigateSmallFlood = true;
    }
    return true;
  }

  /* ----- hazard (entered by the player) ----- */

  /* Hazard names the player is allowed to enter. */
  get hazardOptions() {
    return [...D.HAZARDS];
  }

  isValidHazard(hazard) {
    return D.HAZARDS.includes(hazard);
  }

  /* ----- damage (entered by the player) ----- */

  /*
   * Buildings the player is allowed to mark as damaged by this hazard:
   * currently standing, exposed to the hazard, and with a repair cost defined
   * for it. Mirrors damage_candidates() in the Python.
   */
  damageCandidates(hazard) {
    if (!hazard || hazard === "no_hazard") return [];
    const costs = D.REPAIR_COSTS[hazard] || {};
    return this.properties.filter(
      (p) => this.buildingFunctional[p] && this.isExposed(hazard, p) && p in costs
    );
  }

  canBeDamagedBy(hazard, prop) {
    return this.damageCandidates(hazard).includes(prop);
  }

  /* Drops anything the player marked that isn't a legal candidate. */
  sanitizeDamageEntry(hazard, marked = []) {
    const allowed = new Set(this.damageCandidates(hazard));
    return [...new Set(marked)].filter((p) => allowed.has(p));
  }

  /* Applies exactly what the player entered — no rolling. */
  applyDamage(damaged, hazard) {
    for (const prop of this.sanitizeDamageEntry(hazard, damaged)) {
      this.buildingFunctional[prop] = false;
      this.population[prop] = 0;
      this.damageCausedBy[prop] = hazard;
      this.damagedSinceYear[prop] = this.year;
    }
  }

  /* ----- revenue ----- */
  calculateRevenue() {
    const total = this.totalPopulation;
    const byProperty = {};
    for (const prop of this.properties) {
      if (!this.buildingFunctional[prop]) {
        byProperty[prop] = 0;
      } else if (this.residentialProperties.includes(prop)) {
        byProperty[prop] = this.population[prop] * D.RESIDENTIAL_REVENUE_PER_PERSON;
      } else if (prop in D.CITY_POP_REVENUE_RATE) {
        byProperty[prop] = total * D.CITY_POP_REVENUE_RATE[prop];
      } else {
        byProperty[prop] = 0;
      }
    }
    const totalRevenue = Object.values(byProperty).reduce((s, v) => s + v, 0);
    return { byProperty, totalRevenue };
  }

  collectRevenue() {
    const { byProperty, totalRevenue } = this.calculateRevenue();
    this.budget += totalRevenue;
    return { byProperty, totalRevenue };
  }

  /* ----- repair ----- */

  /* What repairing prop would cost if this hazard were the one that broke it.
     Used while the player is still deciding what to mark as damaged. */
  repairCostFor(hazard, prop) {
    return D.REPAIR_COSTS[hazard]?.[prop] ?? null;
  }

  repairCost(prop) {
    const cause = this.damageCausedBy[prop];
    if (!(cause in D.REPAIR_COSTS)) return null;
    return D.REPAIR_COSTS[cause][prop] ?? null;
  }

  canRepair(prop) {
    if (this.buildingFunctional[prop]) return false;
    const cost = this.repairCost(prop);
    return cost != null && cost <= this.budget;
  }

  repair(prop) {
    if (!this.canRepair(prop)) return false;
    const cost = this.repairCost(prop);
    this.budget -= cost;
    this.buildingFunctional[prop] = true;
    this.population[prop] = this.basePopulation[prop];
    this.damageCausedBy[prop] = "No damage";
    this.damagedSinceYear[prop] = null;
    return true;
  }

  /* ----- bookkeeping ----- */
  beginYear() {
    this.year += 1;
    return this.year;
  }

  recordYear(record) {
    this.history.push(record);
  }

  /* A cozy resilience score for the end-of-game report. */
  finalScore() {
    const popShare = this.totalPopulation / this.basePopulationTotal;
    const functional = this.functionalProperties.length / this.properties.length;
    return Math.round(
      this.budget / 1000 + this.totalPopulation * 8000 / 1000 + functional * 400
    );
  }
}
