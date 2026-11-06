using UnityEngine;

namespace Foodiverse.Creatures
{
    public enum CreatureAbilityType
    {
        Melt,
        Grow,
        FreezePath
    }

    /// <summary>
    /// Simple ability payload used by Phase 6/7 mission challenges.
    /// </summary>
    public sealed class CreatureAbility : MonoBehaviour
    {
        [SerializeField] string creatureId = "ember";
        [SerializeField] CreatureAbilityType ability = CreatureAbilityType.Melt;
        [SerializeField] float range = 1.2f;

        public string CreatureId => creatureId;
        public CreatureAbilityType Ability => ability;
        public float Range => range;

        public bool TryAffect(ChallengeTarget target)
        {
            if (target == None || target.Solved) return false;
            if (target.RequiredAbility != ability) return false;
            if (Vector3.Distance(transform.position, target.transform.position) > range)
                return false;

            target.Solve();
            Debug.Log($"[FOODIVERSE] {creatureId} used {ability} on {target.name}");
            return true;
        }
    }
}
