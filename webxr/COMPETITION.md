# FOODIVERSE WebXR — competition packet

Seated WebXR kitchen built on **IWSDK 1.1.0**. Space physics changes cooking. Cooking hatches three creatures. Creatures plus edible structures restore the Cookie Kingdom.

This packet does **not** claim Meta Quest hardware success, live hand-tracking success, or store submission readiness. Those require a headset session that has not been completed in this audit.

## Project structure

```
FoodiverseCosmicKitchen/
  webxr/                          IWSDK app (source of truth for WebXR)
    index.html
    iwsdk.config.json             VR, hand tracking, seated camera, no locomotion
    vite.config.ts                official Vite + iwsdkDev plugin, base ./
    package.json                  npm run typecheck | build | preview | dev
    vercel.json                   webmanifest MIME type
    public/
      manifest.webmanifest
      icons/                      192 / 512 / 512-maskable
      scenes/main.iwsdk.scene.json
      ui/mission-panel.uikitml
    src/
      index.ts                    World.create + PWA auto-enter XR
      boot.ts                     boot/XR error surface
      recipe-catalog.ts           Ember Spark, Grove Bloom, Mint Current
      creature-catalog.ts         Ember Dragon, Grove Guardian, Mint Current
      mission-catalog.ts          10-stage restoration
      mission-save.ts             localStorage resume
      comfort-catalog.ts          pinch, reach, volume, reduced motion
      cook-system.ts / mixer-system.ts / delivery-system.ts / mission-system.ts
      gravity-system.ts / build-system.ts
      grab-interaction.ts / comfort-system.ts / panel.ts
      scene-assets/               procedural kitchen, mixer, creatures, kingdom, archive
  hand_tracking/                  Python desktop prototype (design reference only)
```

Working Node install used for typecheck/build lives at `%LOCALAPPDATA%\FoodiverseCosmicKitchen\webxr` (OneDrive copy plus `node_modules`). Edit the OneDrive `webxr/` tree, then robocopy or run `webxr\run_dev.bat`.

## Official IWSDK build and deploy

From the working install (after copying source):

```bat
cd %LOCALAPPDATA%\FoodiverseCosmicKitchen\webxr
set PATH=C:\Program Files\nodejs;%PATH%
npm run typecheck
node scripts/icons.mjs
npm run build
```

`npm run build` is `vite build` and writes `dist/`. That is the IWSDK-supported production artifact.

Local production preview (this audit served it as self-signed HTTPS):

```bat
npm run preview -- --host 127.0.0.1 --port 4173
```

Open `https://127.0.0.1:4173/` (localhost is a secure context). This is **not** a Quest-reachable public origin.

Host `dist/` on **public HTTPS** for Quest Browser. IWSDK hosting recommends Vercel. This audit did not complete Vercel login (`vercel whoami` hung without an account). After you run `npx vercel login` in a real terminal:

```bat
npx -y vercel@latest whoami
npx -y vercel@latest deploy --prod --yes
```

Use the canonical `https://<project>.vercel.app` alias, not a hashed deploy URL.

Contract after publish:

| URL | Expect |
| --- | --- |
| `https://<DOMAIN>/` | 200, HTTPS |
| `https://<DOMAIN>/manifest.webmanifest` | 200, `application/manifest+json` |
| `https://<DOMAIN>/icons/icon-512.png` | 200, `image/png` |

Quest Browser and WebXR require a secure context. `localhost` counts. A LAN `http://192.168.x.x` URL does **not**.

Desktop IWER preview (not a Quest):

```bat
webxr\run_dev.bat
```

That command must run in a normal CMD window. Agent shells cannot own the IWSDK Vite runtime.

First-build scope (concept §13). Not in this submission:

- Two-player cooperative networking
- Additional planets (Frozen Moon, Forest Without Roots, Gravity Storm as separate worlds)
- Native Unity / Meta XR Quest APK
- Full realistic food chemistry

Those stay out so the single seated loop can demonstrate: space affects cooking, cooking creates life, life transforms worlds.

## Known limitations

- Physical Meta Quest hand tracking has **not** been validated in this audit.
- IWER desktop emulator has **not** been live-proven in this audit (runtime cannot start from the agent shell).
- Grab pinch threshold is still the WebXR `select` event. In-app pinch ease only changes stir-vs-pinch detection and the HUD meter.
- Save/resume uses `localStorage` in the browser origin. It is not the Python `phase9_save.json`.
- Installed-PWA auto-enter XR is gated on `getDigitalGoodsService` and is untested on device.
- Horizon Store / bubblewrap APK packaging is **not** done. Hosting must be live first.
- Reduced motion still shows restored kingdom meshes; it only stops pulses and motes.
- Desktop mouse/pointer is not WebXR hands. That is intentional.

## Manual testing checklist

Desktop (secure context):

1. `npm run build` succeeds and `dist/index.html` exists.
2. Open the hosted HTTPS URL (or `npm run preview` on localhost).
3. Page shows the kitchen, not the boot-error card.
4. Mission HUD lists STAGE 1/10 and the Ember collect objective.
5. Heat / Cool / Stabilizer / Pause / Restart buttons respond.
6. Place Cosmic Fruit + Star-Pepper in the mixer, heat: unsecured food floats (camera stays still). Catch it or press G, stir to 45%, Ember Dragon hatches.
7. Drop Ember Dragon on Ice Gate, snap the cookie wafer onto Cookie Bridge.
8. Leaves + sugar, stir (no heat), snap the leaf bundle on Barren Soil, drop Grove Guardian there: forest grows.
9. Chocolate + mint, cool (food may lift), stir, snap chocolate on Water Path, drop Mint Current: crossing freezes.
10. All three creatures plus three edible builds: Central Kingdom feast meshes appear. HUD says Kingdom Restored. Discovery Archive lights the recipes.
11. Reload: save resumes hatched/delivered state.
12. Restart mission: ingredients return, kingdom resets, comfort prefs remain.
13. Pause freezes cooking. Tracking-loss copy is a desktop stand-in only.

IWER (desktop WebXR emulator, still not a Quest):

14. Enter XR from the HUD. Switch the emulator to **hand** input.
15. Pinch-grab an ingredient. Confirm it is not webcam tracking.
16. Occupancy is physical (object inside the bowl), not a pinch-to-add.
17. Open-hand stir over the bowl. Pinch should not stir.
18. Wrong-pad creature drop is rejected.

## Remaining Quest hardware validation

Must be run on a physical Quest in **Quest Browser** (HTTPS) before any compatibility claim:

1. `navigator.xr.isSessionSupported('immersive-vr')` is true.
2. Session starts from Enter XR (or installed-PWA auto-enter).
3. `hand-tracking` feature is granted; both hands stay in view while seated.
4. Pinch grab, bowl drop, heat/cool poke, open-hand stir, creature delivery all complete the 10-stage mission.
5. Tracking loss releases the hold and recovers without losing save.
6. Seated reach: mixer, ingredients, knobs, HUD, and kingdom stay in arm range with no locomotion.
7. Comfort: no forced turn, no camera shake, reduced-motion still completable.
8. Frame time stays comfortable while mixing and during Kingdom Restored.
9. Only after those pass, consider Horizon Store / bubblewrap packaging (`iwsdk-pwa-packaging`).
