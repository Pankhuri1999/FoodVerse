using System;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using UnityEngine;

namespace Foodiverse.Input
{
    /// <summary>
    /// Listens for JSON hand packets from hand_tracking/unity_bridge.py.
    /// </summary>
    public sealed class HandUdpReceiver : MonoBehaviour, IHandInputSource
    {
        [SerializeField] int port = 5005;

        readonly object _lock = new object();
        HandInputState _latest = HandInputState.Empty;
        HandInputState _current = HandInputState.Empty;

        UdpClient _client;
        Thread _thread;
        volatile bool _running;

        public HandInputState Current => _current;

        void OnEnable()
        {
            StartReceiver();
        }

        void OnDisable()
        {
            StopReceiver();
        }

        void Update()
        {
            lock (_lock)
            {
                _current = _latest;
            }
        }

        void StartReceiver()
        {
            StopReceiver();
            try
            {
                _client = new UdpClient(port);
                _running = true;
                _thread = new Thread(ReceiveLoop)
                {
                    IsBackground = true,
                    Name = "FoodiverseHandUdp"
                };
                _thread.Start();
                Debug.Log($"[FOODIVERSE] Listening for hand input on UDP :{port}");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[FOODIVERSE] Failed to bind UDP port {port}: {ex.Message}");
            }
        }

        void StopReceiver()
        {
            _running = false;
            try { _client?.Close(); } catch { /* ignore */ }
            _client = null;

            if (_thread != null && _thread.IsAlive)
            {
                _thread.Join(200);
            }
            _thread = null;
        }

        void ReceiveLoop()
        {
            var remote = new IPEndPoint(IPAddress.Any, 0);
            while (_running)
            {
                try
                {
                    byte[] data = _client.Receive(ref remote);
                    string json = Encoding.UTF8.GetString(data);
                    if (TryParse(json, out HandInputState state))
                    {
                        lock (_lock)
                        {
                            _latest = state;
                        }
                    }
                }
                catch (SocketException)
                {
                    if (!_running) break;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[FOODIVERSE] UDP parse issue: {ex.Message}");
                }
            }
        }

        static bool TryParse(string json, out HandInputState state)
        {
            state = HandInputState.Empty;
            try
            {
                var packet = JsonUtility.FromJson<HandPacket>(json);
                state = new HandInputState
                {
                    Detected = packet.detected,
                    X = packet.x,
                    Y = packet.y,
                    Z = packet.z,
                    Pinch = packet.pinch,
                    PinchDistance = packet.pinch_distance
                };
                return true;
            }
            catch
            {
                return false;
            }
        }

        [Serializable]
        class HandPacket
        {
            public bool detected;
            public float x;
            public float y;
            public float z;
            public bool pinch;
            public float pinch_distance;
        }
    }
}
