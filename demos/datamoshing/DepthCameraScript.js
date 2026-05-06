import * as THREE from 'three';
import * as xb from 'xrblocks';

const vertexShader = /* glsl */ `
  varying vec2 vCameraUV;

  void main() {
    vCameraUV = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D cameraTexture;
  varying vec2 vCameraUV;

  void main() {
    if (vCameraUV.x < 0.0 || vCameraUV.x > 1.0 ||
        vCameraUV.y < 0.0 || vCameraUV.y > 1.0) {
      discard;
    }
    gl_FragColor = texture2D(cameraTexture, vCameraUV);
  }
`;

export class DepthCameraScript extends xb.Script {
  #material = null;
  #mesh = null;

  init() {
    this.#material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      wireframe: true,
      depthTest: false,
    });
  }

  update() {
    const depthMesh = xb.core.depth?.depthMesh;
    if (!depthMesh) return;

    // On first valid frame, create our mesh sharing the depth mesh geometry.
    if (!this.#mesh) {
      this.#mesh = new THREE.Mesh(depthMesh.geometry, this.#material);
      xb.core.scene.add(this.#mesh);
    }

    // Keep transform in sync with the depth mesh every frame.
    depthMesh.getWorldPosition(this.#mesh.position);
    depthMesh.getWorldQuaternion(this.#mesh.quaternion);
    depthMesh.getWorldScale(this.#mesh.scale);

  }

  dispose() {
    if (this.#mesh) {
      xb.core.scene.remove(this.#mesh);
    }
    this.#material?.dispose();
    this.clear();
  }
}
