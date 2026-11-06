using UnityEngine;

namespace Foodiverse.Input
{
    /// <summary>
    /// Stub for Meta Quest native hand tracking.
    /// Implement Current by reading Meta XR Hand / OpenXR hand joints,
    /// then map pinch + palm pose into <see cref="HandInputState"/>.
    /// Enable this component (and disable HandUdpReceiver) for headset builds.
    /// </summary>
    public sealed class QuestHandInputSource : MonoBehaviour, IHandInputSource
    {
        [SerializeField] bool preferRightHand = true;

        HandInputState _current = HandInputState.Empty;

        public HandInputState Current => _current;

        void Update()
        {
            // TODO: Meta XR Hands API
            // 1) Get active HandJoint locations (wrist, thumb tip, index tip).
            // 2) detected = tracking confidence OK
            // 3) x/y = normalized palm position in interaction space (0..1) or world→viewport
            // 4) isPinching = thumb–index distance below threshold (or Meta pinch value)
            // Until wired, leave Empty so webcam UDP path remains the default prototype.
            _current = HandInputState.Empty;
            _ = preferRightHand;
        }
    }
}
