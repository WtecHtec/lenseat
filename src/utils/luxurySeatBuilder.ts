import * as THREE from 'three';

export interface LuxurySeatTextures {
  leatherAlbedo: THREE.CanvasTexture;
  leatherNormal: THREE.CanvasTexture;
  leatherRoughness: THREE.CanvasTexture;
  shellWoodAlbedo: THREE.CanvasTexture;
  carpetNormal: THREE.CanvasTexture;
  dispose: () => void;
}

/**
 * Generates high-resolution procedural PBR textures (Full-grain Nappa leather with
 * channel tufting & stitching, curved walnut/ash shell grain, and acoustic woven carpet).
 */
export function createLuxurySeatTextures(maxAnisotropy: number): LuxurySeatTextures {
  // 1. Leather Albedo + Normal + Roughness (512x512)
  const size = 512;
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext('2d')!;

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d')!;

  // Base neutral leather albedo (tinted per-instance via InstancedMesh color)
  aCtx.fillStyle = '#e6e1dc';
  aCtx.fillRect(0, 0, size, size);

  // Base flat normal (128, 128, 255)
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, size, size);

  // Base medium-low roughness for supple conditioned Nappa leather
  rCtx.fillStyle = 'rgb(96, 96, 96)';
  rCtx.fillRect(0, 0, size, size);

  // Generate fine organic pebble grain via ImageData manipulation
  const aData = aCtx.getImageData(0, 0, size, size);
  const nData = nCtx.getImageData(0, 0, size, size);
  const rData = rCtx.getImageData(0, 0, size, size);

  // Deterministic pseudo-noise for realistic leather pores & grain
  const hash = (x: number, y: number) => {
    const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
    return h - Math.floor(h);
  };

  const smoothNoise = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Multi-scale pebble grain
      const n1 = smoothNoise(x * 0.18, y * 0.18);
      const n2 = smoothNoise(x * 0.45, y * 0.45) * 0.5;
      const grain = (n1 + n2) / 1.5;

      // Horizontal ergonomic channel tufting seams (every 128px)
      const seamDistY = Math.min(y % 128, 128 - (y % 128));
      const seamFactor = Math.max(0, 1 - seamDistY / 14); // 0 away from seam, 1 at seam center

      // Vertical side bolster stitching lines at x = 64 and x = 448
      const bolsterDistX = Math.min(Math.abs(x - 64), Math.abs(x - 448));
      const bolsterFactor = Math.max(0, 1 - bolsterDistX / 10);

      const crease = Math.max(seamFactor, bolsterFactor);

      // Compute finite-difference normal perturbation
      const gx = smoothNoise((x + 1) * 0.22, y * 0.22) - smoothNoise((x - 1) * 0.22, y * 0.22);
      const gy = smoothNoise(x * 0.22, (y + 1) * 0.22) - smoothNoise(x * 0.22, (y - 1) * 0.22);

      // Add deep normal bevel along the horizontal tufting channel
      const seamSlopeY =
        seamDistY < 14
          ? ((y % 128) < 64 ? -1 : 1) * Math.sin((seamDistY / 14) * Math.PI) * 0.65
          : 0;

      const nx = Math.max(0, Math.min(255, Math.round(128 + gx * 95)));
      const ny = Math.max(0, Math.min(255, Math.round(128 + (gy * 95 + seamSlopeY * 85))));

      nData.data[idx] = nx;
      nData.data[idx + 1] = ny;
      nData.data[idx + 2] = 245;
      nData.data[idx + 3] = 255;

      // Albedo darkening in pores and tufted seams
      const shade = 228 + (grain - 0.5) * 22 - crease * 58;
      aData.data[idx] = shade;
      aData.data[idx + 1] = shade - 3;
      aData.data[idx + 2] = shade - 6;
      aData.data[idx + 3] = 255;

      // Roughness: smoother on raised pillow crowns (85), rougher in creases/pores (175)
      const rough = Math.max(55, Math.min(220, Math.round(92 + (1 - grain) * 38 + crease * 75)));
      rData.data[idx] = rough;
      rData.data[idx + 1] = rough;
      rData.data[idx + 2] = rough;
      rData.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aData, 0, 0);
  nCtx.putImageData(nData, 0, 0);
  rCtx.putImageData(rData, 0, 0);

  // Draw crisp saddle-stitching dashes along bolster seams
  aCtx.strokeStyle = 'rgba(210, 190, 165, 0.45)';
  aCtx.lineWidth = 1.5;
  aCtx.setLineDash([5, 5]);
  [60, 68, 444, 452].forEach((sx) => {
    aCtx.beginPath();
    aCtx.moveTo(sx, 0);
    aCtx.lineTo(sx, size);
    aCtx.stroke();
  });

  const leatherAlbedo = new THREE.CanvasTexture(albedoCanvas);
  leatherAlbedo.colorSpace = THREE.SRGBColorSpace;
  leatherAlbedo.wrapS = THREE.RepeatWrapping;
  leatherAlbedo.wrapT = THREE.RepeatWrapping;
  leatherAlbedo.repeat.set(2, 2);
  leatherAlbedo.anisotropy = maxAnisotropy;

  const leatherNormal = new THREE.CanvasTexture(normalCanvas);
  leatherNormal.colorSpace = THREE.NoColorSpace;
  leatherNormal.wrapS = THREE.RepeatWrapping;
  leatherNormal.wrapT = THREE.RepeatWrapping;
  leatherNormal.repeat.set(2, 2);
  leatherNormal.anisotropy = maxAnisotropy;

  const leatherRoughness = new THREE.CanvasTexture(roughCanvas);
  leatherRoughness.colorSpace = THREE.NoColorSpace;
  leatherRoughness.wrapS = THREE.RepeatWrapping;
  leatherRoughness.wrapT = THREE.RepeatWrapping;
  leatherRoughness.repeat.set(2, 2);
  leatherRoughness.anisotropy = maxAnisotropy;

  // 2. Dark Smoked Walnut / Matte Carbon Shell Texture (256x256)
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wCtx = woodCanvas.getContext('2d')!;
  wCtx.fillStyle = '#181412';
  wCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 180; i++) {
    const wy = (i / 180) * 256;
    wCtx.strokeStyle = i % 2 === 0 ? 'rgba(38, 30, 25, 0.45)' : 'rgba(14, 11, 10, 0.5)';
    wCtx.lineWidth = 1 + (i % 3);
    wCtx.beginPath();
    wCtx.moveTo(0, wy);
    wCtx.bezierCurveTo(85, wy + Math.sin(i) * 6, 170, wy - Math.cos(i) * 6, 256, wy);
    wCtx.stroke();
  }
  const shellWoodAlbedo = new THREE.CanvasTexture(woodCanvas);
  shellWoodAlbedo.colorSpace = THREE.SRGBColorSpace;
  shellWoodAlbedo.wrapS = THREE.RepeatWrapping;
  shellWoodAlbedo.wrapT = THREE.RepeatWrapping;
  shellWoodAlbedo.anisotropy = maxAnisotropy;

  // 3. Acoustic Woven Theater Carpet Normal Map (256x256)
  const carpetCanvas = document.createElement('canvas');
  carpetCanvas.width = 256;
  carpetCanvas.height = 256;
  const cCtx = carpetCanvas.getContext('2d')!;
  const cData = cCtx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const i = (y * 256 + x) * 4;
      const weaveX = Math.sin(x * 1.5) * Math.cos(y * 0.8);
      const weaveY = Math.cos(x * 0.8) * Math.sin(y * 1.5);
      cData.data[i] = Math.round(128 + weaveX * 45);
      cData.data[i + 1] = Math.round(128 + weaveY * 45);
      cData.data[i + 2] = 240;
      cData.data[i + 3] = 255;
    }
  }
  cCtx.putImageData(cData, 0, 0);
  const carpetNormal = new THREE.CanvasTexture(carpetCanvas);
  carpetNormal.colorSpace = THREE.NoColorSpace;
  carpetNormal.wrapS = THREE.RepeatWrapping;
  carpetNormal.wrapT = THREE.RepeatWrapping;
  carpetNormal.repeat.set(24, 24);
  carpetNormal.anisotropy = maxAnisotropy;

  return {
    leatherAlbedo,
    leatherNormal,
    leatherRoughness,
    shellWoodAlbedo,
    carpetNormal,
    dispose: () => {
      leatherAlbedo.dispose();
      leatherNormal.dispose();
      leatherRoughness.dispose();
      shellWoodAlbedo.dispose();
      carpetNormal.dispose();
    },
  };
}

/**
 * Helper to create a rounded rectangle 2D shape for smooth bevelled ExtrudeGeometry cushions
 */
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

export interface LuxurySeatGeometries {
  cushionGeo: THREE.BufferGeometry;
  backrestGeo: THREE.BufferGeometry;
  headrestGeo: THREE.BufferGeometry;
  shellGeo: THREE.BufferGeometry;
  armrestPadGeo: THREE.BufferGeometry;
  armrestFrameGeo: THREE.BufferGeometry;
  pedestalGeo: THREE.BufferGeometry;
  cupholderGeo: THREE.BufferGeometry;
  dispose: () => void;
}

/**
 * Builds organic, high-segment bevelled geometries for a Poltrona Frau-inspired
 * luxury cinema armchair.
 */
export function createLuxurySeatGeometries(): LuxurySeatGeometries {
  // 1. Plush Ergonomic Seat Cushion with deep rounded waterfall bevels
  const cushionShape = createRoundedRectShape(0.62, 0.56, 0.08);
  const cushionGeo = new THREE.ExtrudeGeometry(cushionShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.045,
    bevelThickness: 0.048,
    curveSegments: 12,
  });
  cushionGeo.center();
  cushionGeo.rotateX(Math.PI / 2);

  // 2. Contoured Tufted Backrest with deep bolster bevels
  const backrestShape = createRoundedRectShape(0.60, 0.62, 0.09);
  const backrestGeo = new THREE.ExtrudeGeometry(backrestShape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.042,
    bevelThickness: 0.045,
    curveSegments: 12,
  });
  backrestGeo.center();

  // 3. Soft Winged Headrest Pillow
  const headrestShape = createRoundedRectShape(0.48, 0.20, 0.065);
  const headrestGeo = new THREE.ExtrudeGeometry(headrestShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.032,
    bevelThickness: 0.038,
    curveSegments: 10,
  });
  headrestGeo.center();

  // 4. Molded Smoked-Walnut / Matte-Composite Rear & Side Privacy Shell
  const shellShape = createRoundedRectShape(0.68, 0.84, 0.11);
  const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
    curveSegments: 10,
  });
  shellGeo.center();

  // 5. Leather-wrapped Top Armrest Pad
  const armPadShape = createRoundedRectShape(0.085, 0.52, 0.035);
  const armrestPadGeo = new THREE.ExtrudeGeometry(armPadShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.018,
    bevelThickness: 0.02,
    curveSegments: 8,
  });
  armrestPadGeo.center();
  armrestPadGeo.rotateX(Math.PI / 2);

  // 6. Sleek Anodized Aluminum Side Armrest Structural Panel
  const armFrameShape = createRoundedRectShape(0.06, 0.48, 0.06);
  const armrestFrameGeo = new THREE.ExtrudeGeometry(armFrameShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    curveSegments: 8,
  });
  armrestFrameGeo.center();
  armrestFrameGeo.rotateX(Math.PI / 2);

  // 7. Lathe-turned Heavy Flanged Architectural Pedestal Base
  const pedestalPoints = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.24, 0.0),
    new THREE.Vector2(0.22, 0.025),
    new THREE.Vector2(0.11, 0.06),
    new THREE.Vector2(0.095, 0.30),
    new THREE.Vector2(0.15, 0.34),
    new THREE.Vector2(0.0, 0.34),
  ];
  const pedestalGeo = new THREE.LatheGeometry(pedestalPoints, 20);
  pedestalGeo.center();

  // 8. Brushed Champagne-Titanium Recessed Cupholder Ring
  const cupPoints = [
    new THREE.Vector2(0.038, 0.0),
    new THREE.Vector2(0.056, 0.0),
    new THREE.Vector2(0.058, 0.022),
    new THREE.Vector2(0.044, 0.022),
    new THREE.Vector2(0.042, 0.004),
  ];
  const cupholderGeo = new THREE.LatheGeometry(cupPoints, 20);
  cupholderGeo.center();

  return {
    cushionGeo,
    backrestGeo,
    headrestGeo,
    shellGeo,
    armrestPadGeo,
    armrestFrameGeo,
    pedestalGeo,
    cupholderGeo,
    dispose: () => {
      cushionGeo.dispose();
      backrestGeo.dispose();
      headrestGeo.dispose();
      shellGeo.dispose();
      armrestPadGeo.dispose();
      armrestFrameGeo.dispose();
      pedestalGeo.dispose();
      cupholderGeo.dispose();
    },
  };
}
