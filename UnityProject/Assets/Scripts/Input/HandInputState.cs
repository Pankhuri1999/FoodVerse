namespace Foodiverse.Input
{
    /// <summary>
    /// Normalized hand sample from the Python MediaPipe bridge.
    /// Coordinates match mirrored webcam space (0-1, origin top-left).
    /// </summary>
    [System.Serializable]
    public struct HandInputState
    {
        public bool Detected;
        public float X;
        public float Y;
        public float Z;
        public bool Pinch;
        public float PinchDistance;

        public static HandInputState Empty => new HandInputState
        {
            Detected = false,
            X = 0.5f,
            Y = 0.5f,
            Z = 0.5f,
            Pinch = false,
            PinchDistance = 1f
        };
    }
}
