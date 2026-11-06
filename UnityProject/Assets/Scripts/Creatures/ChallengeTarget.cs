using UnityEngine;

namespace Foodiverse.Creatures
{
    /// <summary>
    /// World challenge solved by a matching creature ability.
    /// </summary>
    public sealed class ChallengeTarget : MonoBehaviour
    {
        [SerializeField] CreatureAbilityType requiredAbility = CreatureAbilityType.Melt;
        [SerializeField] GameObject solvedVisual;
        [SerializeField] GameObject unsolvedVisual;

        public CreatureAbilityType RequiredAbility => requiredAbility;
        public bool Solved { get; private set; }

        public event System.Action<ChallengeTarget> SolvedEvent;

        void Start()
        {
            ApplyVisuals();
        }

        public void Solve()
        {
            if (Solved) return;
            Solved = true;
            ApplyVisuals();
            SolvedEvent?.Invoke(this);
        }

        public void ResetChallenge()
        {
            Solved = false;
            ApplyVisuals();
        }

        void ApplyVisuals()
        {
            if (solvedVisual != null) solvedVisual.SetActive(Solved);
            if (unsolvedVisual != null) unsolvedVisual.SetActive(!Solved);
        }
    }
}
