using UnityEngine;

namespace Foodiverse.WorldBuilding
{
    /// <summary>
    /// Tracks snap sockets and reports when the miniature world is restored.
    /// </summary>
    public sealed class PlanetWorkshop : MonoBehaviour
    {
        [SerializeField] SnapSocket[] sockets;

        public bool Restored { get; private set; }
        public int Progress
        {
            get
            {
                if (sockets == null) return 0;
                int n = 0;
                foreach (var s in sockets)
                    if (s != null && s.Filled) n++;
                return n;
            }
        }

        public event System.Action WorldRestored;

        void Update()
        {
            if (Restored || sockets == null || sockets.Length == 0) return;
            foreach (var socket in sockets)
            {
                if (socket == null || !socket.Filled) return;
            }

            Restored = true;
            Debug.Log("[FOODIVERSE] Miniature world restored!");
            WorldRestored?.Invoke();
        }

        public void ResetWorld()
        {
            Restored = false;
            if (sockets == null) return;
            foreach (var socket in sockets)
                socket?.Clear();
        }
    }
}
