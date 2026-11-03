using Foodiverse.Cooking;
using Foodiverse.Ingredients;
using Foodiverse.Input;
using Foodiverse.Physics;
using UnityEngine;

namespace Foodiverse.Bootstrap
{
    /// <summary>
    /// Builds the Phase 3 Cosmic Kitchen: gravity control, mixing bowl,
    /// six ingredients, and hand grab via the Python UDP bridge.
    /// </summary>
    public sealed class Phase3Bootstrap : MonoBehaviour
    {
        [SerializeField] bool buildOnAwake = true;

        static readonly (string id, Color color, float scale, Vector3 pos)[] IngredientSpawn =
        {
            ("Cosmic Fruit", new Color(1f, 0.35f, 0.55f), 0.11f, new Vector3(-0.35f, 0.22f, 0.4f)),
            ("Star-Pepper", new Color(1f, 0.25f, 0.15f), 0.08f, new Vector3(-0.2f, 0.2f, 0.42f)),
            ("Crystal Sugar", new Color(0.75f, 0.9f, 1f), 0.09f, new Vector3(-0.05f, 0.21f, 0.4f)),
            ("Chocolate", new Color(0.35f, 0.2f, 0.12f), 0.1f, new Vector3(0.1f, 0.2f, 0.42f)),
            ("Mint Crystal", new Color(0.45f, 0.95f, 0.75f), 0.09f, new Vector3(0.25f, 0.21f, 0.4f)),
            ("Space Leaves", new Color(0.35f, 0.75f, 0.35f), 0.1f, new Vector3(0.38f, 0.22f, 0.42f)),
        };

        void Awake()
        {
            if (buildOnAwake)
                BuildDemo();
        }

        [ContextMenu("Build Phase 3 Cosmic Kitchen")]
        public void BuildDemo()
        {
            EnsureLighting();
            EnsureCamera();
            EnsureGravity();
            EnsureTable();
            EnsureBowl();
            EnsureIngredients();
            EnsureHandRig();
            Debug.Log("[FOODIVERSE] Phase 3 Cosmic Kitchen ready. Play + run_bridge.bat. Press G to toggle zero-G.");
        }

        static void EnsureLighting()
        {
            if (Object.FindFirstObjectByType<Light>() != null) return;
            var lightGo = new GameObject("Key Light");
            var light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.15f;
            light.color = new Color(1f, 0.95f, 0.88f);
            lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);
            RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.22f, 0.2f, 0.32f);
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
            cam.backgroundColor = new Color(0.05f, 0.05f, 0.1f);
            cam.transform.position = new Vector3(0f, 0.6f, -1.15f);
            cam.transform.rotation = Quaternion.Euler(14f, 0f, 0f);
        }

        static void EnsureGravity()
        {
            if (Object.FindFirstObjectByType<CosmicGravity>() != null) return;
            var go = new GameObject("CosmicGravity");
            go.AddComponent<CosmicGravity>();
        }

        static void EnsureTable()
        {
            if (GameObject.Find("KitchenTable") != null) return;
            var table = GameObject.CreatePrimitive(PrimitiveType.Cube);
            table.name = "KitchenTable";
            table.transform.position = new Vector3(0f, -0.05f, 0.45f);
            table.transform.localScale = new Vector3(1.35f, 0.08f, 0.85f);
            SetColor(table.GetComponent<Renderer>(), new Color(0.32f, 0.2f, 0.16f));
        }

        static void EnsureBowl()
        {
            if (GameObject.Find("MixingBowl") != null) return;

            var bowl = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bowl.name = "MixingBowl";
            bowl.transform.position = new Vector3(0f, 0.08f, 0.5f);
            bowl.transform.localScale = new Vector3(0.28f, 0.06f, 0.28f);
            SetColor(bowl.GetComponent<Renderer>(), new Color(0.45f, 0.35f, 0.28f));

            // Trigger volume above the bowl for ingredient collection.
            var trigger = new GameObject("BowlTrigger");
            trigger.transform.SetParent(bowl.transform, false);
            trigger.transform.localPosition = new Vector3(0f, 1.2f, 0f);
            trigger.transform.localScale = new Vector3(0.9f, 2f, 0.9f);
            var sphere = trigger.AddComponent<SphereCollider>();
            sphere.isTrigger = true;
            trigger.AddComponent<MixingBowl>();
        }

        static void EnsureIngredients()
        {
            if (Object.FindObjectsByType<GrabbableIngredient>(FindObjectsSortMode.None).Length > 1)
                return;

            foreach (var spawn in IngredientSpawn)
            {
                var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                go.name = spawn.id;
                go.transform.position = spawn.pos;
                go.transform.localScale = Vector3.one * spawn.scale;
                SetColor(go.GetComponent<Renderer>(), spawn.color);
                var body = go.AddComponent<Rigidbody>();
                body.mass = 0.2f;
                body.interpolation = RigidbodyInterpolation.Interpolate;
                var grab = go.AddComponent<GrabbableIngredient>();
                grab.Configure(spawn.id);
            }
        }

        static void EnsureHandRig()
        {
            if (Object.FindFirstObjectByType<HandUdpReceiver>() != null) return;

            var root = new GameObject("HandInput");
            var receiver = root.AddComponent<HandUdpReceiver>();

            var cursorGo = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            cursorGo.name = "HandCursor";
            cursorGo.transform.SetParent(root.transform, false);
            cursorGo.transform.position = new Vector3(0f, 0.35f, 0.35f);
            cursorGo.transform.localScale = Vector3.one * 0.055f;
            Object.Destroy(cursorGo.GetComponent<Collider>());
            SetColor(cursorGo.GetComponent<Renderer>(), new Color(1f, 0.85f, 0.35f, 0.9f));

            var cursor = root.AddComponent<HandCursorController>();
            cursor.Configure(receiver, cursorGo.transform, cursorGo.GetComponent<Renderer>());
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
            renderer.material = mat;
        }
    }
}
