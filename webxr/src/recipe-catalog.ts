import type { IngredientId } from './ingredient-catalog.js';

export type Temperature = 'neutral' | 'hot' | 'cold';

export type RecipeId = 'ember-spark' | 'grove-bloom' | 'mint-current';

export type RecipeDef = {
  id: RecipeId;
  name: string;
  ingredients: readonly IngredientId[];
  temperature: Temperature | 'any';
  minStir: number;
  creatureId: string;
  creatureLabel: string;
  enabled: boolean;
};

export const EMBER_SPARK: RecipeDef = {
  id: 'ember-spark',
  name: 'Ember Spark',
  ingredients: ['cosmic-fruit', 'star-pepper'],
  temperature: 'hot',
  minStir: 0.45,
  creatureId: 'ember-dragon',
  creatureLabel: 'Ember Dragon',
  enabled: true,
};

export const GROVE_BLOOM: RecipeDef = {
  id: 'grove-bloom',
  name: 'Grove Bloom',
  ingredients: ['space-leaves', 'crystal-sugar'],
  temperature: 'any',
  minStir: 0.45,
  creatureId: 'grove-guardian',
  creatureLabel: 'Grove Guardian',
  enabled: true,
};

export const MINT_CURRENT: RecipeDef = {
  id: 'mint-current',
  name: 'Mint Current',
  ingredients: ['chocolate', 'mint-crystal'],
  temperature: 'cold',
  minStir: 0.45,
  creatureId: 'mint-current',
  creatureLabel: 'Mint Current',
  enabled: true,
};

export const RECIPES: readonly RecipeDef[] = [EMBER_SPARK, GROVE_BLOOM, MINT_CURRENT];

export function contentsSet(ids: Iterable<string>): Set<string> {
  return new Set([...ids].filter(Boolean));
}

export function contentsMatch(recipe: RecipeDef, ids: Iterable<string>): boolean {
  const have = contentsSet(ids);
  if (have.size !== recipe.ingredients.length) return false;
  return recipe.ingredients.every((id) => have.has(id));
}

export function temperatureMet(recipe: RecipeDef, temperature: string): boolean {
  return recipe.temperature === 'any' || recipe.temperature === temperature;
}

export function recipeById(id: string | undefined): RecipeDef | undefined {
  if (!id) return undefined;
  return RECIPES.find((recipe) => recipe.id === id);
}

export function recipeForContents(
  ids: Iterable<string>,
  allowedId?: string,
): RecipeDef | undefined {
  if (allowedId === '') return undefined;
  return RECIPES.find(
    (recipe) =>
      recipe.enabled &&
      contentsMatch(recipe, ids) &&
      (!allowedId || recipe.id === allowedId),
  );
}

export function recipeSatisfied(
  recipe: RecipeDef,
  ids: Iterable<string>,
  temperature: string,
  stir: number,
): boolean {
  return (
    recipe.enabled &&
    contentsMatch(recipe, ids) &&
    temperatureMet(recipe, temperature) &&
    stir >= recipe.minStir
  );
}

export function matchRecipe(
  ids: Iterable<string>,
  temperature: string,
  stir: number,
  allowedId?: string,
): RecipeDef | undefined {
  if (allowedId === '') return undefined;
  return RECIPES.find(
    (recipe) =>
      recipeSatisfied(recipe, ids, temperature, stir) &&
      (!allowedId || recipe.id === allowedId),
  );
}

export function recipeByCreature(creatureId: string): RecipeDef | undefined {
  return RECIPES.find((recipe) => recipe.creatureId === creatureId);
}
