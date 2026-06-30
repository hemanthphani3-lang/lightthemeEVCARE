import * as THREE from 'three'
import { GLTFLoader }  from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export function initScooter3D(canvasEl) {
  const scene = new THREE.Scene()
  scene.background = null

  const camera = new THREE.PerspectiveCamera(45, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 100)
  camera.position.set(0, 0.2, 6) // Pulled camera back to create a huge wide track
  camera.lookAt(0, 0, 0)
  scene.add(camera)

  const renderer = new THREE.WebGLRenderer({
    canvas: canvasEl,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance"
  })
  renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(5, 5, 5)
  scene.add(light)
  const ambient = new THREE.AmbientLight(0xffffff, 1.5)
  scene.add(ambient)

  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  loader.setDRACOLoader(dracoLoader)

  let scooterGroup = new THREE.Group()
  scene.add(scooterGroup)
  let wheels = []
  let alive = true
  let rafId = null
  let isVisible = true
  let prevT = 0

  loader.load('/scooter.glb', (gltf) => {
    const model = gltf.scene
    
    // Scale model to be significantly larger
    const box = new THREE.Box3().setFromObject(model)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2.5 / maxDim
    model.scale.set(scale, scale, scale)
    
    // Center the model
    const center = new THREE.Vector3()
    box.getCenter(center)
    model.position.sub(center.multiplyScalar(scale))

    // Face the correct direction (flip 180 degrees from before)
    model.rotation.y = Math.PI / 2;

    scooterGroup.add(model)
    
    // Find wheels based on node names
    model.traverse((child) => {
      if (child.isMesh || child.isGroup) {
        const name = child.name.toLowerCase()
        if (name.includes('wheel') || name.includes('tire') || name.includes('tyre') || name.includes('roue') || name.includes('cylinder') || name.includes('circle')) {
          wheels.push(child)
        }
      }
    })
  })

  const clock = new THREE.Clock()

  // Scroll optimization (Pause when off-screen)
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting
    if (isVisible && !rafId) {
      prevT = clock.getElapsedTime()
      animate()
    }
  }, { threshold: 0 })
  observer.observe(canvasEl)

  function animate() {
    if (!alive) return
    if (!isVisible) {
      rafId = null
      return
    }
    rafId = requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    const dt = prevT > 0 ? Math.min(t - prevT, 0.05) : 0.016
    prevT = t
    
    // Easing functions
    const easeOutQuad = t => t * (2 - t);
    const easeInQuad = t => t * t;
    
    // Calculate total distance to travel based on camera view width
    const dist = camera.position.z;
    const fov = camera.fov * Math.PI / 180;
    const heightAtZ = 2 * Math.tan(fov / 2) * dist;
    const widthAtZ = heightAtZ * camera.aspect;
    
    // Stay fully visible inside the card bounds
    const startX = -widthAtZ / 2 + 1.5;
    const endX = widthAtZ / 2 - 1.5;
    
    // Ensure it travels a good distance
    const travelDist = Math.max(endX - startX, 2.0); 
    
    const cycle = t % 8; // Slow down the loop to 8 seconds since the track is much wider now!
    let x = 0;
    let drivingSpeed = 0;
    
    if (cycle < 4.0) { 
       // 0-4s: Drive right
       const progress = cycle / 4.0;
       x = startX + travelDist * progress;
       drivingSpeed = travelDist / 4.0; 
       scooterGroup.rotation.y = 0; // Face right
    } else { 
       // 4-8s: Drive left
       const progress = (cycle - 4.0) / 4.0;
       x = startX + travelDist - travelDist * progress;
       drivingSpeed = travelDist / 4.0;
       scooterGroup.rotation.y = Math.PI; // Face left
    }
    
    scooterGroup.position.x = x;

    // Spin the wheels based on actual driving speed
    wheels.forEach(wheel => {
      wheel.rotation.x -= drivingSpeed * 0.45;
    })

    renderer.render(scene, camera)
  }
  
  function onResize() {
    const W = canvasEl.clientWidth
    const H = canvasEl.clientHeight
    if (W > 0 && H > 0) {
      camera.aspect = W / H
      camera.updateProjectionMatrix()
      renderer.setSize(W, H, false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
  }
  window.addEventListener('resize', onResize, { passive: true })
  
  // Trigger initial resize
  onResize()

  animate()

  function dispose() {
    alive = false
    if (rafId) cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    scene.traverse(obj => {
      if (!obj.isMesh) return
      obj.geometry?.dispose()
      const ms = Array.isArray(obj.material) ? obj.material : [obj.material]
      ms.forEach(m => { m?.map?.dispose(); m?.envMap?.dispose(); m?.dispose() })
    })
    renderer.dispose()
    dracoLoader.dispose()
  }

  return { dispose }
}
