import * as THREE from 'three'
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export function initDevice3D(canvasEl, options = {}) {
  const { showPedestal = false, deviceScale = showPedestal ? 2.2 : 3.5 } = options

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene()
  scene.background = null

  // ── Camera ─────────────────────────────────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(45, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 100)
  camera.position.set(0, 1.2, 5.8)
  camera.lookAt(0, -0.3, 0)
  scene.add(camera)

  let greenLineMat = null
  let platformGlowTarget = 1.0
  let platformGlowCurrent = 1.0

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled    = true
  renderer.shadowMap.type       = THREE.PCFSoftShadowMap
  renderer.toneMapping          = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure  = 0.95  // Dialed back to prevent overexposure
  renderer.outputColorSpace     = THREE.SRGBColorSpace

  // ── Environment Map (Crucial for premium reflections) ──────────────────────
  const pmremGenerator = new THREE.PMREMGenerator(renderer)
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture

  // ── Lighting ───────────────────────────────────────────────────────────────
  
  // Ambient fill
  scene.add(new THREE.AmbientLight(0xffffff, 0.35))

  // Key: top-left studio light
  const key = new THREE.DirectionalLight(0xffffff, 1.3)
  key.position.set(-4, 8, 6)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048) // Sharper shadows
  key.shadow.bias = -0.0001
  Object.assign(key.shadow.camera, { near: 0.5, far: 24, left: -4, right: 4, top: 4, bottom: -4 })
  scene.add(key)

  // Fill: right side cool daylight
  const fill = new THREE.DirectionalLight(0xdbeafe, 0.6)
  fill.position.set(6, 3, 4)
  scene.add(fill)

  // Rim: strong neon-green backlight to separate device from background
  const rim = new THREE.DirectionalLight(0x43e277, 1.5)
  rim.position.set(-2, -2, -8)
  scene.add(rim)

  // Bottom bounce (lifts connector details)
  const bounce = new THREE.PointLight(0x2fd36b, 0.8, 10)
  bounce.position.set(0, -3, 3)
  scene.add(bounce)

  // ── Loading spinner ───────────────────────────────────────────────────────
  const wrap = canvasEl.parentElement
  if (wrap && getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative'

  const loaderEl = document.createElement('div')
  loaderEl.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;'
  loaderEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;">
      <div style="width:36px;height:36px;border-radius:50%;
                  border:3px solid rgba(47,211,107,0.18);border-top-color:#2fd36b;
                  animation:_dspin 0.8s linear infinite;"></div>
      <span id="_dev_pct" style="font-family:'JetBrains Mono',monospace;
                                  font-size:10px;letter-spacing:.15em;color:#64748B;">
        LOADING MODEL
      </span>
    </div>`
  if (!document.getElementById('_dspin_s')) {
    const s = document.createElement('style')
    s.id = '_dspin_s'
    s.textContent = '@keyframes _dspin{to{transform:rotate(360deg)}}'
    document.head.appendChild(s)
  }
  wrap?.appendChild(loaderEl)

  // ── Loaders ───────────────────────────────────────────────────────────────
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  const gltfLoader = new GLTFLoader()
  gltfLoader.setDRACOLoader(dracoLoader)

  let root = null, alive = true, rafId = null
  let isVisible = true

  // ── Scroll optimization (Pause when off-screen) ───────────────────────────
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting
    if (isVisible && !rafId) {
      // Resume animation loop if it was paused
      prevT = clock.getElapsedTime()
      animate()
    }
  }, { threshold: 0 })
  observer.observe(canvasEl)

  // ── Rotation state ──────────────────────────────────────────────────────
  const AUTO_SPEED = 0.45        // radians / second continuous spin
  let rotY  = Math.PI / 7       // current Y angle
  let rotX  = 0.06              // current X tilt
  let prevT = 0                 // previous timestamp for delta

  // Drag / touch state
  const drag = { active: false, prevX: 0, prevY: 0, velX: 0, velY: 0 }

  // Cursor style
  canvasEl.style.cursor = 'grab'

  gltfLoader.load(
    '/device.glb',

    // ── onLoad ──────────────────────────────────────────────────────────────
    (gltf) => {
      loaderEl.remove()
      root = gltf.scene

      // ── Preserve the baked UV texture, tweak for PBR response ───────────
      // The GLB stores shading as an emissive texture (self-lit).
      // We move it to the base-color slot so scene lights add specular
      // highlights on top of the baked look — much more dynamic.
      root.traverse(obj => {
        if (!obj.isMesh) return
        obj.castShadow    = true
        obj.receiveShadow = true

        const m = obj.material
        if (!m) return

        if (m.emissiveMap) {
          // ▶ Move baked texture: emissive → base color map
          //   The baked shading in the texture becomes the diffuse colour;
          //   scene lights add specular highlights on top.
          m.map              = m.emissiveMap
          m.emissiveMap      = null
          m.emissiveIntensity = 0
          m.emissive.set(0, 0, 0)
          m.color.set(1, 1, 1)   // white multiplier → texture shows at full saturation
        }

        // Material tweaks to match photo: glossy ABS with strong reflections
        m.roughness   = 0.45
        m.metalness   = 0.35
        m.envMapIntensity = 0.9  // Dialed back reflections
        m.needsUpdate = true
      })

      // ── Centre & scale to 2.2 world units on longest axis ───────────────
      root.updateWorldMatrix(true, true)
      const box    = new THREE.Box3().setFromObject(root)
      const size   = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())

      const scale = deviceScale / Math.max(size.x, size.y, size.z) 
      root.scale.setScalar(scale)
      root.position.set(
        -center.x * scale,
        -center.y * scale + 0.35,
        -center.z * scale
      )

      // ── Add to scene, set initial angle ──────────────────────────────
      scene.add(root)
      root.rotation.y = rotY
      root.rotation.x = rotX

      // ── Shadow catcher beneath model ───────────────────────────────────
      root.updateWorldMatrix(true, true)
      const wb = new THREE.Box3().setFromObject(root)
      const floorY = wb.min.y - 0.01

      const sp = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.ShadowMaterial({ opacity: 0.22 })
      )
      sp.rotation.x = -Math.PI / 2
      sp.position.y = showPedestal ? floorY - 0.1 : floorY
      sp.receiveShadow = true
      scene.add(sp)

      // ── 3D Pedestal (if enabled) ───────────────────────────────────────
      if (showPedestal) {
        const pedGroup = new THREE.Group()
        // Top of the cylinder sits exactly at floorY. Height is 0.1, so center is floorY - 0.05
        pedGroup.position.y = floorY - 0.05

        // Top thick white platform
        const topPlatform = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 1.6, 0.16, 64),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 })
        )
        topPlatform.position.y = -0.08 // Top surface is at y=0
        topPlatform.receiveShadow = true
        pedGroup.add(topPlatform)

        // Bright green glowing groove line
        greenLineMat = new THREE.MeshStandardMaterial({ 
          color: 0x43e277,
          emissive: 0x43e277,
          emissiveIntensity: 1.0
        })
        const greenLine = new THREE.Mesh(
          new THREE.CylinderGeometry(1.605, 1.605, 0.012, 64),
          greenLineMat
        )
        greenLine.position.y = -0.166
        pedGroup.add(greenLine)

        // Bottom white lip
        const bottomLip = new THREE.Mesh(
          new THREE.CylinderGeometry(1.6, 1.6, 0.03, 64),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 })
        )
        bottomLip.position.y = -0.187
        pedGroup.add(bottomLip)

        scene.add(pedGroup)
      }

      animate()
    },

    // ── onProgress ──────────────────────────────────────────────────────────
    (xhr) => {
      if (xhr.total) {
        const p = Math.round((xhr.loaded / xhr.total) * 100)
        const el = document.getElementById('_dev_pct')
        if (el) el.textContent = `LOADING  ${p}%`
      }
    },

    // ── onError ─────────────────────────────────────────────────────────────
    (err) => { console.error('[device3d] GLB error:', err); loaderEl.remove() }
  )

  // ── Pointer helpers (unified mouse + touch) ───────────────────────────────
  function getXY(e) {
    return e.touches ? [e.touches[0].clientX, e.touches[0].clientY]
                     : [e.clientX,            e.clientY]
  }

  function onPointerDown(e) {
    drag.active = true
    ;[drag.prevX, drag.prevY] = getXY(e)
    drag.velX = drag.velY = 0
    canvasEl.style.cursor = 'grabbing'
  }

  function onPointerMove(e) {
    if (!drag.active) return
    const [cx, cy] = getXY(e)
    const dx = cx - drag.prevX
    const dy = cy - drag.prevY
    // Decreased rotation sensitivity for a much smoother drag
    rotY += dx * 0.003
    rotX  = Math.max(-0.55, Math.min(0.55, rotX + dy * 0.003))
    // Tiny momentum velocity so it doesn't spin wildly
    drag.velX = dx * 0.0002
    drag.velY = dy * 0.0002
    drag.prevX = cx
    drag.prevY = cy
  }

  function onPointerUp() {
    drag.active = false
    canvasEl.style.cursor = 'grab'
  }

  canvasEl.addEventListener('mousedown',  onPointerDown)
  canvasEl.addEventListener('touchstart', onPointerDown, { passive: true })
  window.addEventListener('mousemove',   onPointerMove)
  window.addEventListener('touchmove',   onPointerMove, { passive: true })
  window.addEventListener('mouseup',     onPointerUp)
  window.addEventListener('touchend',    onPointerUp)

  // ── Resize ────────────────────────────────────────────────────────────────
  function onResize() {
    W = canvasEl.clientWidth; H = canvasEl.clientHeight
    camera.aspect = W / H
    camera.updateProjectionMatrix()
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  }
  window.addEventListener('resize', onResize, { passive: true })

  // ── Animation loop ────────────────────────────────────────────────────────
  const clock = new THREE.Clock()

  function animate() {
    if (!alive) return
    
    // Halt loop completely if off-screen to save GPU and prevent scroll lag
    if (!isVisible) {
      rafId = null
      return
    }
    
    rafId = requestAnimationFrame(animate)
    const t  = clock.getElapsedTime()
    const dt = prevT > 0 ? Math.min(t - prevT, 0.05) : 0.016  // cap dt at 50 ms
    prevT = t

    if (root) {
        // ── Rotation update ──────────────────────────────────────────────
        if (drag.active) {
          rotY += drag.velX
          rotX += drag.velY
          drag.velX *= 0.8
          drag.velY *= 0.8
        } else {
          rotY += AUTO_SPEED * dt
          rotX += (0.06 - rotX) * 0.04
        }

        // ── Smooth apply ─────────────────────────────────────────────────
        root.rotation.y += (rotY - root.rotation.y) * 0.06
        root.rotation.x += (rotX - root.rotation.x) * 0.06

      // ── Gentle float ─────────────────────────────────────────────────
      root.position.y += (Math.sin(t * 0.55) * 0.055 - root.position.y + 0.35) * 0.04
    }

    if (greenLineMat) {
      platformGlowCurrent += (platformGlowTarget - platformGlowCurrent) * 0.1
      greenLineMat.emissiveIntensity = platformGlowCurrent
    }

    renderer.render(scene, camera)
  }

  // ── Dispose ───────────────────────────────────────────────────────────────
  function dispose() {
    alive = false
    observer.disconnect()
    if (rafId) cancelAnimationFrame(rafId)
    canvasEl.removeEventListener('mousedown',  onPointerDown)
    canvasEl.removeEventListener('touchstart', onPointerDown)
    window.removeEventListener('mousemove',   onPointerMove)
    window.removeEventListener('touchmove',   onPointerMove)
    window.removeEventListener('mouseup',     onPointerUp)
    window.removeEventListener('touchend',    onPointerUp)
    window.removeEventListener('resize',      onResize)
    scene.traverse(obj => {
      if (!obj.isMesh) return
      obj.geometry?.dispose()
      const ms = Array.isArray(obj.material) ? obj.material : [obj.material]
      ms.forEach(m => { m?.map?.dispose(); m?.envMap?.dispose(); m?.dispose() })
    })
    renderer.dispose()
    dracoLoader.dispose()
  }

  function setPlatformGlow(active) {
    platformGlowTarget = active ? 8.0 : 1.0
  }

  return { dispose, setPlatformGlow }
}
