using System.Collections.Generic;
using Foodiverse.Ingredients;
using UnityEngine;

namespace Foodiverse.Cooking
{
    /// <summary>
    /// Collects ingredients that enter the bowl trigger.
    /// </summary>
    [RequireComponent(typeof(Collider))]
    public sealed class MixingBowl : MonoBehaviour
    {
        readonly HashSet<string> _contents = new HashSet<string>();

        public IReadOnlyCollection<string> Contents => _contents;

        public bool Contains(string ingredientId) => _contents.Contains(ingredientId);

        public void Clear() => _contents.Clear();

        void Reset()
        {
            var col = GetComponent<Collider>();
            col.isTrigger = true;
        }

        void OnTriggerEnter(Collider other)
        {
            var ingredient = other.GetComponentInParent<GrabbableIngredient>();
            if (ingredient == null) return;

            string name = ingredient.IngredientId;
            if (_contents.Add(name))
            {
                Debug.Log($"[FOODIVERSE] Bowl received: {name} (total {_contents.Count})");
            }
        }
    }
}
