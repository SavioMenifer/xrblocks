import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as xb from 'xrblocks';

import {DatamoshScript} from './DatamoshScript.js';
import {DepthCameraScript} from './DepthCameraScript.js';

function start() {
  const options = new xb.Options();

  options.enableCamera();
  options.deviceCamera.videoConstraints = {
    facingMode: 'environment',
    width: {ideal: 3000},
    height: {ideal: 3000},
    aspectRatio: {ideal: 1},
  };

  options.depth = new xb.DepthOptions(xb.xrDepthMeshOptions);
  options.depth.depthMesh.updateFullResolutionGeometry = true;

  options.setAppTitle('Datamoshing');

  xb.add(new DatamoshScript());
  xb.add(new DepthCameraScript());
  xb.init(options);
}

start();
