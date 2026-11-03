using UnityEngine;

namespace Foodiverse.WorldBuilding
{
    /// <summary>
    /// Accepts a matching build piece and snaps it into place.
    /// </summary>
    public sealed class SnapSocket : MonoBehaviour
    {
        [SerializeField] string acceptsPieceId = "cookie_bridge";
        [SerializeField] float snapRadius = 0.15f;
        [SerializeField] Transform snapPoint;

        public bool Filled { get; private set; }
        public string AcceptsPieceId => acceptsPieceId;

        public bool TrySnap(BuildPiece piece)
        {
            if (Filled || piece == null) return false;
            if (piece.PieceId != acceptsPieceId) return false;

            Vector3 target = snapPoint != null ? snapPoint.position : transform.position;
            if (Vector3.Distance(piece.transform.position, target) > snapRadius)
                return false;

            piece.PlaceAt(target, transform.rotation);
            Filled = true;
            Debug.Log($"[FOODIVERSE] Snapped {piece.PieceId} into {name}");
            return true;
        }

        public void Clear()
        {
            Filled = false;
        }

        void OnDrawGizmosSelected()
        {
            Gizmos.color = Color.cyan;
            Vector3 p = snapPoint != null ? snapPoint.position : transform.position;
            Gizmos.DrawWireSphere(p, snapRadius);
        }
    }
}
