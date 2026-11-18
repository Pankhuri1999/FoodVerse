/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createSystem, UIKit, UIKitMLAsset, VisibilityState } from '@iwsdk/core';
import { prepareIwerPreview } from './boot.js';
import { XR_FAIL_HINT } from './copy.js';

export class PanelSystem extends createSystem({}) {
  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
    const xrButton = panel?.getElementById('xr-button');
    const exitButton = panel?.getElementById('exit-button');
    if (xrButton == null || exitButton == null) {
      return;
    }
    if (!this.world.xrEnabled) {
      xrButton.setProperties({ display: 'none' });
      exitButton.setProperties({ display: 'none' });
      return;
    }

    const launchXR = () => {
      prepareIwerPreview();
      void Promise.resolve(this.world.launchXR()).then(() => {
        prepareIwerPreview();
      }).catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : String(error);
        const panel = this.world.getSceneObject<UIKitMLAsset>('mission-hud');
        const status = panel?.getElementById('pause-status');
        const target =
          status instanceof UIKit.Text
            ? status
            : status?.children.find((child): child is UIKit.Text => child instanceof UIKit.Text);
        target?.setProperties({
          text: detail ? `${XR_FAIL_HINT} ${detail}` : XR_FAIL_HINT,
        });
      });
    };
    const exitXR = () => {
      void Promise.resolve(this.world.exitXR()).catch(() => {
        // Returning to the 2D page is best-effort.
      });
    };
    xrButton.addEventListener('click', launchXR);
    exitButton.addEventListener('click', exitXR);
    this.cleanupFuncs.push(
      () => xrButton.removeEventListener('click', launchXR),
      () => exitButton.removeEventListener('click', exitXR),
      this.world.visibilityState.subscribe((visibilityState) => {
        const is2D = visibilityState === VisibilityState.NonImmersive;
        xrButton.setProperties({ display: is2D ? 'flex' : 'none' });
        exitButton.setProperties({ display: is2D ? 'none' : 'flex' });
      }),
    );
  }
}
