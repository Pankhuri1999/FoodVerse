using System.Collections.Generic;
using UnityEngine;

namespace Foodiverse.Cooking
{
    /// <summary>
    /// Watches bowl contents + temperature + stir progress and fires recipe discovery.
    /// Desktop: H heat, C cool, N neutral. Stir progresses while hand pinches over bowl.
    /// </summary>
    public sealed class RecipeCooker : MonoBehaviour
    {
        [SerializeField] MixingBowl bowl;
        [SerializeField] RecipeDefinition[] recipes;
        [SerializeField] float stirGain = 0.35f;

        BowlTemperature _temperature = BowlTemperature.Neutral;
        float _stir;
        readonly HashSet<string> _discovered = new HashSet<string>();
        bool _cooked;

        public BowlTemperature Temperature => _temperature;
        public float Stir => _stir;
        public IReadOnlyCollection<string> Discovered => _discovered;

        public event System.Action<RecipeDefinition> RecipeDiscovered;

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.H)) SetTemperature(BowlTemperature.Hot);
            if (Input.GetKeyDown(KeyCode.C)) SetTemperature(BowlTemperature.Cold);
            if (Input.GetKeyDown(KeyCode.N)) SetTemperature(BowlTemperature.Neutral);

            if (_cooked || bowl == None || recipes == null) return;

            foreach (var recipe in recipes)
            {
                if (recipe == null) continue;
                if (_discovered.Contains(recipe.recipeId)) continue;
                if (!Matches(recipe)) continue;

                _cooked = true;
                _discovered.Add(recipe.recipeId);
                Debug.Log($"[FOODIVERSE] Discovered {recipe.displayName} → {recipe.creatureName}");
                RecipeDiscovered?.Invoke(recipe);
                break;
            }
        }

        public void AddStir(float amount)
        {
            if (_cooked) return;
            _stir = Mathf.Clamp01(_stir + amount * stirGain);
        }

        public void SetTemperature(BowlTemperature temp)
        {
            _temperature = temp;
            Debug.Log($"[FOODIVERSE] Bowl temperature: {temp}");
        }

        public void ResetCookState()
        {
            _stir = 0f;
            _cooked = false;
            _temperature = BowlTemperature.Neutral;
        }

        bool Matches(RecipeDefinition recipe)
        {
            if (bowl.Contents.Count != recipe.requiredIngredients.Length) return false;
            foreach (string need in recipe.requiredIngredients)
            {
                if (!bowl.Contains(need)) return false;
            }

            if (recipe.requiredTemperature != BowlTemperature.Any &&
                recipe.requiredTemperature != _temperature)
                return false;

            return _stir >= recipe.minStir;
        }
    }
}
