"""
Splash Game - Object-Oriented Version with Annual Decisions

Main idea:
- The game state lives inside SplashGame.
- Each call to run_one_year() updates that state.
- Budget, population, building functionality, unrepaired damage, mitigation,
  and history persist across years.

Yearly order:
1. Decide mitigation for currently undamaged / functional buildings.
2. Simulate hazard.
3. Apply damage.
4. Collect revenue.
5. Decide whether to repair damaged buildings based on budget.
6. If a building is repaired, optionally mitigate it for future years.
"""

from __future__ import annotations

import random
from copy import deepcopy
from typing import Callable, Optional

import pandas as pd


# ============================================================
# Initial parameters
# ============================================================

PROPERTIES = [
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
]


BASE_POPULATION = {
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
}


PROPERTY_COST = {
    "House 1": 350_000,
    "House 2": 200_000,
    "House 3": 250_000,
    "House 4": 500_000,
    "House 5": 350_000,
    "House 6": 350_000,
    "House 7": 250_000,
    "Apartment Building": 1_000_000,
    "Grocery Store": 800_000,
    "Hospital": 3_000_000,
    "School": 1_500_000,
}


STARTING_BUDGET = 1_600_000

RESIDENTIAL_REVENUE_PER_PERSON = 5_000

CITY_POP_REVENUE_RATE = {
    "Grocery Store": 500,
    "Hospital": 2_000,
    "School": 500,
}


DAMAGE_PROBABILITIES = {
    "wildfire": {
        "House 1": {"unmitigated": 4 / 6, "mitigated": 1 / 6},
        "House 2": {"unmitigated": 4 / 6, "mitigated": 1 / 6},
        "House 3": {"unmitigated": 4 / 6, "mitigated": 1 / 6},
        "Apartment Building": {"unmitigated": 4 / 6, "mitigated": 1 / 6},
    },
    "small_flood": {
        "House 5": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "House 6": {"unmitigated": 2 / 6, "mitigated": 1 / 6},
        "House 7": {"unmitigated": 2 / 6, "mitigated": 1 / 6},
        "Grocery Store": {"unmitigated": 2 / 6, "mitigated": 1 / 6},
        "School": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
    },
    "big_flood": {
        "House 5": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "House 6": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "House 7": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "Grocery Store": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "School": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
    },
    "earthquake": {
        "House 1": {"unmitigated": 3 / 6, "mitigated": 1 / 6},
        "House 2": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "House 3": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "House 4": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "House 5": {"unmitigated": 3 / 6, "mitigated": 1 / 6},
        "House 6": {"unmitigated": 3 / 6, "mitigated": 1 / 6},
        "House 7": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "Apartment Building": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "Grocery Store": {"unmitigated": 5 / 6, "mitigated": 1 / 6},
        "Hospital": {"unmitigated": 2 / 6, "mitigated": 0},
        "School": {"unmitigated": 3 / 6, "mitigated": 1 / 6},
    },
}


REPAIR_COSTS = {
    "wildfire": {
        "House 1": 350_000,
        "House 2": 200_000,
        "House 3": 250_000,
        "Apartment Building": 1_000_000,
    },
    "small_flood": {
        "House 5": 250_000,
        "House 6": 175_000,
        "House 7": 125_000,
        "Grocery Store": 400_000,
        "School": 750_000,
    },
    "big_flood": {
        "House 5": 375_000,
        "House 6": 260_000,
        "House 7": 190_000,
        "Grocery Store": 600_000,
        "School": 1_100_000,
    },
    "earthquake": {
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
}


EXPOSED = {
    ("wildfire", "House 1"): True,
    ("wildfire", "House 2"): True,
    ("wildfire", "House 3"): True,
    ("wildfire", "House 4"): False,
    ("wildfire", "House 5"): False,
    ("wildfire", "House 6"): False,
    ("wildfire", "House 7"): False,
    ("wildfire", "Apartment Building"): True,
    ("wildfire", "Grocery Store"): False,
    ("wildfire", "Hospital"): False,
    ("wildfire", "School"): False,

    ("small_flood", "House 1"): False,
    ("small_flood", "House 2"): False,
    ("small_flood", "House 3"): False,
    ("small_flood", "House 4"): False,
    ("small_flood", "House 5"): True,
    ("small_flood", "House 6"): True,
    ("small_flood", "House 7"): True,
    ("small_flood", "Apartment Building"): False,
    ("small_flood", "Grocery Store"): True,
    ("small_flood", "Hospital"): False,
    ("small_flood", "School"): True,

    ("big_flood", "House 1"): False,
    ("big_flood", "House 2"): False,
    ("big_flood", "House 3"): False,
    ("big_flood", "House 4"): False,
    ("big_flood", "House 5"): True,
    ("big_flood", "House 6"): True,
    ("big_flood", "House 7"): True,
    ("big_flood", "Apartment Building"): False,
    ("big_flood", "Grocery Store"): True,
    ("big_flood", "Hospital"): False,
    ("big_flood", "School"): True,

    ("earthquake", "House 1"): True,
    ("earthquake", "House 2"): True,
    ("earthquake", "House 3"): True,
    ("earthquake", "House 4"): True,
    ("earthquake", "House 5"): True,
    ("earthquake", "House 6"): True,
    ("earthquake", "House 7"): True,
    ("earthquake", "Apartment Building"): True,
    ("earthquake", "Grocery Store"): True,
    ("earthquake", "Hospital"): True,
    ("earthquake", "School"): True,
}


MITIGATION_COST = {
    ("wildfire", "House 1"): 20_000,
    ("wildfire", "House 2"): 20_000,
    ("wildfire", "House 3"): 20_000,
    ("wildfire", "Apartment Building"): 40_000,

    ("earthquake", "House 1"): 10_000,
    ("earthquake", "House 2"): 100_000,
    ("earthquake", "House 3"): 125_000,
    ("earthquake", "House 4"): 100_000,
    ("earthquake", "House 5"): 250_000,
    ("earthquake", "House 6"): 10_000,
    ("earthquake", "House 7"): 125_000,
    ("earthquake", "Apartment Building"): 500_000,
    ("earthquake", "Grocery Store"): 400_000,
    ("earthquake", "Hospital"): 100_000,
    ("earthquake", "School"): 100_000,
}


SMALL_FLOOD_MITIGATION_COST = 800_000
BIG_FLOOD_MITIGATION_COST = 1_600_000


class SplashGame:
    def __init__(
        self,
        *,
        properties: Optional[list[str]] = None,
        base_population: Optional[dict[str, int]] = None,
        damage_probabilities: Optional[dict] = None,
        repair_costs: Optional[dict] = None,
        exposed: Optional[dict[tuple[str, str], bool]] = None,
        mitigation_cost: Optional[dict[tuple[str, str], int]] = None,
        starting_budget: int = STARTING_BUDGET,
        residential_revenue_per_person: int = RESIDENTIAL_REVENUE_PER_PERSON,
        city_pop_revenue_rate: Optional[dict[str, int]] = None,
        small_flood_mitigation_cost: int = SMALL_FLOOD_MITIGATION_COST,
        big_flood_mitigation_cost: int = BIG_FLOOD_MITIGATION_COST,
        seed: Optional[int] = None,
        input_func: Callable[[str], str] = input,
    ):
        self.properties = list(properties or PROPERTIES)
        self.base_population = dict(base_population or BASE_POPULATION)
        self.damage_probabilities = damage_probabilities or DAMAGE_PROBABILITIES
        self.repair_costs = repair_costs or REPAIR_COSTS
        self.exposed = exposed or EXPOSED
        self.mitigation_cost = mitigation_cost or MITIGATION_COST

        self.starting_budget = starting_budget
        self.budget = starting_budget

        self.residential_revenue_per_person = residential_revenue_per_person
        self.city_pop_revenue_rate = dict(city_pop_revenue_rate or CITY_POP_REVENUE_RATE)
        self.small_flood_mitigation_cost = small_flood_mitigation_cost
        self.big_flood_mitigation_cost = big_flood_mitigation_cost

        self.rng = random.Random(seed)
        self.input_func = input_func

        self.year = 0
        self.population = self.base_population.copy()
        self.building_functional = {
            property_name: True for property_name in self.properties
        }

        self.damage_caused_by = {
            property_name: "No damage" for property_name in self.properties
        }

        self.damaged_since_year = {
            property_name: None for property_name in self.properties
        }

        self.decisions = {}

        self.mitigate_small_flood = False
        self.mitigate_big_flood = False

        self.history = []

    @property
    def residential_properties(self) -> list[str]:
        return [
            property_name
            for property_name in self.properties
            if self.base_population[property_name] > 0
        ]

    @property
    def total_population(self) -> int:
        return sum(self.population[p] for p in self.residential_properties)

    @property
    def damaged_properties(self) -> list[str]:
        return [
            property_name
            for property_name in self.properties
            if not self.building_functional[property_name]
        ]

    @property
    def functional_properties(self) -> list[str]:
        return [
            property_name
            for property_name in self.properties
            if self.building_functional[property_name]
        ]

    def ask_yes_no(self, question: str) -> bool:
        while True:
            answer = self.input_func(question + " (y/n): ").strip().lower()

            if answer in ["y", "yes"]:
                return True

            if answer in ["n", "no"]:
                return False

            print("Please enter y or n.")

    def ask_and_spend(self, question: str, cost: int) -> bool:
        print()
        print(question)
        print(f"Cost: ${cost:,}")
        print(f"Current budget: ${self.budget:,}")

        if cost > self.budget:
            print("Decision: Cannot buy. Not enough budget.")
            return False

        selected = self.ask_yes_no("Do you want to spend this money?")

        if not selected:
            print("Decision: No.")
            return False

        self.budget -= cost

        print("Decision: Yes.")
        print(f"Spent: ${cost:,}")
        print(f"Remaining budget: ${self.budget:,}")

        return True

    def property_mitigation_options(self, property_name: str) -> list[tuple[str, str]]:
        """
        Only functional / undamaged buildings can be mitigated.
        Damaged buildings must be repaired first.
        """

        if not self.building_functional[property_name]:
            return []

        options = []

        for hazard in ["wildfire", "earthquake"]:
            key = (hazard, property_name)

            is_exposed = self.exposed.get(key, False)
            has_cost = key in self.mitigation_cost
            already_mitigated = self.decisions.get(key, False)

            if is_exposed and has_cost and not already_mitigated:
                options.append(key)

        return options

    def choose_flood_mitigations(self) -> dict[str, bool]:
        decisions = {}

        if self.mitigate_big_flood:
            return decisions

        if not self.mitigate_small_flood:
            selected_small = self.ask_and_spend(
                "Buy small flood mitigation for the whole community?",
                self.small_flood_mitigation_cost,
            )

            decisions["small_flood_community"] = selected_small

            if selected_small:
                self.mitigate_small_flood = True

        if not self.mitigate_big_flood:
            if self.mitigate_small_flood:
                big_flood_cost_now = (
                    self.big_flood_mitigation_cost
                    - self.small_flood_mitigation_cost
                )
                question = "Upgrade from small flood to big flood mitigation?"
            else:
                big_flood_cost_now = self.big_flood_mitigation_cost
                question = "Buy big flood mitigation for the whole community?"

            selected_big = self.ask_and_spend(question, big_flood_cost_now)

            decisions["big_flood_community"] = selected_big

            if selected_big:
                self.mitigate_big_flood = True
                self.mitigate_small_flood = True

        return decisions

    def choose_property_mitigations_for_building(
        self,
        property_name: str,
        *,
        asked_keys_this_year: Optional[set[tuple[str, str]]] = None,
    ) -> dict[tuple[str, str], bool]:

        if asked_keys_this_year is None:
            asked_keys_this_year = set()

        decisions = {}

        for key in self.property_mitigation_options(property_name):
            if key in asked_keys_this_year:
                continue

            hazard, building = key
            cost = self.mitigation_cost[key]

            selected = self.ask_and_spend(
                f"Mitigate {building} against {hazard}?",
                cost,
            )

            asked_keys_this_year.add(key)
            decisions[key] = selected

            if selected:
                self.decisions[key] = True

        return decisions

    def choose_mitigations_for_functional_buildings(
        self,
        *,
        asked_keys_this_year: Optional[set[tuple[str, str]]] = None,
    ) -> dict[tuple[str, str], bool]:

        if asked_keys_this_year is None:
            asked_keys_this_year = set()

        decisions = {}

        for property_name in self.functional_properties:
            decisions.update(
                self.choose_property_mitigations_for_building(
                    property_name,
                    asked_keys_this_year=asked_keys_this_year,
                )
            )

        return decisions

    def annual_mitigation_phase(
        self,
        *,
        asked_keys_this_year: Optional[set[tuple[str, str]]] = None,
    ) -> dict:

        if asked_keys_this_year is None:
            asked_keys_this_year = set()

        starting_budget = self.budget

        print()
        print("Annual mitigation phase:")
        print("You may mitigate any currently functional building that is not already mitigated.")
        print(f"Budget at start of mitigation phase: ${self.budget:,}")

        flood_decisions = self.choose_flood_mitigations()

        property_decisions = self.choose_mitigations_for_functional_buildings(
            asked_keys_this_year=asked_keys_this_year,
        )

        ending_budget = self.budget

        print()
        print("Mitigation phase complete.")
        print(f"Mitigation spending this phase: ${starting_budget - ending_budget:,}")
        print(f"Budget after mitigation phase: ${ending_budget:,}")

        return {
            "starting_budget": starting_budget,
            "ending_budget": ending_budget,
            "spending": starting_budget - ending_budget,
            "flood_decisions": deepcopy(flood_decisions),
            "property_decisions": deepcopy(property_decisions),
        }

    def choose_mitigations(self) -> dict:
        """
        Backward-compatible name.

        In this updated version, this means:
        choose mitigations for the current year.
        """
        return self.annual_mitigation_phase()

    def choose_hazard(self) -> str:
        hazards = [
            "no_hazard",
            "earthquake",
            "wildfire",
            "small_flood",
            "big_flood",
        ]

        probabilities = [
            1 / 10,
            1 / 10,
            3 / 10,
            3 / 10,
            2 / 10,
        ]

        return self.rng.choices(hazards, weights=probabilities, k=1)[0]

    def is_mitigated(self, hazard: str, property_name: str) -> bool:
        if hazard == "wildfire":
            return self.decisions.get(("wildfire", property_name), False)

        if hazard == "earthquake":
            return self.decisions.get(("earthquake", property_name), False)

        if hazard == "small_flood":
            return self.mitigate_small_flood or self.mitigate_big_flood

        if hazard == "big_flood":
            return self.mitigate_big_flood

        return False

    def simulate_damage(self, hazard: str):
        damaged_this_year = {
            property_name: False for property_name in self.properties
        }

        damage_result = {
            property_name: "No damage" for property_name in self.properties
        }

        rolls = {}

        if hazard == "no_hazard":
            for property_name in self.damaged_properties:
                damage_result[property_name] = (
                    f"Already damaged by {self.damage_caused_by[property_name]}"
                )

            return damaged_this_year, damage_result, rolls

        exposed_properties = self.damage_probabilities[hazard]

        for property_name, probabilities in exposed_properties.items():

            if not self.building_functional[property_name]:
                damage_result[property_name] = (
                    f"Already damaged by {self.damage_caused_by[property_name]}"
                )
                continue

            mitigated = self.is_mitigated(hazard, property_name)

            if mitigated:
                damage_probability = probabilities["mitigated"]
            else:
                damage_probability = probabilities["unmitigated"]

            r = self.rng.random()
            was_damaged = r < damage_probability

            rolls[property_name] = {
                "roll": r,
                "damage_probability": damage_probability,
                "mitigated": mitigated,
            }

            if was_damaged:
                damaged_this_year[property_name] = True
                damage_result[property_name] = hazard

        for property_name in self.damaged_properties:
            if not damaged_this_year[property_name]:
                damage_result[property_name] = (
                    f"Already damaged by {self.damage_caused_by[property_name]}"
                )

        return damaged_this_year, damage_result, rolls

    def apply_damage(self, damaged_this_year: dict[str, bool], hazard: str) -> None:
        for property_name, was_damaged in damaged_this_year.items():
            if was_damaged:
                self.building_functional[property_name] = False
                self.population[property_name] = 0
                self.damage_caused_by[property_name] = hazard
                self.damaged_since_year[property_name] = self.year

    def calculate_revenue(self):
        total_city_population = self.total_population
        revenue_by_property = {}

        for property_name in self.properties:
            if not self.building_functional[property_name]:
                revenue_by_property[property_name] = 0

            elif property_name in self.residential_properties:
                revenue_by_property[property_name] = (
                    self.population[property_name]
                    * self.residential_revenue_per_person
                )

            elif property_name in self.city_pop_revenue_rate:
                revenue_by_property[property_name] = (
                    total_city_population
                    * self.city_pop_revenue_rate[property_name]
                )

            else:
                revenue_by_property[property_name] = 0

        total_revenue = sum(revenue_by_property.values())

        return revenue_by_property, total_revenue

    def ask_repairs(
        self,
        *,
        ask_mitigation_after_repair: bool = True,
        asked_keys_this_year: Optional[set[tuple[str, str]]] = None,
    ) -> dict:

        if asked_keys_this_year is None:
            asked_keys_this_year = set()

        starting_budget = self.budget
        repair_spending = 0
        post_repair_mitigation_spending = 0

        repair_decisions = {}
        post_repair_mitigation_decisions = {}

        if not self.damaged_properties:
            return {
                "starting_budget": starting_budget,
                "ending_budget": self.budget,
                "repair_spending": 0,
                "post_repair_mitigation_spending": 0,
                "total_repair_phase_spending": 0,
                "repair_decisions": repair_decisions,
                "post_repair_mitigation_decisions": post_repair_mitigation_decisions,
            }

        print()
        print("Repair phase:")

        for property_name in list(self.damaged_properties):
            cause = self.damage_caused_by[property_name]
            repair_cost = self.repair_costs[cause][property_name]

            print()
            print(f"{property_name} is damaged by {cause}.")
            print(f"Damaged since year: {self.damaged_since_year[property_name]}")
            print(f"Repair cost: ${repair_cost:,}")
            print(f"Current budget: ${self.budget:,}")

            if self.budget < repair_cost:
                print("Decision: Cannot repair. Not enough budget.")
                repair_decisions[property_name] = False
                continue

            repair = self.ask_yes_no(f"Do you want to repair {property_name}?")
            repair_decisions[property_name] = repair

            if not repair:
                print(f"{property_name} was not repaired.")
                continue

            self.budget -= repair_cost
            repair_spending += repair_cost

            self.building_functional[property_name] = True
            self.population[property_name] = self.base_population[property_name]
            self.damage_caused_by[property_name] = "No damage"
            self.damaged_since_year[property_name] = None

            print(f"{property_name} repaired.")
            print(f"Spent on repair: ${repair_cost:,}")
            print(f"Remaining budget: ${self.budget:,}")

            if ask_mitigation_after_repair:
                before_mitigation_budget = self.budget

                mitigation_decisions = self.choose_property_mitigations_for_building(
                    property_name,
                    asked_keys_this_year=asked_keys_this_year,
                )

                post_repair_mitigation_spending += (
                    before_mitigation_budget - self.budget
                )

                if mitigation_decisions:
                    post_repair_mitigation_decisions[property_name] = mitigation_decisions

        ending_budget = self.budget

        return {
            "starting_budget": starting_budget,
            "ending_budget": ending_budget,
            "repair_spending": repair_spending,
            "post_repair_mitigation_spending": post_repair_mitigation_spending,
            "total_repair_phase_spending": starting_budget - ending_budget,
            "repair_decisions": deepcopy(repair_decisions),
            "post_repair_mitigation_decisions": deepcopy(post_repair_mitigation_decisions),
        }

    def run_one_year(self):
        self.year += 1
        starting_budget = self.budget

        asked_mitigation_keys_this_year = set()

        print()
        print("=" * 60)
        print(f"YEAR {self.year}")
        print("=" * 60)
        print(f"Starting budget: ${starting_budget:,}")
        print(f"Starting population: {self.total_population}")

        pre_hazard_mitigation = self.annual_mitigation_phase(
            asked_keys_this_year=asked_mitigation_keys_this_year,
        )

        hazard = self.choose_hazard()

        print()
        print("DISASTER STRIKES!")

        if hazard == "no_hazard":
            print("No hazard occurred this year.")
        elif hazard == "wildfire":
            print("A wildfire occurred.")
        elif hazard == "earthquake":
            print("An earthquake occurred.")
        elif hazard == "small_flood":
            print("A small flood occurred.")
        elif hazard == "big_flood":
            print("A big flood occurred.")

        print(f"Hazard: {hazard}")

        damaged_this_year, damage_result, rolls = self.simulate_damage(hazard)

        self.apply_damage(damaged_this_year, hazard)

        print()
        print("Damage results:")

        for property_name in self.properties:
            if property_name in rolls:
                roll = rolls[property_name]["roll"]
                probability = rolls[property_name]["damage_probability"]
                mitigated = rolls[property_name]["mitigated"]

                print(
                    f"{property_name}: "
                    f"roll={roll:.3f}, "
                    f"damage probability={probability:.3f}, "
                    f"mitigated={mitigated}, "
                    f"result={damage_result[property_name]}"
                )
            else:
                print(f"{property_name}: {damage_result[property_name]}")

        revenue_by_property, total_revenue = self.calculate_revenue()
        self.budget += total_revenue

        print()
        print("Revenue after damage:")

        for property_name, revenue in revenue_by_property.items():
            print(f"{property_name}: ${revenue:,}")

        print()
        print(f"Total revenue after damage: ${total_revenue:,}")
        print(f"Budget after revenue: ${self.budget:,}")

        repair_phase = self.ask_repairs(
            ask_mitigation_after_repair=True,
            asked_keys_this_year=asked_mitigation_keys_this_year,
        )

        repaired = [
            property_name
            for property_name, was_repaired in repair_phase["repair_decisions"].items()
            if was_repaired
        ]

        not_repaired = [
            property_name
            for property_name, was_repaired in repair_phase["repair_decisions"].items()
            if not was_repaired
        ]

        record = {
            "year": self.year,
            "starting_budget": starting_budget,
            "pre_hazard_mitigation": deepcopy(pre_hazard_mitigation),
            "hazard": hazard,
            "damaged_this_year": [
                property_name
                for property_name, was_damaged in damaged_this_year.items()
                if was_damaged
            ],
            "revenue_by_property": deepcopy(revenue_by_property),
            "total_revenue": total_revenue,
            "repair_phase": deepcopy(repair_phase),
            "repair_decisions": deepcopy(repair_phase["repair_decisions"]),
            "repaired": repaired,
            "not_repaired": not_repaired,
            "ending_budget": self.budget,
            "population": deepcopy(self.population),
            "building_functional": deepcopy(self.building_functional),
            "damage_caused_by": deepcopy(self.damage_caused_by),
            "damaged_since_year": deepcopy(self.damaged_since_year),
            "property_mitigations": deepcopy(self.decisions),
            "mitigate_small_flood": self.mitigate_small_flood,
            "mitigate_big_flood": self.mitigate_big_flood,
            "rolls": deepcopy(rolls),
        }

        self.history.append(record)

        print()
        print("End of year results:")
        print(f"Final budget: ${self.budget:,}")
        print(f"Final population: {self.total_population}")

        return record

    def run_years(self, n: int) -> pd.DataFrame:
        for _ in range(n):
            self.run_one_year()

        return self.history_df()

    def history_df(self) -> pd.DataFrame:
        rows = []

        for record in self.history:
            pre_mitigation_spending = record["pre_hazard_mitigation"]["spending"]
            repair_phase = record["repair_phase"]

            rows.append(
                {
                    "year": record["year"],
                    "hazard": record["hazard"],
                    "starting_budget": record["starting_budget"],
                    "pre_hazard_mitigation_spending": pre_mitigation_spending,
                    "total_revenue": record["total_revenue"],
                    "repair_spending": repair_phase["repair_spending"],
                    "post_repair_mitigation_spending": repair_phase[
                        "post_repair_mitigation_spending"
                    ],
                    "total_repair_phase_spending": repair_phase[
                        "total_repair_phase_spending"
                    ],
                    "ending_budget": record["ending_budget"],
                    "damaged_count": len(record["damaged_this_year"]),
                    "repaired_count": len(record["repaired"]),
                    "unrepaired_count": len(record["not_repaired"]),
                    "total_population": sum(record["population"].values()),
                    "functional_buildings": sum(record["building_functional"].values()),
                    "damaged_buildings": ", ".join(record["damaged_this_year"]),
                    "repaired_buildings": ", ".join(record["repaired"]),
                    "unrepaired_buildings": ", ".join(record["not_repaired"]),
                    "small_flood_mitigated": record["mitigate_small_flood"],
                    "big_flood_mitigated": record["mitigate_big_flood"],
                }
            )

        return pd.DataFrame(rows)

    def current_state_df(self) -> pd.DataFrame:
        rows = []

        for property_name in self.properties:
            wildfire_key = ("wildfire", property_name)
            earthquake_key = ("earthquake", property_name)

            rows.append(
                {
                    "property": property_name,
                    "functional": self.building_functional[property_name],
                    "population": self.population[property_name],
                    "damage_caused_by": self.damage_caused_by[property_name],
                    "damaged_since_year": self.damaged_since_year[property_name],
                    "wildfire_mitigated": self.decisions.get(wildfire_key, False),
                    "earthquake_mitigated": self.decisions.get(earthquake_key, False),
                }
            )

        return pd.DataFrame(rows)

    def mitigation_state_df(self) -> pd.DataFrame:
        rows = []

        rows.append(
            {
                "hazard": "small_flood",
                "property": "community",
                "mitigated": self.mitigate_small_flood,
            }
        )

        rows.append(
            {
                "hazard": "big_flood",
                "property": "community",
                "mitigated": self.mitigate_big_flood,
            }
        )

        for key, value in sorted(self.decisions.items()):
            hazard, property_name = key

            rows.append(
                {
                    "hazard": hazard,
                    "property": property_name,
                    "mitigated": value,
                }
            )

        return pd.DataFrame(rows)


if __name__ == "__main__":
    game = SplashGame(seed=42)

    # game.run_one_year()
    # game.run_one_year()
    # game.run_one_year()

    summary = game.run_years(3)

    print()
    print("Year-by-year summary:")
    print(summary)

    print()
    print("Current state:")
    print(game.current_state_df())

    print()
    print("Current mitigation state:")
    print(game.mitigation_state_df())