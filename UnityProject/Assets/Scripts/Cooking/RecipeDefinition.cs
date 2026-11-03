using System;
using UnityEngine;

namespace Foodiverse.Cooking
{
    public enum BowlTemperature
    {
        Neutral,
        Hot,
        Cold,
        Any
    }

    [CreateAssetMenu(menuName = "FOODIVERSE/Recipe", fileName = "Recipe_")]
    public sealed class RecipeDefinition : ScriptableObject
    {
        public string recipeId = "ember_spark";
        public string displayName = "Ember Spark";
        public string creatureName = "Ember Dragon";
        public string[] requiredIngredients = { "Cosmic Fruit", "Star-Pepper" };
        public BowlTemperature requiredTemperature = BowlTemperature.Hot;
        [Range(0f, 1f)] public float minStir = 0.55f;
        public string hint = "Fruit + Pepper, then HEAT and stir";
        public Color discoveryColor = new Color(1f, 0.45f, 0.15f);
    }
}
