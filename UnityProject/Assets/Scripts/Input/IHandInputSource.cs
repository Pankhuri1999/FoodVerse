namespace Foodiverse.Input
{
    /// <summary>
    /// Input abstraction so webcam UDP and future Quest hand tracking
    /// can feed the same interaction systems.
    /// </summary>
    public interface IHandInputSource
    {
        HandInputState Current { get; }
    }
}
