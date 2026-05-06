import {Text} from 'troika-three-text';
import * as xb from 'xrblocks';

export class DatamoshScript extends xb.Script {
  #label = null;

  init() {
    this.#label = new Text();
    this.#label.text = 'Waiting for camera...';
    this.#label.fontSize = 0.04;
    this.#label.color = '#ffffff';
    this.#label.anchorX = 'center';
    this.#label.anchorY = 'middle';
    this.#label.renderOrder = 999;
    this.#label.position.set(0, 1.6, -1);
    this.#label.sync(() => {
      this.#label.material.depthTest = false;
    });
    xb.core.scene.add(this.#label);
  }

  update() {
    const deviceCamera = xb.core.deviceCamera;
    if (!deviceCamera?.texture) return;

    const img = deviceCamera.texture.image;
    const w = img?.videoWidth ?? img?.width ?? '?';
    const h = img?.videoHeight ?? img?.height ?? '?';
    const depthMesh = xb.core.depth?.depthMesh;
    const info = `getUserMedia  ${w}x${h}\ndepth: ${depthMesh ? 'active' : 'waiting...'}`;
    if (this.#label.text !== info) {
      this.#label.text = info;
      this.#label.sync();
    }
  }

  dispose() {
    this.#label?.dispose();
    xb.core.scene.remove(this.#label);
    this.clear();
  }
}
