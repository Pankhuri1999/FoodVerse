"""Shared recipe definitions for FOODIVERSE cooking (Phase 4+)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import FrozenSet, Optional, Tuple


@dataclass(frozen=True)
class Recipe:
    id: str
    name: str
    ingredients: FrozenSet[str]
    # Required bowl temperature: "hot", "cold", or "any"
    temperature: str
    # Minimum stir progress 0-1
    min_stir: float
    discovery_color: Tuple[int, int, int]  # BGR
    hint: str
    # Phase 6 creature unlock name (previewed in Phase 4)
    creature: str


RECIPES = (
    Recipe(
        id="ember_spark",
        name="Ember Spark",
        ingredients=frozenset({"Cosmic Fruit", "Star-Pepper"}),
        temperature="hot",
        min_stir=0.45,
        discovery_color=(40, 120, 255),
        hint="Fruit + Pepper, then HEAT and wave over bowl",
        creature="Ember Dragon",
    ),
    Recipe(
        id="grove_bloom",
        name="Grove Bloom",
        ingredients=frozenset({"Space Leaves", "Crystal Sugar"}),
        temperature="any",
        min_stir=0.45,
        discovery_color=(80, 200, 100),
        hint="Leaves + Sugar, then wave over bowl",
        creature="Grove Guardian",
    ),
    Recipe(
        id="mint_current",
        name="Mint Current",
        ingredients=frozenset({"Chocolate", "Mint Crystal"}),
        temperature="cold",
        min_stir=0.45,
        discovery_color=(220, 220, 120),
        hint="Chocolate + Mint, then COOL and wave over bowl",
        creature="Mint Current",
    ),
)


def match_recipe(
    contents: set,
    temperature: str,
    stir: float,
) -> Optional[Recipe]:
    """Return the first recipe that matches current bowl state."""
    for recipe in RECIPES:
        if recipe.ingredients != frozenset(contents):
            continue
        if recipe.temperature != "any" and recipe.temperature != temperature:
            continue
        if stir < recipe.min_stir:
            continue
        return recipe
    return None


def hint_for_contents(contents: set) -> str:
    if not contents:
        return "Drop 2 ingredients into the bowl to cook"
    for recipe in RECIPES:
        if contents <= recipe.ingredients:
            missing = recipe.ingredients - contents
            if missing:
                return f"For {recipe.name}: add {', '.join(sorted(missing))}"
            if recipe.temperature == "hot":
                return f"Ready for {recipe.name}: press H, then OPEN-hand wave over bowl"
            if recipe.temperature == "cold":
                return f"Ready for {recipe.name}: press C, then OPEN-hand wave over bowl"
            return f"Ready for {recipe.name}: OPEN-hand wave over the bowl"
    return "Interesting mix... try a known pair (see legend)"
