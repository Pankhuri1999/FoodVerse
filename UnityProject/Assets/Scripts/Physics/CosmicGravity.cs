using UnityEngine;

namespace Foodiverse.Physics
{
    /// <summary>
    /// Global gravity modes for the Cosmic Kitchen.
    /// Desktop prototype: press G to toggle zero-G.
    /// </summary>
    public sealed class CosmicGravity : MonoBehaviour
    {
        public enum Mode
        {
            Normal,
            ZeroG
        }

        [SerializeField] Mode mode = Mode.Normal;
        [SerializeField] Vector3 normalGravity = new Vector3(0f, -9.81f, 0f);
        [SerializeField] KeyCode toggleKey = KeyCode.G;

        public Mode Current => mode;
        public static CosmicGravity Instance { get; private set; }

        void Awake()
        {
            Instance = this;
            Apply();
        }

        void Update()
        {
            if (Input.GetKeyDown(toggleKey))
                Toggle();
        }

        public void Toggle()
        {
            mode = mode == Mode.Normal ? Mode.ZeroG : Mode.Normal;
            Apply();
            Debug.Log($"[FOODIVERSE] Gravity mode: {mode}");
        }

        public void SetMode(Mode next)
        {
            mode = next;
            Apply();
        }

        void Apply()
        {
            Physics.gravity = mode == Mode.Normal ? normalGravity : Vector3.zero;
        }
    }
}
