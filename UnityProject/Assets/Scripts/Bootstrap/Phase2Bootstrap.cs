using Foodiverse.Ingredients;
using Foodiverse.Input;
using UnityEngine;

namespace Foodiverse.Bootstrap
{
    /// <summary>
    /// Builds the Phase 2 demo at play time: kitchen volume, hand cursor,
    /// UDP receiver, and one cosmic fruit. Drop this on an empty GameObject
    /// in any scene and press Play.
    /// </summary>
    public sealed class Phase2Bootstrap : MonoBehaviour
    {
        [SerializeField] bool buildOnAwake = true;

        void Awake()
        {
            if (buildOnAwake)
                BuildDemo();
        }

        [ContextMenu("Build Phase 2 Demo")]
        public void BuildDemo()
        {
            EnsureLighting();
            EnsureCamera();
            EnsureTable();
            var fruit = EnsureCosmicFruit();
            EnsureHandRig(fruit);
            Debug.Log("[FOODIVERSE] Phase 2 demo ready. Run hand_tracking/run_bridge.bat while Play mode is active.");
        }

        static void EnsureLighting()
        {
            if (Object.FindFirstObjectByType<Light>() != null) return;
            var lightGo = new GameObject("Key Light");
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.color = new Color(1f, 0.95f, 0.88f);
            light.intensity = 1.1f;
            lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.25f, 0.22f, 0.35f);
        }

        static void EnsureCamera()
        {
            Camera cam = Camera.main;
            if (cam == null)
            {
                var camGo = new GameObject("Main Camera");
                camGo.tag = "MainCamera";
                cam = camGo.AddComponent<Camera>();
                camGo.AddComponent<AudioListener>();
            }

            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.06f, 0.05f, 0.12f);
            cam.transform.position = new Vector3(0f, 0.55f, -1.1f);
            cam.transform.rotation = Quaternion.Euler(12f, 0f, 0f);
            cam.nearClipPlane = 0.05f;
        }

        static void EnsureTable()
        {
            if (GameObject.Find("KitchenTable") != null) return;

            var table = GameObject.CreatePrimitive(PrimitiveType.Cube);
            table.name = "KitchenTable";
            table.transform.position = new Vector3(0f, -0.05f, 0.45f);
            table.transform.localScale = new Vector3(1.2f, 0.08f, 0.8f);
            SetColor(table.GetComponent<Renderer>(), new Color(0.35f, 0.22f, 0.18f));

            var back = GameObject.CreatePrimitive(PrimitiveType.Quad);
            back.name = "KitchenBackdrop";
            back.transform.position = new Vector3(0f, 0.45f, 0.9f);
            back.transform.localScale = new Vector3(2.2f, 1.4f, 1f);
            SetColor(back.GetComponent<Renderer>(), new Color(0.12f, 0.1f, 0.22f));
            Object.Destroy(back.GetComponent<Collider>());
        }

        static GrabbableIngredient EnsureCosmicFruit()
        {
            var existing = Object.FindFirstObjectByType<GrabbableIngredient>();
            if (existing != null) return existing;

            var fruit = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            fruit.name = "CosmicFruit";
            fruit.transform.position = new Vector3(0f, 0.18f, 0.45f);
            fruit.transform.localScale = Vector3.one * 0.12f;
            SetColor(fruit.GetComponent<Renderer>(), new Color(1f, 0.35f, 0.55f));

            var body = fruit.AddComponent<Rigidbody>();
            body.mass = 0.2f;
            body.interpolation = RigidbodyInterpolation.Interpolate;

            var glow = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            glow.name = "Glow";
            glow.transform.SetParent(fruit.transform, false);
            glow.transform.localScale = Vector3.one * 1.25f;
            Object.Destroy(glow.GetComponent<Collider>());
            var glowRenderer = glow.GetComponent<Renderer>();
            SetColor(glowRenderer, new Color(1f, 0.6f, 0.2f, 0.25f));

            return fruit.AddComponent<GrabbableIngredient>();
        }

        static void EnsureHandRig(GrabbableIngredient fruit)
        {
            if (Object.FindFirstObjectByType<HandUdpReceiver>() != null) return;

            var root = new GameObject("HandInput");
            var receiver = root.AddComponent<HandUdpReceiver>();

            var cursorGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            cursorGo.name = "HandCursor";
            cursorGo.transform.SetParent(root.transform, false);
            cursorGo.transform.position = new Vector3(0f, 0.35f, 0.35f);
            cursorGo.transform.localScale = Vector3.one * 0.06f;
            Object.Destroy(cursorGo.GetComponent<Collider>());
            SetColor(cursorGo.GetComponent<Renderer>(), new Color(1f, 0.85f, 0.35f, 0.9f));

            var cursor = root.AddComponent<HandCursorController>();
            // Wired through serialized fields via reflection-free public setup helper.
            cursor.Configure(receiver, cursorGo.transform, cursorGo.GetComponent<Renderer>());

            // Keep fruit reference used so the scene feels intentional.
            fruit.name = "CosmicFruit";
        }

        static void SetColor(Renderer renderer, Color color)
        {
            if (renderer == null) return;
            var shader = Shader.Find("Universal Render Pipeline/Lit")
                         ?? Shader.Find("Standard")
                         ?? Shader.Find("Sprites/Default");
            var mat = new Material(shader);
            if (mat.HasProperty("_BaseColor")) mat.SetColor("_BaseColor", color);
            if (mat.HasProperty("_Color")) mat.SetColor("_Color", color);
            if (mat.HasProperty("_EmissionColor"))
            {
                mat.EnableKeyword("_EMISSION");
                mat.SetColor("_EmissionColor", color * 0.35f);
            }
            renderer.material = mat;
        }
    }
}
