using UnityEngine;

namespace Foodiverse.WorldBuilding
{
    /// <summary>
    /// Placeable edible structure piece for the planet workshop.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public sealed class BuildPiece : MonoBehaviour
    {
        [SerializeField] string pieceId = "cookie_bridge";
        [SerializeField] float heldFollow = 14f;

        Rigidbody _body;
        bool _held;
        bool _placed;
        Transform _hold;

        public string PieceId => pieceId;
        public bool CanGrab => !_held && !_placed;
        public bool Placed => _placed;

        void Awake()
        {
            _body = GetComponent<Rigidbody>();
        }

        public void Grab(Transform holdPoint)
        {
            if (!CanGrab) return;
            _held = true;
            _hold = holdPoint;
            _body.isKinematic = true;
            _body.useGravity = false;
        }

        public void Follow(Vector3 worldPosition)
        {
            if (!_held) return;
            transform.position = Vector3.Lerp(
                transform.position,
                worldPosition,
                1f - Mathf.Exp(-heldFollow * Time.deltaTime));
        }

        public void Release(SnapSocket[] sockets)
        {
            if (!_held) return;
            _held = false;
            _hold = null;

            if (sockets != null)
            {
                foreach (var socket in sockets)
                {
                    if (socket != null && socket.TrySnap(this))
                        return;
                }
            }

            _body.isKinematic = false;
            _body.useGravity = true;
        }

        public void PlaceAt(Vector3 position, Quaternion rotation)
        {
            _placed = true;
            _held = false;
            _hold = null;
            transform.SetPositionAndRotation(position, rotation);
            _body.isKinematic = true;
            _body.useGravity = false;
        }
    }
}
