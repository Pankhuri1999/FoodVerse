using Foodiverse.Ingredients;
using UnityEngine;

namespace Foodiverse.Input
{
    /// <summary>
    /// Maps normalized webcam hand coords into a kitchen play volume
    /// and drives pinch-based grabbing.
    /// </summary>
    public sealed class HandCursorController : MonoBehaviour
    {
        [SerializeField] HandUdpReceiver inputSource;
        [SerializeField] Transform cursor;
        [SerializeField] Renderer cursorRenderer;
        [SerializeField] Vector3 playAreaMin = new Vector3(-0.45f, 0.05f, 0.2f);
        [SerializeField] Vector3 playAreaMax = new Vector3(0.45f, 0.55f, 0.7f);
        [SerializeField] float followSpeed = 18f;
        [SerializeField] float grabRadius = 0.12f;
        [SerializeField] Color openColor = new Color(1f, 0.85f, 0.35f, 0.9f);
        [SerializeField] Color pinchColor = new Color(0.35f, 1f, 0.55f, 0.95f);
        [SerializeField] LayerMask grabbableMask = ~0;

        GrabbableIngredient _held;
        MaterialPropertyBlock _block;
        static readonly int ColorId = Shader.PropertyToID("_BaseColor");
        static readonly int ColorIdFallback = Shader.PropertyToID("_Color");

        public bool IsPinching { get; private set; }
        public bool HasHand { get; private set; }

        public void Configure(HandUdpReceiver source, Transform cursorTransform, Renderer renderer)
        {
            inputSource = source;
            cursor = cursorTransform;
            cursorRenderer = renderer;
        }

        void Awake()
        {
            if (inputSource == null)
                inputSource = FindFirstObjectByType<HandUdpReceiver>();
            if (cursor == null)
                cursor = transform;
            if (cursorRenderer == null)
                cursorRenderer = GetComponentInChildren<Renderer>();
            _block = new MaterialPropertyBlock();
        }

        void Update()
        {
            if (inputSource == null) return;

            HandInputState hand = inputSource.Current;
            HasHand = hand.Detected;
            IsPinching = hand.Detected && hand.Pinch;

            if (hand.Detected)
            {
                Vector3 target = MapToPlayArea(hand);
                cursor.position = Vector3.Lerp(cursor.position, target, 1f - Mathf.Exp(-followSpeed * Time.deltaTime));
            }

            UpdateCursorColor();
            UpdateGrab();
        }

        Vector3 MapToPlayArea(HandInputState hand)
        {
            // Webcam: x right, y down. Unity play volume: x right, y up, z depth.
            float x = Mathf.Lerp(playAreaMin.x, playAreaMax.x, hand.X);
            float y = Mathf.Lerp(playAreaMax.y, playAreaMin.y, hand.Y);
            float z = Mathf.Lerp(playAreaMin.z, playAreaMax.z, hand.Z);
            return new Vector3(x, y, z);
        }

        void UpdateGrab()
        {
            if (IsPinching)
            {
                if (_held == null)
                {
                    TryGrab();
                }
                else
                {
                    _held.Follow(cursor.position);
                }
            }
            else if (_held != null)
            {
                _held.Release();
                _held = null;
            }
        }

        void TryGrab()
        {
            Collider[] hits = Physics.OverlapSphere(cursor.position, grabRadius, grabbableMask, QueryTriggerInteraction.Collide);
            float best = float.MaxValue;
            GrabbableIngredient nearest = null;
            foreach (Collider hit in hits)
            {
                var item = hit.GetComponentInParent<GrabbableIngredient>();
                if (item == null || !item.CanGrab) continue;
                float d = (hit.ClosestPoint(cursor.position) - cursor.position).sqrMagnitude;
                if (d < best)
                {
                    best = d;
                    nearest = item;
                }
            }

            if (nearest != null)
            {
                _held = nearest;
                _held.Grab(cursor);
            }
        }

        void UpdateCursorColor()
        {
            if (cursorRenderer == null) return;
            Color c = !HasHand ? new Color(0.5f, 0.5f, 0.55f, 0.35f)
                : IsPinching ? pinchColor
                : openColor;
            cursorRenderer.GetPropertyBlock(_block);
            _block.SetColor(ColorId, c);
            _block.SetColor(ColorIdFallback, c);
            cursorRenderer.SetPropertyBlock(_block);
        }

        void OnDrawGizmosSelected()
        {
            Gizmos.color = new Color(1f, 0.8f, 0.2f, 0.25f);
            Vector3 center = (playAreaMin + playAreaMax) * 0.5f;
            Vector3 size = playAreaMax - playAreaMin;
            Gizmos.DrawWireCube(center, size);
            Gizmos.color = Color.green;
            Gizmos.DrawWireSphere(cursor != null ? cursor.position : transform.position, grabRadius);
        }
    }
}
