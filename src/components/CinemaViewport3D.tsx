import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { SCREEN_CONFIG } from '../data/cinemaData';
import { MovieInfo, SeatData, StreamResource, ViewMode } from '../types/cinema';
import { HlsScreenPlayer, StreamPlaybackStatus } from '../utils/hlsScreenPlayer';
import {
  createLuxurySeatGeometries,
  createLuxurySeatTextures,
} from '../utils/luxurySeatBuilder';
import { renderMovieFrame } from '../utils/screenRenderer';
import { soundEngine } from '../utils/soundEffects';

interface CinemaViewport3DProps {
  seats: SeatData[];
  activeSeat: SeatData;
  selectedSeatIds: Set<string>;
  viewMode: ViewMode;
  movie: MovieInfo;
  activeStream: StreamResource;
  isMuted: boolean;
  isPaused: boolean;
  onStreamStatusChange?: (status: StreamPlaybackStatus, msg?: string) => void;
  onMuteStateChange?: (isMuted: boolean) => void;
  onScreenCanvasReady?: (canvas: HTMLCanvasElement) => void;
  onSelectSeatIn3D: (seat: SeatData) => void;
  onTransitionComplete: (targetMode: 'planar' | 'immersive-3d') => void;
}

// Pre-allocated math objects at module scope (Zero GC in render loop)
const _vDir = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

function smootherstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function evalQuadraticBezier(
  out: THREE.Vector3,
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  t: number
) {
  const invT = 1 - t;
  const c0 = invT * invT;
  const c1 = 2 * invT * t;
  const c2 = t * t;
  out.set(
    c0 * p0.x + c1 * p1.x + c2 * p2.x,
    c0 * p0.y + c1 * p1.y + c2 * p2.y,
    c0 * p0.z + c1 * p1.z + c2 * p2.z
  );
}

export const CinemaViewport3D: React.FC<CinemaViewport3DProps> = ({
  seats,
  activeSeat,
  selectedSeatIds,
  viewMode,
  movie,
  activeStream,
  isMuted,
  isPaused,
  onStreamStatusChange,
  onMuteStateChange,
  onScreenCanvasReady,
  onSelectSeatIn3D,
  onTransitionComplete,
}) => {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const hlsPlayerRef = useRef<HlsScreenPlayer | null>(null);

  const stateRef = useRef({
    seats,
    activeSeat,
    selectedSeatIds,
    viewMode,
    movie,
    activeStream,
    isMuted,
    isPaused,
    onStreamStatusChange,
    onMuteStateChange,
    onSelectSeatIn3D,
    onTransitionComplete,
  });

  useEffect(() => {
    stateRef.current = {
      seats,
      activeSeat,
      selectedSeatIds,
      viewMode,
      movie,
      activeStream,
      isMuted,
      isPaused,
      onStreamStatusChange,
      onMuteStateChange,
      onSelectSeatIn3D,
      onTransitionComplete,
    };
  }, [
    seats,
    activeSeat,
    selectedSeatIds,
    viewMode,
    movie,
    activeStream,
    isMuted,
    isPaused,
    onStreamStatusChange,
    onMuteStateChange,
    onSelectSeatIn3D,
    onTransitionComplete,
  ]);

  // Load new M3U8 stream (with multi-line backup failover) when activeStream changes
  useEffect(() => {
    if (hlsPlayerRef.current && activeStream.m3u8Url) {
      hlsPlayerRef.current.loadStream(activeStream.m3u8Url, activeStream.backupUrls || []);
    }
  }, [activeStream]);

  // Sync mute state with HLS video element
  useEffect(() => {
    if (hlsPlayerRef.current) {
      hlsPlayerRef.current.setMuted(isMuted);
    }
  }, [isMuted]);

  // Sync play/pause state with HLS video element
  useEffect(() => {
    const player = hlsPlayerRef.current;
    if (!player) return;
    if (isPaused && !player.video.paused) {
      player.video.pause();
    } else if (!isPaused && player.video.paused) {
      player.safePlay();
    }
  }, [isPaused]);

  const camCtrlRef = useRef({
    currPos: new THREE.Vector3(0, 21.5, 3.5),
    currLook: new THREE.Vector3(0, 0.5, -2.2),
    flightActive: false,
    flightProgress: 1,
    flightDuration: 1.35,
    flightTargetMode: 'planar' as 'planar' | 'immersive-3d',
    flightStartPos: new THREE.Vector3(0, 21.5, 3.5),
    flightMidPos: new THREE.Vector3(0, 10, 2),
    flightEndPos: new THREE.Vector3(0, 2.5, 2),
    flightStartLook: new THREE.Vector3(0, 0.5, -2.2),
    flightEndLook: new THREE.Vector3(0, SCREEN_CONFIG.centerY, SCREEN_CONFIG.centerZ),
    yaw: 0,
    pitch: 0,
    targetYaw: 0,
    targetPitch: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    pointerMovedDist: 0,
    hoveredSeatIndex: -1,
    currentFov: 62,
  });

  const prevViewModeRef = useRef<ViewMode>(viewMode);
  const prevSeatIdRef = useRef<string>(activeSeat.id);

  useEffect(() => {
    const ctrl = camCtrlRef.current;
    const prevMode = prevViewModeRef.current;
    const prevSeatId = prevSeatIdRef.current;

    if (
      viewMode === 'transitioning-to-3d' ||
      (viewMode === 'immersive-3d' && prevSeatId !== activeSeat.id)
    ) {
      // Ensure video playback is active when entering 3D theater
      if (hlsPlayerRef.current && !stateRef.current.isPaused) {
        hlsPlayerRef.current.safePlay();
      }

      ctrl.flightStartPos.copy(ctrl.currPos);
      ctrl.flightEndPos.set(activeSeat.eyePos.x, activeSeat.eyePos.y, activeSeat.eyePos.z);

      if (prevMode === 'planar' || viewMode === 'transitioning-to-3d') {
        ctrl.flightMidPos.set(
          activeSeat.eyePos.x * 0.55,
          Math.max(ctrl.currPos.y * 0.48, activeSeat.eyePos.y + 4.8),
          activeSeat.eyePos.z + 5.2
        );
        ctrl.flightDuration = 1.32;
      } else {
        ctrl.flightMidPos.set(
          (ctrl.currPos.x + activeSeat.eyePos.x) * 0.5,
          Math.max(ctrl.currPos.y, activeSeat.eyePos.y) + 0.95,
          (ctrl.currPos.z + activeSeat.eyePos.z) * 0.5 + 0.65
        );
        ctrl.flightDuration = 0.78;
      }

      ctrl.flightStartLook.copy(ctrl.currLook);
      ctrl.flightEndLook.set(0, SCREEN_CONFIG.centerY, SCREEN_CONFIG.centerZ);

      ctrl.targetYaw = 0;
      ctrl.targetPitch = 0;
      ctrl.yaw = 0;
      ctrl.pitch = 0;
      ctrl.flightProgress = 0;
      ctrl.flightActive = true;
      ctrl.flightTargetMode = 'immersive-3d';
    } else if (viewMode === 'transitioning-to-2d') {
      ctrl.flightStartPos.copy(ctrl.currPos);
      ctrl.flightEndPos.set(0, 21.5, 3.5);
      ctrl.flightMidPos.set(ctrl.currPos.x * 0.5, 12.5, ctrl.currPos.z + 4.0);
      ctrl.flightStartLook.copy(ctrl.currLook);
      ctrl.flightEndLook.set(0, 0.5, -2.2);
      ctrl.flightDuration = 0.92;
      ctrl.flightProgress = 0;
      ctrl.flightActive = true;
      ctrl.flightTargetMode = 'planar';
      ctrl.targetYaw = 0;
      ctrl.targetPitch = 0;
    }

    prevViewModeRef.current = viewMode;
    prevSeatIdRef.current = activeSeat.id;
  }, [viewMode, activeSeat]);

  const updateSeatColorsRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (updateSeatColorsRef.current) {
      updateSeatColorsRef.current();
    }
  }, [seats, activeSeat, selectedSeatIds]);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Initialize HLS M3U8 Video Player
    const hlsPlayer = new HlsScreenPlayer(
      (status, msg) => {
        if (stateRef.current.onStreamStatusChange) {
          stateRef.current.onStreamStatusChange(status, msg);
        }
      },
      (muted) => {
        if (stateRef.current.onMuteStateChange) {
          stateRef.current.onMuteStateChange(muted);
        }
      }
    );
    hlsPlayer.setMuted(stateRef.current.isMuted);
    hlsPlayer.loadStream(
      stateRef.current.activeStream.m3u8Url,
      stateRef.current.activeStream.backupUrls || []
    );
    hlsPlayerRef.current = hlsPlayer;

    // 1. Software WebGL detection
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize WebGLRenderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 3. Scene, Dark Cinema Environment & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020203);
    scene.fog = new THREE.FogExp2(0x020203, 0.018);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.12;
    pmremGenerator.dispose();

    // 4. Camera
    const camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.08,
      80
    );
    camera.position.copy(camCtrlRef.current.currPos);
    camera.lookAt(camCtrlRef.current.currLook);

    // 5. True Cinema Darkness Lighting Rig (Only Screen shines brightly in 3D mode!)
    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x030305, 0.45);
    scene.add(hemiLight);

    // Overhead house light: bright during 2D selection, near-zero (0.025) in 3D cinema viewing!
    const houseLight = new THREE.DirectionalLight(0xfff3e0, 1.25);
    houseLight.position.set(2.5, 16.5, 5.5);
    houseLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      houseLight.shadow.mapSize.set(2048, 2048);
      houseLight.shadow.camera.near = 1;
      houseLight.shadow.camera.far = 32;
      const d = 13.5;
      houseLight.shadow.camera.left = -d;
      houseLight.shadow.camera.right = d;
      houseLight.shadow.camera.top = d;
      houseLight.shadow.camera.bottom = -d;
      houseLight.shadow.bias = -0.0004;
      houseLight.shadow.normalBias = 0.018;
    }
    scene.add(houseLight);

    const rimLight = new THREE.DirectionalLight(0xdbeafe, 0.25);
    rimLight.position.set(0, 9.5, 12.0);
    scene.add(rimLight);

    // Primary Light Source in 3D Mode: The Giant Curved Screen Area Light & Bounce Light
    let screenAreaLight: THREE.RectAreaLight | null = null;
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      screenAreaLight = new THREE.RectAreaLight(0xffffff, 2.8, 19.5, 8.2);
      screenAreaLight.position.set(0, SCREEN_CONFIG.centerY, SCREEN_CONFIG.centerZ + 2.2);
      screenAreaLight.lookAt(0, 1.8, 3.0);
      scene.add(screenAreaLight);
    }

    const screenBounceLight = new THREE.PointLight(0xffffff, 3.5, 26, 1.5);
    screenBounceLight.position.set(0, SCREEN_CONFIG.centerY, SCREEN_CONFIG.centerZ + 2.8);
    scene.add(screenBounceLight);

    const leftWallLight = new THREE.PointLight(0xea580c, 0.5, 16, 1.8);
    leftWallLight.position.set(-9.2, 4.2, 0.5);
    scene.add(leftWallLight);

    const rightWallLight = new THREE.PointLight(0xea580c, 0.5, 16, 1.8);
    rightWallLight.position.set(9.2, 4.2, 0.5);
    scene.add(rightWallLight);

    // 6. Generate Procedural PBR Textures & Sculpted Seat Geometries
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const pbrTextures = createLuxurySeatTextures(maxAniso);
    const seatGeos = createLuxurySeatGeometries();

    // 7. Curved IMAX Screen & Real-Time M3U8 Video Texture Canvas
    const movieCanvas = document.createElement('canvas');
    movieCanvas.width = 1280;
    movieCanvas.height = 548;
    const movieCtx = movieCanvas.getContext('2d')!;
    renderMovieFrame(movieCtx, movieCanvas.width, movieCanvas.height, 0, stateRef.current.movie, true);
    if (onScreenCanvasReady) {
      onScreenCanvasReady(movieCanvas);
    }

    const screenTexture = new THREE.CanvasTexture(movieCanvas);
    screenTexture.colorSpace = THREE.SRGBColorSpace;
    screenTexture.anisotropy = maxAniso;

    const screenGroup = new THREE.Group();
    const radius = SCREEN_CONFIG.curveRadius;
    const arcAngle = SCREEN_CONFIG.width / radius;
    const screenGeo = new THREE.CylinderGeometry(
      radius,
      radius,
      SCREEN_CONFIG.height,
      64,
      1,
      true,
      Math.PI - arcAngle / 2,
      arcAngle
    );
    screenGeo.scale(-1, 1, 1);

    // Pure self-luminous MeshBasicMaterial so scene lights never cast a semi-circular hotspot or plane-cutoff mask onto the video screen
    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTexture,
      side: THREE.DoubleSide,
    });

    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, SCREEN_CONFIG.centerY, SCREEN_CONFIG.centerZ + radius);
    screenGroup.add(screenMesh);

    // Pitch-Black Velvet-Matte Stage Deck beneath screen
    const stageGeo = new THREE.BoxGeometry(23.5, 0.45, 3.6);
    const stageMat = new THREE.MeshPhysicalMaterial({
      color: 0x040507,
      roughness: 0.35,
      metalness: 0.3,
      clearcoat: 0.2,
      clearcoatRoughness: 0.4,
    });
    const stageMesh = new THREE.Mesh(stageGeo, stageMat);
    stageMesh.position.set(0, -0.1, SCREEN_CONFIG.centerZ + 1.2);
    stageMesh.receiveShadow = true;
    screenGroup.add(stageMesh);

    scene.add(screenGroup);

    // 8. Auditorium Architecture with Dark Acoustic Carpet Risers
    const archGroup = new THREE.Group();

    const carpetRiserMat = new THREE.MeshStandardMaterial({
      color: 0x07080b,
      normalMap: pbrTextures.carpetNormal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.92,
      metalness: 0.02,
    });

    const stepLedMat = new THREE.MeshBasicMaterial({
      color: 0x452208,
    });

    const baseFloorGeo = new THREE.BoxGeometry(24, 0.5, 28);
    const baseFloorMesh = new THREE.Mesh(baseFloorGeo, carpetRiserMat);
    baseFloorMesh.position.set(0, -0.45, -1);
    archGroup.add(baseFloorMesh);

    for (let r = 0; r < 9; r++) {
      const zBase = -4.2 + r * 1.6;
      const yBase = 0.2 + r * 0.42 + Math.pow(r, 1.35) * 0.05;

      const platformGeo = new THREE.BoxGeometry(20.6, yBase + 0.4, 1.68);
      const platformMesh = new THREE.Mesh(platformGeo, carpetRiserMat);
      platformMesh.position.set(0, (yBase - 0.4) / 2, zBase);
      platformMesh.receiveShadow = true;
      archGroup.add(platformMesh);

      const ledGeo = new THREE.BoxGeometry(0.72, 0.015, 0.025);
      const leftLed = new THREE.Mesh(ledGeo, stepLedMat);
      leftLed.position.set(-3.95, yBase + 0.012, zBase - 0.82);
      archGroup.add(leftLed);

      const rightLed = new THREE.Mesh(ledGeo, stepLedMat);
      rightLed.position.set(3.95, yBase + 0.012, zBase - 0.82);
      archGroup.add(rightLed);
    }

    // Deep Light-Absorbing Acoustic Side Walls & Baffles
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x040507,
      roughness: 0.9,
      metalness: 0.05,
    });
    const baffleMat = new THREE.MeshPhysicalMaterial({
      color: 0x080a0f,
      roughness: 0.65,
      metalness: 0.15,
      clearcoat: 0.08,
    });

    [-10.4, 10.4].forEach((wallX) => {
      const sideSign = Math.sign(wallX);
      const wallGeo = new THREE.BoxGeometry(0.4, 13, 28);
      const wallMesh = new THREE.Mesh(wallGeo, wallMat);
      wallMesh.position.set(wallX, 5.5, -1.5);
      archGroup.add(wallMesh);

      for (let b = 0; b < 9; b++) {
        const bz = -10.5 + b * 2.4;
        const baffleGeo = new THREE.BoxGeometry(0.26, 9.5, 0.92);
        const baffle = new THREE.Mesh(baffleGeo, baffleMat);
        baffle.position.set(wallX - sideSign * 0.24, 5.2, bz);
        baffle.rotation.y = sideSign * 0.16;
        archGroup.add(baffle);
      }
    });

    const rearWallGeo = new THREE.BoxGeometry(21.2, 13, 0.6);
    const rearWall = new THREE.Mesh(rearWallGeo, wallMat);
    rearWall.position.set(0, 5.5, 11.2);
    archGroup.add(rearWall);

    scene.add(archGroup);

    // 9. Photorealistic Sculpted Luxury Cinema Seats (MeshPhysicalMaterial)
    const seatCount = stateRef.current.seats.length;

    const nappaLeatherMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: pbrTextures.leatherAlbedo,
      normalMap: pbrTextures.leatherNormal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: pbrTextures.leatherRoughness,
      roughness: 0.42,
      metalness: 0.05,
      sheen: 0.7,
      sheenRoughness: 0.35,
      sheenColor: new THREE.Color(0x3a302b),
      clearcoat: 0.22,
      clearcoatRoughness: 0.38,
    });

    const headrestLeatherMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: pbrTextures.leatherAlbedo,
      normalMap: pbrTextures.leatherNormal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: pbrTextures.leatherRoughness,
      roughness: 0.34,
      metalness: 0.06,
      sheen: 0.75,
      sheenRoughness: 0.3,
      sheenColor: new THREE.Color(0x473c36),
      clearcoat: 0.28,
      clearcoatRoughness: 0.32,
    });

    const outerShellMat = new THREE.MeshPhysicalMaterial({
      color: 0x1c1614,
      map: pbrTextures.shellWoodAlbedo,
      roughness: 0.28,
      metalness: 0.12,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
    });

    const titaniumFrameMat = new THREE.MeshPhysicalMaterial({
      color: 0x121419,
      roughness: 0.26,
      metalness: 0.85,
      clearcoat: 0.3,
      clearcoatRoughness: 0.25,
    });

    const armrestLeatherMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1818,
      map: pbrTextures.leatherAlbedo,
      normalMap: pbrTextures.leatherNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: 0.36,
      metalness: 0.08,
      clearcoat: 0.2,
    });

    const champagneMetalMat = new THREE.MeshPhysicalMaterial({
      color: 0xb88d56,
      roughness: 0.18,
      metalness: 0.92,
      clearcoat: 0.4,
    });

    const cushionInst = new THREE.InstancedMesh(seatGeos.cushionGeo, nappaLeatherMat, seatCount);
    const backrestInst = new THREE.InstancedMesh(seatGeos.backrestGeo, nappaLeatherMat, seatCount);
    const headrestInst = new THREE.InstancedMesh(seatGeos.headrestGeo, headrestLeatherMat, seatCount);
    const shellInst = new THREE.InstancedMesh(seatGeos.shellGeo, outerShellMat, seatCount);
    const leftArmPadInst = new THREE.InstancedMesh(seatGeos.armrestPadGeo, armrestLeatherMat, seatCount);
    const rightArmPadInst = new THREE.InstancedMesh(seatGeos.armrestPadGeo, armrestLeatherMat, seatCount);
    const leftFrameInst = new THREE.InstancedMesh(seatGeos.armrestFrameGeo, titaniumFrameMat, seatCount);
    const rightFrameInst = new THREE.InstancedMesh(seatGeos.armrestFrameGeo, titaniumFrameMat, seatCount);
    const pedestalInst = new THREE.InstancedMesh(seatGeos.pedestalGeo, titaniumFrameMat, seatCount);
    const cupholderInst = new THREE.InstancedMesh(seatGeos.cupholderGeo, champagneMetalMat, seatCount);

    const allInstancedMeshes = [
      cushionInst,
      backrestInst,
      headrestInst,
      shellInst,
      leftArmPadInst,
      rightArmPadInst,
      leftFrameInst,
      rightFrameInst,
      pedestalInst,
      cupholderInst,
    ];

    allInstancedMeshes.forEach((inst) => {
      inst.castShadow = !isSoftwareGl;
      inst.receiveShadow = !isSoftwareGl;
      scene.add(inst);
    });

    const contactShadowCanvas = document.createElement('canvas');
    contactShadowCanvas.width = 128;
    contactShadowCanvas.height = 128;
    const csCtx = contactShadowCanvas.getContext('2d')!;
    const csGrad = csCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    csGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    csGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.42)');
    csGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    csCtx.fillStyle = csGrad;
    csCtx.fillRect(0, 0, 128, 128);
    const contactShadowTex = new THREE.CanvasTexture(contactShadowCanvas);
    const contactShadowGeo = new THREE.PlaneGeometry(0.98, 0.92);
    contactShadowGeo.rotateX(-Math.PI / 2);
    const contactShadowMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const contactShadowInst = new THREE.InstancedMesh(
      contactShadowGeo,
      contactShadowMat,
      seatCount
    );
    scene.add(contactShadowInst);

    const currentSeats = stateRef.current.seats;
    for (let i = 0; i < seatCount; i++) {
      const s = currentSeats[i];
      const { x, y, z } = s.worldPos;
      const seatYaw = Math.atan2(-x * 0.35, z - SCREEN_CONFIG.centerZ);
      const cosY = Math.cos(seatYaw);
      const sinY = Math.sin(seatYaw);

      _pos.set(x, y + 0.015, z);
      _euler.set(0, seatYaw, 0);
      _quat.setFromEuler(_euler);
      _scale.set(1, 1, 1);
      _mat4.compose(_pos, _quat, _scale);
      contactShadowInst.setMatrixAt(i, _mat4);

      _pos.set(x, y + 0.17, z + 0.02);
      _mat4.compose(_pos, _quat, _scale);
      pedestalInst.setMatrixAt(i, _mat4);

      _pos.set(x, y + 0.37, z - 0.03);
      _euler.set(0.07, seatYaw, 0);
      _quat.setFromEuler(_euler);
      _mat4.compose(_pos, _quat, _scale);
      cushionInst.setMatrixAt(i, _mat4);

      _pos.set(x, y + 0.69, z + 0.21);
      _euler.set(-0.24, seatYaw, 0);
      _quat.setFromEuler(_euler);
      _mat4.compose(_pos, _quat, _scale);
      backrestInst.setMatrixAt(i, _mat4);

      _pos.set(x, y + 1.05, z + 0.29);
      _euler.set(-0.15, seatYaw, 0);
      _quat.setFromEuler(_euler);
      _mat4.compose(_pos, _quat, _scale);
      headrestInst.setMatrixAt(i, _mat4);

      _pos.set(x - 0.07 * sinY, y + 0.77, z + 0.28 * cosY);
      _euler.set(-0.22, seatYaw, 0);
      _quat.setFromEuler(_euler);
      _mat4.compose(_pos, _quat, _scale);
      shellInst.setMatrixAt(i, _mat4);

      const armOffset = 0.39;
      _euler.set(0, seatYaw, 0);
      _quat.setFromEuler(_euler);

      _pos.set(x - armOffset * cosY, y + 0.38, z + armOffset * sinY);
      _mat4.compose(_pos, _quat, _scale);
      leftFrameInst.setMatrixAt(i, _mat4);

      _pos.set(x + armOffset * cosY, y + 0.38, z - armOffset * sinY);
      _mat4.compose(_pos, _quat, _scale);
      rightFrameInst.setMatrixAt(i, _mat4);

      _pos.set(x - armOffset * cosY, y + 0.57, z + armOffset * sinY - 0.02);
      _mat4.compose(_pos, _quat, _scale);
      leftArmPadInst.setMatrixAt(i, _mat4);

      _pos.set(x + armOffset * cosY, y + 0.57, z - armOffset * sinY - 0.02);
      _mat4.compose(_pos, _quat, _scale);
      rightArmPadInst.setMatrixAt(i, _mat4);

      _pos.set(
        x + armOffset * cosY - 0.21 * sinY,
        y + 0.60,
        z - armOffset * sinY - 0.21 * cosY
      );
      _mat4.compose(_pos, _quat, _scale);
      cupholderInst.setMatrixAt(i, _mat4);
    }

    allInstancedMeshes.forEach((inst) => {
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
    });
    contactShadowInst.instanceMatrix.needsUpdate = true;
    contactShadowInst.computeBoundingSphere();

    const updateSeatColors = () => {
      const { seats: sList, activeSeat: act, selectedSeatIds: selIds } = stateRef.current;
      const hoveredIdx = camCtrlRef.current.hoveredSeatIndex;

      for (let i = 0; i < sList.length; i++) {
        const s = sList[i];
        const isCurrentPOV = s.id === act.id;
        const isSelected = selIds.has(s.id);
        const isHovered = i === hoveredIdx;

        if (isCurrentPOV || isSelected) {
          _color.setHex(0x9a582a);
          cushionInst.setColorAt(i, _color);
          backrestInst.setColorAt(i, _color);
          _color.setHex(0xb06835);
          headrestInst.setColorAt(i, _color);
        } else if (isHovered && s.status !== 'occupied') {
          _color.setHex(0x4a403b);
          cushionInst.setColorAt(i, _color);
          backrestInst.setColorAt(i, _color);
          _color.setHex(0x5c504a);
          headrestInst.setColorAt(i, _color);
        } else if (s.status === 'occupied') {
          _color.setHex(0x121214);
          cushionInst.setColorAt(i, _color);
          backrestInst.setColorAt(i, _color);
          _color.setHex(0x17171a);
          headrestInst.setColorAt(i, _color);
        } else {
          _color.setHex(0x28201c);
          cushionInst.setColorAt(i, _color);
          backrestInst.setColorAt(i, _color);
          _color.setHex(0x322823);
          headrestInst.setColorAt(i, _color);
        }
      }

      if (cushionInst.instanceColor) cushionInst.instanceColor.needsUpdate = true;
      if (backrestInst.instanceColor) backrestInst.instanceColor.needsUpdate = true;
      if (headrestInst.instanceColor) headrestInst.instanceColor.needsUpdate = true;
    };

    updateSeatColors();
    updateSeatColorsRef.current = updateSeatColors;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 10. Pointer Interaction
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const pickableTargets = [backrestInst, cushionInst, headrestInst, shellInst];
    let lastHoverRaycastTime = 0;

    const canvas = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      if (stateRef.current.viewMode !== 'immersive-3d') return;
      const ctrl = camCtrlRef.current;
      ctrl.isDragging = true;
      ctrl.dragStartX = e.clientX;
      ctrl.dragStartY = e.clientY;
      ctrl.pointerMovedDist = 0;
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      const ctrl = camCtrlRef.current;
      if (stateRef.current.viewMode !== 'immersive-3d') return;

      if (ctrl.isDragging) {
        const dx = e.clientX - ctrl.dragStartX;
        const dy = e.clientY - ctrl.dragStartY;
        ctrl.pointerMovedDist += Math.abs(dx) + Math.abs(dy);
        ctrl.dragStartX = e.clientX;
        ctrl.dragStartY = e.clientY;

        const sensitivity = 0.004;
        ctrl.targetYaw = THREE.MathUtils.clamp(
          ctrl.targetYaw - dx * sensitivity,
          -Math.PI * 0.92,
          Math.PI * 0.92
        );
        ctrl.targetPitch = THREE.MathUtils.clamp(
          ctrl.targetPitch + dy * sensitivity,
          -Math.PI * 0.35,
          Math.PI * 0.38
        );
        return;
      }

      const now = performance.now();
      if (now - lastHoverRaycastTime < 50) return;
      lastHoverRaycastTime = now;

      const rect = canvas.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(pickableTargets, false);

      let newHoveredIdx = -1;
      if (hits.length > 0 && hits[0].instanceId !== undefined) {
        newHoveredIdx = hits[0].instanceId;
      }

      if (newHoveredIdx !== ctrl.hoveredSeatIndex) {
        ctrl.hoveredSeatIndex = newHoveredIdx;
        updateSeatColors();
        if (newHoveredIdx >= 0 && stateRef.current.seats[newHoveredIdx]?.status !== 'occupied') {
          canvas.style.cursor = 'pointer';
        } else {
          canvas.style.cursor = 'grab';
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const ctrl = camCtrlRef.current;
      if (!ctrl.isDragging) return;
      ctrl.isDragging = false;
      canvas.style.cursor = 'grab';

      if (ctrl.pointerMovedDist < 6 && stateRef.current.viewMode === 'immersive-3d') {
        const rect = canvas.getBoundingClientRect();
        pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObjects(pickableTargets, false);
        if (hits.length > 0 && hits[0].instanceId !== undefined) {
          const clickedSeat = stateRef.current.seats[hits[0].instanceId];
          if (
            clickedSeat &&
            clickedSeat.status !== 'occupied' &&
            clickedSeat.id !== stateRef.current.activeSeat.id
          ) {
            soundEngine.playSeatClick(true);
            stateRef.current.onSelectSeatIn3D(clickedSeat);
          }
        }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 11. Animation & True Dark Cinema Lighting Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let lastMovieDrawTime = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const ctrl = camCtrlRef.current;
      const st = stateRef.current;

      // Draw Real M3U8 Video Frame onto the 3D Curved Screen & Extract Live Screen Ambilight
      const movieInterval = isSoftwareGl ? 0.08 : 0.032;
      if (elapsed - lastMovieDrawTime >= movieInterval) {
        lastMovieDrawTime = elapsed;

        const videoBounce = hlsPlayer.drawToScreenCanvas(
          movieCtx,
          movieCanvas.width,
          movieCanvas.height
        );

        const bounce =
          videoBounce ||
          renderMovieFrame(
            movieCtx,
            movieCanvas.width,
            movieCanvas.height,
            elapsed,
            st.movie,
            !st.isPaused
          );

        screenTexture.needsUpdate = true;

        // Drive the auditorium's only light source with the real-time movie frame's RGB colors!
        _color.setRGB(bounce.r, bounce.g, bounce.b);
        screenBounceLight.color.lerp(_color, 0.22);
        if (screenAreaLight) {
          screenAreaLight.color.lerp(_color, 0.22);
        }
      }

      // True Dark Cinema Mode: When in 3D viewing, extinguish house/wall lights so ONLY the screen glows!
      const is3D = st.viewMode === 'immersive-3d' || st.viewMode === 'transitioning-to-3d';
      const targetHouseIntensity = is3D ? 0.025 : 1.15;
      const targetHemiIntensity = is3D ? 0.04 : 0.45;
      const targetWallIntensity = is3D ? 0.03 : 0.55;
      const targetRimIntensity = is3D ? 0.04 : 0.22;
      const targetEnvIntensity = is3D ? 0.05 : 0.25;

      houseLight.intensity = THREE.MathUtils.damp(
        houseLight.intensity,
        targetHouseIntensity,
        5.0,
        delta
      );
      hemiLight.intensity = THREE.MathUtils.damp(
        hemiLight.intensity,
        targetHemiIntensity,
        5.0,
        delta
      );
      leftWallLight.intensity = THREE.MathUtils.damp(
        leftWallLight.intensity,
        targetWallIntensity,
        5.0,
        delta
      );
      rightWallLight.intensity = THREE.MathUtils.damp(
        rightWallLight.intensity,
        targetWallIntensity,
        5.0,
        delta
      );
      rimLight.intensity = THREE.MathUtils.damp(
        rimLight.intensity,
        targetRimIntensity,
        5.0,
        delta
      );
      scene.environmentIntensity = THREE.MathUtils.damp(
        scene.environmentIntensity,
        targetEnvIntensity,
        5.0,
        delta
      );

      const targetFov = st.viewMode === 'planar' ? 52 : 62;
      if (Math.abs(ctrl.currentFov - targetFov) > 0.05) {
        ctrl.currentFov = THREE.MathUtils.damp(ctrl.currentFov, targetFov, 7.0, delta);
        camera.fov = ctrl.currentFov;
        camera.updateProjectionMatrix();
      }

      if (ctrl.flightActive) {
        ctrl.flightProgress += delta / ctrl.flightDuration;
        if (ctrl.flightProgress >= 1) {
          ctrl.flightProgress = 1;
          ctrl.flightActive = false;
          ctrl.currPos.copy(ctrl.flightEndPos);
          ctrl.currLook.copy(ctrl.flightEndLook);
          st.onTransitionComplete(ctrl.flightTargetMode);
        } else {
          const eased = smootherstep(ctrl.flightProgress);
          evalQuadraticBezier(
            ctrl.currPos,
            ctrl.flightStartPos,
            ctrl.flightMidPos,
            ctrl.flightEndPos,
            eased
          );
          ctrl.currLook.lerpVectors(ctrl.flightStartLook, ctrl.flightEndLook, eased);
        }

        camera.position.copy(ctrl.currPos);
        camera.lookAt(ctrl.currLook);
      } else if (st.viewMode === 'immersive-3d') {
        ctrl.currPos.x = THREE.MathUtils.damp(ctrl.currPos.x, st.activeSeat.eyePos.x, 8, delta);
        ctrl.currPos.y = THREE.MathUtils.damp(ctrl.currPos.y, st.activeSeat.eyePos.y, 8, delta);
        ctrl.currPos.z = THREE.MathUtils.damp(ctrl.currPos.z, st.activeSeat.eyePos.z, 8, delta);

        ctrl.yaw = THREE.MathUtils.damp(ctrl.yaw, ctrl.targetYaw, 10, delta);
        ctrl.pitch = THREE.MathUtils.damp(ctrl.pitch, ctrl.targetPitch, 10, delta);

        _vDir.set(
          0 - ctrl.currPos.x,
          SCREEN_CONFIG.centerY - ctrl.currPos.y,
          SCREEN_CONFIG.centerZ - ctrl.currPos.z
        ).normalize();

        const baseYaw = Math.atan2(_vDir.x, _vDir.z);
        const basePitch = Math.asin(THREE.MathUtils.clamp(_vDir.y, -0.99, 0.99));

        const finalYaw = baseYaw + ctrl.yaw;
        const finalPitch = THREE.MathUtils.clamp(
          basePitch + ctrl.pitch,
          -Math.PI * 0.44,
          Math.PI * 0.44
        );

        const cosP = Math.cos(finalPitch);
        ctrl.currLook.set(
          ctrl.currPos.x + Math.sin(finalYaw) * cosP * 10,
          ctrl.currPos.y + Math.sin(finalPitch) * 10,
          ctrl.currPos.z + Math.cos(finalYaw) * cosP * 10
        );

        camera.position.copy(ctrl.currPos);
        camera.lookAt(ctrl.currLook);
      } else {
        const hoverX = Math.sin(elapsed * 0.22) * 0.25;
        ctrl.currPos.set(hoverX, 21.5, 3.5);
        ctrl.currLook.set(0, 0.5, -2.2);
        camera.position.copy(ctrl.currPos);
        camera.lookAt(ctrl.currLook);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      hlsPlayer.dispose();
      hlsPlayerRef.current = null;
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      screenTexture.dispose();
      contactShadowTex.dispose();
      contactShadowGeo.dispose();
      pbrTextures.dispose();
      seatGeos.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={canvasMountRef}
      className="fixed inset-0 w-full h-full z-0 overflow-hidden"
      style={{ cursor: viewMode === 'immersive-3d' ? 'grab' : 'default' }}
    />
  );
};
