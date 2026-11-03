#if UNITY_EDITOR
using Foodiverse.Bootstrap;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace Foodiverse.EditorTools
{
    /// <summary>
    /// One-click Phase 2 / Phase 3 scene setup from the Unity menu.
    /// </summary>
    public static class Phase2SceneMenu
    {
        [MenuItem("FOODIVERSE/Create Phase 2 Scene", priority = 0)]
        public static void CreatePhase2Scene()
        {
            CreateBootstrapScene(
                "Assets/Scenes/Phase2_HandGrab.unity",
                "Phase2Bootstrap",
                typeof(Phase2Bootstrap),
                "FOODIVERSE Phase 2",
                "Scene created.\n\n1. Press Play\n2. Run hand_tracking\\run_bridge.bat\n3. Pinch the fruit to grab it");
        }

        [MenuItem("FOODIVERSE/Create Phase 3 Cosmic Kitchen", priority = 1)]
        public static void CreatePhase3Scene()
        {
            CreateBootstrapScene(
                "Assets/Scenes/Phase3_CosmicKitchen.unity",
                "Phase3Bootstrap",
                typeof(Phase3Bootstrap),
                "FOODIVERSE Phase 3",
                "Cosmic Kitchen created.\n\n1. Press Play\n2. Run hand_tracking\\run_bridge.bat\n3. Drop ingredients into the bowl\n4. Press G to toggle zero-G");
        }

        static void CreateBootstrapScene(string scenePath, string objectName, System.Type bootstrapType, string title, string message)
        {
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
                AssetDatabase.CreateFolder("Assets", "Scenes");

            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var bootstrap = new GameObject(objectName);
            bootstrap.AddComponent(bootstrapType);

            EditorSceneManager.SaveScene(scene, scenePath);
            AssetDatabase.Refresh();

            Debug.Log($"[FOODIVERSE] Created {scenePath}");
            EditorUtility.DisplayDialog(title, message, "OK");
        }

        [MenuItem("FOODIVERSE/Open Phase 2 Docs", priority = 20)]
        public static void OpenDocs()
        {
            var path = System.IO.Path.GetFullPath("../docs/PHASE2.md");
            if (System.IO.File.Exists(path))
                Application.OpenURL("file:///" + path.Replace("\\", "/"));
            else
                EditorUtility.DisplayDialog("FOODIVERSE", "docs/PHASE2.md not found next to UnityProject.", "OK");
        }
    }
}
#endif
