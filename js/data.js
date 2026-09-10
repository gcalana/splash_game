/*
 * Splash — game data
 *
 * Ported directly from splash_game_oop_manual_input_v4.py so the browser game
 * shares the exact same balance: costs, exposure and revenue rules.
 *
 * As in v4, there is no damage-probability table and no hazard weighting:
 * the hazard and the damaged buildings are entered by hand each year.
 * EXPOSED still decides which buildings a hazard is *allowed* to damage.
 */

export const PROPERTIES = [
  "House 1",
  "House 2",
  "House 3",
  "House 4",
  "House 5",
  "House 6",
  "House 7",
  "Apartment Building",
  "Grocery Store",
  "Hospital",
  "School",
];

export const BASE_POPULATION = {
  "House 1": 3,
  "House 2": 4,
  "House 3": 2,
  "House 4": 5,
  "House 5": 4,
  "House 6": 5,
  "House 7": 3,
  "Apartment Building": 15,
  "Grocery Store": 0,
  "Hospital": 0,
  "School": 0,
};

export const PROPERTY_COST = {
  "House 1": 350_000,
  "House 2": 200_000,
  "House 3": 250_000,
  "House 4": 200_000,
  "House 5": 500_000,
  "House 6": 350_000,
  "House 7": 250_000,
  "Apartment Building": 1_000_000,
  "Grocery Store": 800_000,
  "Hospital": 3_000_000,
  "School": 1_500_000,
};

export const STARTING_BUDGET = 2_000_000;
export const RESIDENTIAL_REVENUE_PER_PERSON = 5_000;

export const CITY_POP_REVENUE_RATE = {
  "Grocery Store": 1_000,
  "Hospital": 4_000,
  "School": 1_000,
};

export const REPAIR_COSTS = {
  wildfire: {
    "House 1": 350_000,
    "House 2": 200_000,
    "House 3": 250_000,
    "Apartment Building": 1_000_000,
  },
  small_flood: {
    "House 5": 250_000,
    "House 6": 175_000,
    "House 7": 125_000,
    "Grocery Store": 400_000,
    "School": 750_000,
  },
  big_flood: {
    "House 5": 375_000,
    "House 6": 260_000,
    "House 7": 190_000,
    "Grocery Store": 600_000,
    "School": 1_100_000,
  },
  earthquake: {
    "House 1": 350_000,
    "House 2": 200_000,
    "House 3": 250_000,
    "House 4": 200_000,
    "House 5": 500_000,
    "House 6": 350_000,
    "House 7": 250_000,
    "Apartment Building": 1_000_000,
    "Grocery Store": 800_000,
    "Hospital": 3_000_000,
    "School": 1_500_000,
  },
};

export const EXPOSED = {
  "wildfire|House 1": true,
  "wildfire|House 2": true,
  "wildfire|House 3": true,
  "wildfire|House 4": false,
  "wildfire|House 5": false,
  "wildfire|House 6": false,
  "wildfire|House 7": false,
  "wildfire|Apartment Building": true,
  "wildfire|Grocery Store": false,
  "wildfire|Hospital": false,
  "wildfire|School": false,

  "small_flood|House 1": false,
  "small_flood|House 2": false,
  "small_flood|House 3": false,
  "small_flood|House 4": false,
  "small_flood|House 5": true,
  "small_flood|House 6": true,
  "small_flood|House 7": true,
  "small_flood|Apartment Building": false,
  "small_flood|Grocery Store": true,
  "small_flood|Hospital": false,
  "small_flood|School": true,

  "big_flood|House 1": false,
  "big_flood|House 2": false,
  "big_flood|House 3": false,
  "big_flood|House 4": false,
  "big_flood|House 5": true,
  "big_flood|House 6": true,
  "big_flood|House 7": true,
  "big_flood|Apartment Building": false,
  "big_flood|Grocery Store": true,
  "big_flood|Hospital": false,
  "big_flood|School": true,

  "earthquake|House 1": true,
  "earthquake|House 2": true,
  "earthquake|House 3": true,
  "earthquake|House 4": true,
  "earthquake|House 5": true,
  "earthquake|House 6": true,
  "earthquake|House 7": true,
  "earthquake|Apartment Building": true,
  "earthquake|Grocery Store": true,
  "earthquake|Hospital": true,
  "earthquake|School": true,
};

export const MITIGATION_COST = {
  "wildfire|House 1": 20_000,
  "wildfire|House 2": 20_000,
  "wildfire|House 3": 30_000,
  "wildfire|Apartment Building": 40_000,

  "earthquake|House 1": 10_000,
  "earthquake|House 2": 66_667,
  "earthquake|House 3": 83_333,
  "earthquake|House 4": 66_667,
  "earthquake|House 5": 10_000,
  "earthquake|House 6": 10_000,
  "earthquake|House 7": 83_333,
  "earthquake|Apartment Building": 500_000,
  "earthquake|Grocery Store": 200_000,
  "earthquake|Hospital": 300_000,
  "earthquake|School": 100_000,
};

export const SMALL_FLOOD_MITIGATION_COST = 800_000;
export const BIG_FLOOD_MITIGATION_COST = 1_600_000;

/* The hazards the player can enter each year (order used by the picker). */
export const HAZARDS = ["no_hazard", "wildfire", "small_flood", "big_flood", "earthquake"];

/* Presentation-only metadata used by the UI. */
export const HAZARD_META = {
  no_hazard: { label: "A Calm Year", verb: "All is quiet in Cardinal Grove.", icon: "☀️" },
  wildfire: { label: "Wildfire", verb: "Smoke rolls down from the ridge.", icon: "🔥" },
  earthquake: { label: "Earthquake", verb: "The ground gives a deep shudder.", icon: "🪨" },
  small_flood: { label: "Small Flood", verb: "The river creeps over its banks.", icon: "💧" },
  big_flood: { label: "Big Flood", verb: "The river swells and surges through town.", icon: "🌊" },
};

export const PROPERTY_KIND = {
  "House 1": "house",
  "House 2": "house",
  "House 3": "house",
  "House 4": "house",
  "House 5": "house",
  "House 6": "house",
  "House 7": "house",
  "Apartment Building": "apartment",
  "Grocery Store": "grocery",
  "Hospital": "hospital",
  "School": "school",
};

/*
 * Display names. These match the property keys used by
 * splash_game_oop_manual_input_v4.py exactly ("House 1", "Grocery Store", ...)
 * so what you see on screen is what the script calls it.
 */
export const PROPERTY_LABEL = Object.fromEntries(
  PROPERTIES.map((name) => [name, name])
);
