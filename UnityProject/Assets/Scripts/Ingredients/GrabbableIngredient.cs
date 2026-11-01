using UnityEngine;

namespace Foodiverse.Ingredients
{
    /// <summary>
    /// Simple grab target for Phase 2 — cosmic fruit follows the hand while pinched.
    /// </summary>
    [RequireComponent(typeof(Rigidbody))]
    public sealed class GrabbableIngredient : MonoBehaviour
    {
        [SerializeField] float heldDrag = 12f;
        [SerializeField] float releaseInheritVelocity = 0.35f;

        Rigidbody _body;
        Transform _holdPoint;
        Vector3 _lastFollowPos;
        bool _held;

        public bool CanGrab => !_held;

        void Awake()
        {
            _body = GetComponent<Rigidbody>();
            _body.interpolation = RigidbodyInterpolation.Interpolate;
            _body.collisionDetectionMode = CollisionDetectionMode.Continuous;
        }

        public void Grab(Transform holdPoint)
        {
            _held = true;
            _holdPoint = holdPoint;
            _lastFollowPos = transform.position;
            _body.useGravity = false;
            SetVelocity(Vector3.zero);
            _body.angularVelocity = Vector3.zero;
            _body.isKinematic = true;
        }

        public void Follow(Vector3 worldPosition)
        {
            _lastFollowPos = transform.position;
            transform.position = Vector3.Lerp(transform.position, worldPosition, 1f - Mathf.Exp(-heldDrag * Time.deltaTime));
        }

        public void Release()
        {
            if (!_held) return;
            _held = false;
            _holdPoint = null;
            _body.isKinematic = false;
            _body.useGravity = true;
            Vector3 velocity = (transform.position - _lastFollowPos) / Mathf.Max(Time.deltaTime, 0.0001f);
            SetVelocity(velocity * releaseInheritVelocity);
        }

        void SetVelocity(Vector3 velocity)
        {
#if UNITY_6000_0_OR_NEWER
            _body.linearVelocity = velocity;
#else
            _body.velocity = velocity;
#endif
        }
    }
}
