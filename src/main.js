import './style.css'
import { initDevice3D } from './device3d.js'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ── Google Sheets Web App Endpoint ──
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGTJf3R74_6N21f_RhihHhzrJougKK12bUEKccQdF18iCJ-tCnt8KimORlyppzhqFY/exec'

function submitToGoogleSheets(data, onSuccess, onError) {
  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(() => onSuccess())
  .catch(err => {
    console.error('Sheets submission error:', err)
    onError()
  })
}

// ── 3D Hero & Ecosystem Devices ───────────────────────────────────────────────────
const heroCanvas = document.getElementById('hero-canvas')
const ecosystemCanvas = document.getElementById('ecosystem-canvas')
let device3D = null
let ecosystemDevice3D = null

function mountDevice3D() {
  if (heroCanvas && !device3D) {
    device3D = initDevice3D(heroCanvas)
  }
  if (ecosystemCanvas && !ecosystemDevice3D) {
    ecosystemDevice3D = initDevice3D(ecosystemCanvas, { showPedestal: true })
  }
}

// Mount after first paint so the canvas has layout dimensions
requestAnimationFrame(() => {
  requestAnimationFrame(mountDevice3D)
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (device3D) {
      device3D.dispose()
      device3D = null
    }
    if (ecosystemDevice3D) {
      ecosystemDevice3D.dispose()
      ecosystemDevice3D = null
    }
  })
}

// ── Navbar scroll effect ──────────────────────────────────────────────────────
const navbar = document.getElementById('navbar')
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40)
}, { passive: true })

// ── Hamburger menu ────────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger')
const mobileMenu = document.getElementById('mobileMenu')
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open')
})
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'))
})

// ── Scroll reveal ─────────────────────────────────────────────────────────────
const revealEls = document.querySelectorAll('.reveal-up, .reveal-left, .reveal-right')
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed')
      observer.unobserve(e.target)
    }
  })
}, { threshold: 0.12 })
revealEls.forEach(el => observer.observe(el))

// ── Ecosystem feature hover ───────────────────────────────────────────────────
document.querySelectorAll('.eco-feature').forEach(feat => {
  feat.addEventListener('mouseenter', () => {
    document.querySelectorAll('.eco-feature').forEach(f => f.classList.remove('active'))
    feat.classList.add('active')
  })
})

// ── Ecosystem Static Lines ────────────────────────────────────────────────────
// Register hover listeners ONCE globally to prevent duplicates on resize / redraw
function initEcosystemHovers() {
  document.querySelectorAll('.eco-feature').forEach(feat => {
    feat.addEventListener('mouseenter', () => {
      if (feat._ecoPaths) {
        feat._ecoPaths.forEach(p => {
          p.setAttribute("stroke", "rgba(47, 211, 107, 1)")
          p.setAttribute("stroke-width", "2")
          p.style.filter = "drop-shadow(0 0 5px rgba(47,211,107,0.5))"
        })
      }
      if (ecosystemDevice3D) ecosystemDevice3D.setPlatformGlow(true)
    })
    feat.addEventListener('mouseleave', () => {
      if (feat._ecoPaths) {
        feat._ecoPaths.forEach(p => {
          p.setAttribute("stroke", "rgba(47, 211, 107, 0.4)")
          p.setAttribute("stroke-width", "1")
          p.style.filter = "none"
        })
      }
      setTimeout(() => {
        if (ecosystemDevice3D && document.querySelectorAll('.eco-feature:hover').length === 0) {
          ecosystemDevice3D.setPlatformGlow(false)
        }
      }, 10)
    })
  })
}

function drawStaticEcosystemLines() {
  const svg = document.getElementById('eco-static-lines')
  const grid = document.querySelector('.ecosystem-grid')
  const canvas = document.getElementById('ecosystem-canvas')
  const dots = document.querySelectorAll('.eco-connection-dot')
  if (!svg || !grid || !canvas || dots.length === 0) return

  const gridRect = grid.getBoundingClientRect()
  const canvasRect = canvas.getBoundingClientRect()
  
  const centerX = (canvasRect.left - gridRect.left) + (canvasRect.width / 2)
  const centerY = (canvasRect.top - gridRect.top) + (canvasRect.height / 2)

  // Clear previous paths from the DOM and reset features paths array
  svg.innerHTML = ''
  document.querySelectorAll('.eco-feature').forEach(feat => {
    feat._ecoPaths = []
  })
  
  const leftDots = Array.from(document.querySelectorAll('.eco-left .eco-connection-dot'))
  const rightDots = Array.from(document.querySelectorAll('.eco-right .eco-connection-dot'))
  
  function drawPairs(dotsArray, isRight) {
    const sideDir = isRight ? 1 : -1
    const drawDir = isRight ? -1 : 1
    const endX = centerX + (sideDir * canvasRect.width * 0.38)
    const midX = centerX + (sideDir * 240)
    const r = 16
    
    for (let i = 0; i < dotsArray.length; i += 2) {
      if (i + 1 >= dotsArray.length) break;
      
      const dotA = dotsArray[i]
      const dotB = dotsArray[i+1]
      
      const rectA = dotA.getBoundingClientRect()
      const startX_A = (rectA.left - gridRect.left) + (rectA.width / 2)
      const startY_A = (rectA.top - gridRect.top) + (rectA.height / 2)
      
      const rectB = dotB.getBoundingClientRect()
      const startX_B = (rectB.left - gridRect.left) + (rectB.width / 2)
      const startY_B = (rectB.top - gridRect.top) + (rectB.height / 2)
      
      const mergeY = (startY_A + startY_B) / 2
      
      const branchA_d = `M ${startX_A} ${startY_A} ` +
                        `L ${midX - (drawDir * r)} ${startY_A} ` +
                        `Q ${midX} ${startY_A}, ${midX} ${startY_A + r} ` +
                        `L ${midX} ${mergeY - r} ` +
                        `Q ${midX} ${mergeY}, ${midX + (drawDir * r)} ${mergeY}`
                        
      const branchB_d = `M ${startX_B} ${startY_B} ` +
                        `L ${midX - (drawDir * r)} ${startY_B} ` +
                        `Q ${midX} ${startY_B}, ${midX} ${startY_B - r} ` +
                        `L ${midX} ${mergeY + r} ` +
                        `Q ${midX} ${mergeY}, ${midX + (drawDir * r)} ${mergeY}`
                        
      const trunk_d = `M ${midX + (drawDir * r)} ${mergeY} L ${endX} ${mergeY}`
      
      const createPath = (d) => {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "path")
        p.setAttribute("d", d)
        p.setAttribute("fill", "none")
        p.setAttribute("stroke", "rgba(47, 211, 107, 0.4)")
        p.setAttribute("stroke-width", "1")
        p.style.transition = "all 0.3s ease"
        svg.appendChild(p)
        return p
      }
      
      const pathA = createPath(branchA_d)
      const pathB = createPath(branchB_d)
      const pathTrunk = createPath(trunk_d)
      
      const blockA = dotA.closest('.eco-feature')
      if (blockA) {
        blockA._ecoPaths.push(pathA)
        blockA._ecoPaths.push(pathTrunk)
      }
      
      const blockB = dotB.closest('.eco-feature')
      if (blockB) {
        blockB._ecoPaths.push(pathB)
        blockB._ecoPaths.push(pathTrunk)
      }
    }
  }

  drawPairs(leftDots, false)
  drawPairs(rightDots, true)

  const dot1 = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  dot1.setAttribute("cx", centerX - 120)
  dot1.setAttribute("cy", centerY - 180)
  dot1.setAttribute("r", "2.5")
  dot1.setAttribute("fill", "rgba(47, 211, 107, 0.8)")
  
  const dot2 = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  dot2.setAttribute("cx", centerX + 140)
  dot2.setAttribute("cy", centerY - 120)
  dot2.setAttribute("r", "2.5")
  dot2.setAttribute("fill", "rgba(47, 211, 107, 0.8)")

  const dot3 = document.createElementNS("http://www.w3.org/2000/svg", "circle")
  dot3.setAttribute("cx", centerX - 180)
  dot3.setAttribute("cy", centerY + 100)
  dot3.setAttribute("r", "2.5")
  dot3.setAttribute("fill", "rgba(47, 211, 107, 0.8)")

  svg.appendChild(dot1)
  svg.appendChild(dot2)
  svg.appendChild(dot3)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initEcosystemHovers()
    drawStaticEcosystemLines()
  })
} else {
  initEcosystemHovers()
  drawStaticEcosystemLines()
}

let resizeTimeout = null
window.addEventListener('resize', () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(drawStaticEcosystemLines, 100)
}, { passive: true })

setTimeout(drawStaticEcosystemLines, 500)
setTimeout(drawStaticEcosystemLines, 1000)

// ── Contact form ──────────────────────────────────────────────────────────────
const form = document.getElementById('contactForm')
const toast = createToast()

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const btn = document.getElementById('submitBtn')
  btn.textContent = 'SENDING...'
  btn.disabled = true

  const data = {
    timestamp: new Date().toLocaleString(),
    formType: 'Contact',
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    type: document.getElementById('type').value,
    message: document.getElementById('message').value
  }

  submitToGoogleSheets(data, () => {
    btn.textContent = 'SEND MESSAGE →'
    btn.disabled = false
    form.reset()
    showToast('✓ MESSAGE SENT SUCCESSFULLY')
  }, () => {
    btn.textContent = 'SEND MESSAGE →'
    btn.disabled = false
    showToast('❌ SUBMISSION FAILED. PLEASE TRY AGAIN.')
  })
})

function createToast() {
  const t = document.createElement('div')
  t.className = 'toast'
  document.body.appendChild(t)
  return t
}

function showToast(msg) {
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 3000)
}

// ── Animated bar fill on scroll ───────────────────────────────────────────────
const barFills = document.querySelectorAll('.bar-fill')
const barObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.animation = 'fillBar 1.5s cubic-bezier(0.34,1.56,0.64,1) forwards'
      barObserver.unobserve(e.target)
    }
  })
}, { threshold: 0.5 })
barFills.forEach(b => barObserver.observe(b))

// ── Smooth active nav link highlighting ──────────────────────────────────────
const sections = document.querySelectorAll('section[id]')
const navLinks = document.querySelectorAll('.nav-links a')
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => {
        a.style.color = a.getAttribute('href') === `#${e.target.id}`
          ? 'var(--dark-slate)'
          : ''
      })
    }
  })
}, { threshold: 0.5 })
sections.forEach(s => navObserver.observe(s))

// ── Bento graph bars animation ────────────────────────────────────────────────
const gBars = document.querySelectorAll('.g-bar')
const bentoObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      gBars.forEach((bar, i) => {
        setTimeout(() => {
          bar.style.transition = 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)'
          bar.style.height = bar.style.height
        }, i * 80)
      })
      bentoObserver.disconnect()
    }
  })
}, { threshold: 0.3 })
const bentoGraph = document.querySelector('.bento-graph')
if (bentoGraph) bentoObserver.observe(bentoGraph)

// ── Usecases Heading Scroll Animation ──────────────────────────────────────────
const usecasesHeading = document.querySelector('.usecases-section .headline-lg')
const usecasesLabel = document.querySelector('.usecases-section .section-label')

if (usecasesHeading) {
  gsap.fromTo(usecasesHeading, 
    { 
      opacity: 0, 
      y: 40,
      scale: 0.95
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.usecases-section',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    }
  )
}

if (usecasesLabel) {
  gsap.fromTo(usecasesLabel,
    {
      opacity: 0,
      y: 20
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.usecases-section',
        start: 'top 85%',
        toggleActions: 'play none none none'
      }
    }
  )
}

// ── 3D Cylinder Scrollytelling Setup ──────────────────────────────────────────
const pinWrapper = document.querySelector('.usecases-pin-wrapper')
const scrollyImages = document.querySelectorAll('.scrolly-img')
const cylinderItems = document.querySelectorAll('.cylinder-item')

if (pinWrapper && scrollyImages.length > 0 && cylinderItems.length > 0) {
  const numItems = cylinderItems.length
  const anglePerItem = 60 // degrees between each item on the cylinder
  const radius = 300 // distance from center of cylinder

  // Initial positioning
  cylinderItems.forEach((item, i) => {
    gsap.set(item, {
      rotationX: -i * anglePerItem,
      transformOrigin: `50% 50% -${radius}px`,
      opacity: i === 0 ? 1 : 0
    })
  })

  ScrollTrigger.create({
    trigger: '.usecases-section',
    start: 'top top',
    end: '+=2500', // Reduced scroll distance so it doesn't feel like a chore
    pin: true,
    scrub: 0.5, // Added a slight 0.5s ease to smooth out wheel ticks without feeling restricted
    onUpdate: (self) => {
      const progress = self.progress
      // Total rotation needed to bring the last item to the front
      const maxRotation = (numItems - 1) * anglePerItem
      const currentRotation = progress * maxRotation

      // Rotate text items
      cylinderItems.forEach((item, i) => {
        const itemRotation = -i * anglePerItem + currentRotation
        
        // Fade opacity based on distance from front (0 degrees)
        const distFromCenter = Math.abs(itemRotation)
        let itemOpacity = 1 - (distFromCenter / 45) // fades out completely at 45 degrees
        if (itemOpacity < 0) itemOpacity = 0
        if (itemOpacity > 1) itemOpacity = 1
        
        gsap.set(item, {
          rotationX: itemRotation,
          opacity: itemOpacity,
          pointerEvents: itemOpacity > 0.8 ? 'auto' : 'none'
        })
      })

      // Ultra-smooth crossfade tied directly to scroll progress
      const currentFloatingIndex = progress * (numItems - 1)
      
      scrollyImages.forEach((img, i) => {
        // Distance from current scroll point (0 means it's the exact active item)
        const dist = Math.abs(currentFloatingIndex - i)
        
        // Opacity is 1 when dist is 0, and fades to 0 when dist reaches 1 (the next item)
        let imgOpacity = 1 - dist
        if (imgOpacity < 0) imgOpacity = 0
        if (imgOpacity > 1) imgOpacity = 1
        
        gsap.set(img, {
          opacity: imgOpacity,
          scale: 0.95 + (0.05 * imgOpacity), // Subtle scale-in effect matching the fade
          zIndex: Math.round(imgOpacity * 10)
        })
      })
    }
  })
}

// ── Interactive Booking Modal & Form Views ──────────────────────────────────
const bookCard = document.getElementById('book-card')
const bookingModal = document.getElementById('bookingModal')
const closeModal = document.getElementById('closeModal')
const optionsView = document.getElementById('optionsView')
const individualFormView = document.getElementById('individualFormView')
const fleetFormView = document.getElementById('fleetFormView')
const btnIndividual = document.getElementById('btnIndividual')
const btnFleet = document.getElementById('btnFleet')
const btnBackToOptions = document.getElementById('btnBackToOptions')
const btnFleetBackToOptions = document.getElementById('btnFleetBackToOptions')
const modalInsideCard = bookingModal?.querySelector('.modal-card')

if (bookCard && bookingModal) {
  const showOptions = () => {
    if (optionsView && individualFormView && fleetFormView) {
      optionsView.style.display = 'block'
      individualFormView.style.display = 'none'
      fleetFormView.style.display = 'none'
    }
    if (modalInsideCard) modalInsideCard.classList.remove('wide')
  }

  bookCard.addEventListener('click', () => {
    showOptions()
    bookingModal.classList.add('active')
    document.body.classList.add('modal-open')
  })

  const hideModal = () => {
    bookingModal.classList.remove('active')
    document.body.classList.remove('modal-open')
  }

  if (closeModal) closeModal.addEventListener('click', hideModal)

  // Close modal when clicking on the blurred backdrop overlay
  bookingModal.addEventListener('click', (e) => {
    if (e.target === bookingModal) hideModal()
  })

  // Show Individuals form view inside modal
  if (btnIndividual && optionsView && individualFormView && fleetFormView) {
    btnIndividual.addEventListener('click', (e) => {
      e.preventDefault()
      optionsView.style.display = 'none'
      individualFormView.style.display = 'block'
      fleetFormView.style.display = 'none'
      if (modalInsideCard) modalInsideCard.classList.add('wide')
    })
  }

  // Show Fleet form view inside modal
  if (btnFleet && optionsView && individualFormView && fleetFormView) {
    btnFleet.addEventListener('click', (e) => {
      e.preventDefault()
      optionsView.style.display = 'none'
      individualFormView.style.display = 'none'
      fleetFormView.style.display = 'block'
      if (modalInsideCard) modalInsideCard.classList.add('wide')
    })
  }

  // Handle back button on individual form
  if (btnBackToOptions) {
    btnBackToOptions.addEventListener('click', (e) => {
      e.preventDefault()
      showOptions()
    })
  }

  // Handle back button on fleet form
  if (btnFleetBackToOptions) {
    btnFleetBackToOptions.addEventListener('click', (e) => {
      e.preventDefault()
      showOptions()
    })
  }

  // Validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Shared Helper validation indicator toggler
  const validateField = (input, isValid) => {
    if (!input) return
    if (input.value.trim() === '') {
      input.classList.remove('is-valid', 'is-invalid')
      return
    }
    if (isValid) {
      input.classList.add('is-valid')
      input.classList.remove('is-invalid')
    } else {
      input.classList.add('is-invalid')
      input.classList.remove('is-valid')
    }
  }

  // Helper function to setup phone number formatters (+91 XXXXX XXXXX)
  const setupPhoneFormatter = (phoneInput) => {
    if (!phoneInput) return
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '') // remove non-digits
      if (value.startsWith('91')) {
        value = value.substring(2)
      }
      value = value.substring(0, 10) // cap to 10 numbers
      
      if (value.length > 5) {
        e.target.value = `+91 ${value.slice(0, 5)} ${value.slice(5)}`
      } else if (value.length > 0) {
        e.target.value = `+91 ${value}`
      } else {
        e.target.value = ''
      }
      validateField(phoneInput, value.length === 10)
    })
    phoneInput.addEventListener('blur', () => {
      const rawVal = phoneInput.value.replace(/\D/g, '').replace(/^91/, '')
      validateField(phoneInput, rawVal.length === 10)
    })
  }

  // ──────────────── INDIVIDUALS FORM CONTROLS ────────────────
  const bookingForm = document.getElementById('individualBookingForm')
  const nameInput = document.getElementById('bookingName')
  const phoneInput = document.getElementById('bookingPhone')
  const emailInput = document.getElementById('bookingEmail')
  const locationInput = document.getElementById('bookingLocation')
  const brandInput = document.getElementById('bookingBrand')
  const submitBtn = document.getElementById('bookingSubmitBtn')
  const budgetBtns = document.querySelectorAll('#individualFormView .budget-btn')
  const selectedBudget = document.getElementById('selectedBudget')

  // Setup individual form elements
  setupPhoneFormatter(phoneInput)
  if (nameInput) nameInput.addEventListener('blur', () => validateField(nameInput, nameInput.value.trim().length > 2))
  if (emailInput) emailInput.addEventListener('blur', () => validateField(emailInput, emailRegex.test(emailInput.value.trim())))
  if (locationInput) locationInput.addEventListener('blur', () => validateField(locationInput, locationInput.value.trim().length > 2))
  if (brandInput) brandInput.addEventListener('blur', () => validateField(brandInput, brandInput.value.trim().length > 2))

  // Budget selections
  budgetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      budgetBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      if (selectedBudget) selectedBudget.value = btn.getAttribute('data-value')
    })
  })

  // Submit Individual Form
  if (bookingForm && submitBtn) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault()

      const rawPhone = phoneInput.value.replace(/\D/g, '').replace(/^91/, '')
      const isFormValid = nameInput.value.trim().length > 2 &&
                          rawPhone.length === 10 &&
                          emailRegex.test(emailInput.value.trim()) &&
                          locationInput.value.trim().length > 2 &&
                          brandInput.value.trim().length > 2

      if (!isFormValid) {
        validateField(nameInput, nameInput.value.trim().length > 2)
        validateField(phoneInput, rawPhone.length === 10)
        validateField(emailInput, emailRegex.test(emailInput.value.trim()))
        validateField(locationInput, locationInput.value.trim().length > 2)
        validateField(brandInput, brandInput.value.trim().length > 2)
        showToast('⚠️ PLEASE CORRECT HIGHLIGHTED FIELDS')
        return
      }

      submitBtn.disabled = true
      const originalHtml = submitBtn.innerHTML
      submitBtn.innerHTML = `<span class="btn-spinner"></span> SUBMITTING...`

      const data = {
        timestamp: new Date().toLocaleString(),
        formType: 'Individual Booking',
        name: nameInput.value,
        phone: phoneInput.value,
        email: emailInput.value,
        location: locationInput.value,
        brandModel: brandInput.value,
        budget: selectedBudget ? selectedBudget.value : '',
        message: document.getElementById('bookingMessage') ? document.getElementById('bookingMessage').value : ''
      }

      submitToGoogleSheets(data, () => {
        submitBtn.style.background = '#2fd36b'
        submitBtn.style.borderColor = '#2fd36b'
        submitBtn.innerHTML = `✓ BOOKED SUCCESS!`

        setTimeout(() => {
          hideModal()
          bookingForm.reset()

          submitBtn.disabled = false
          submitBtn.style.background = ''
          submitBtn.style.borderColor = ''
          submitBtn.innerHTML = originalHtml

          const inputs = bookingForm.querySelectorAll('.form-input')
          inputs.forEach(i => i.classList.remove('is-valid', 'is-invalid'))

          budgetBtns.forEach(b => b.classList.remove('active'))
          if (budgetBtns[0]) budgetBtns[0].classList.add('active')
          if (selectedBudget) selectedBudget.value = '3k-5k'

          showToast('✓ INDIVIDUAL BOOKING REGISTERED')
        }, 1000)
      }, () => {
        submitBtn.disabled = false
        submitBtn.innerHTML = originalHtml
        showToast('❌ SUBMISSION FAILED. PLEASE TRY AGAIN.')
      })
    })
  }



  // ──────────────── FLEET FORM CONTROLS ────────────────
  const fleetBookingForm = document.getElementById('fleetBookingForm')
  const fleetCompany = document.getElementById('fleetCompany')
  const fleetContactName = document.getElementById('fleetContactName')
  const fleetPhone = document.getElementById('fleetPhone')
  const fleetEmail = document.getElementById('fleetEmail')
  const fleetLocation = document.getElementById('fleetLocation')
  const fleetSubmitBtn = document.getElementById('fleetSubmitBtn')
  const fleetBtns = document.querySelectorAll('#fleetFormView .budget-btn')
  const selectedFleetSize = document.getElementById('selectedFleetSize')

  // Setup fleet form elements
  setupPhoneFormatter(fleetPhone)
  if (fleetCompany) fleetCompany.addEventListener('blur', () => validateField(fleetCompany, fleetCompany.value.trim().length > 2))
  if (fleetContactName) fleetContactName.addEventListener('blur', () => validateField(fleetContactName, fleetContactName.value.trim().length > 2))
  if (fleetEmail) fleetEmail.addEventListener('blur', () => validateField(fleetEmail, emailRegex.test(fleetEmail.value.trim())))
  if (fleetLocation) fleetLocation.addEventListener('blur', () => validateField(fleetLocation, fleetLocation.value.trim().length > 2))

  // Fleet size selections
  fleetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fleetBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      if (selectedFleetSize) selectedFleetSize.value = btn.getAttribute('data-value')
    })
  })

  // Submit Fleet Form
  if (fleetBookingForm && fleetSubmitBtn) {
    fleetBookingForm.addEventListener('submit', (e) => {
      e.preventDefault()

      const rawPhone = fleetPhone.value.replace(/\D/g, '').replace(/^91/, '')
      const isFormValid = fleetCompany.value.trim().length > 2 &&
                          fleetContactName.value.trim().length > 2 &&
                          rawPhone.length === 10 &&
                          emailRegex.test(fleetEmail.value.trim()) &&
                          fleetLocation.value.trim().length > 2

      if (!isFormValid) {
        validateField(fleetCompany, fleetCompany.value.trim().length > 2)
        validateField(fleetContactName, fleetContactName.value.trim().length > 2)
        validateField(fleetPhone, rawPhone.length === 10)
        validateField(fleetEmail, emailRegex.test(fleetEmail.value.trim()))
        validateField(fleetLocation, fleetLocation.value.trim().length > 2)
        showToast('⚠️ PLEASE CORRECT HIGHLIGHTED FIELDS')
        return
      }

      fleetSubmitBtn.disabled = true
      const originalHtml = fleetSubmitBtn.innerHTML
      fleetSubmitBtn.innerHTML = `<span class="btn-spinner"></span> SUBMITTING...`

      const data = {
        timestamp: new Date().toLocaleString(),
        formType: 'Fleet Booking',
        companyName: fleetCompany.value,
        name: fleetContactName.value,
        phone: fleetPhone.value,
        email: fleetEmail.value,
        location: fleetLocation.value,
        fleetSize: selectedFleetSize ? selectedFleetSize.value : '',
        message: document.getElementById('fleetMessage') ? document.getElementById('fleetMessage').value : ''
      }

      submitToGoogleSheets(data, () => {
        fleetSubmitBtn.style.background = '#2fd36b'
        fleetSubmitBtn.style.borderColor = '#2fd36b'
        fleetSubmitBtn.innerHTML = `✓ BOOKED SUCCESS!`

        setTimeout(() => {
          hideModal()
          fleetBookingForm.reset()

          fleetSubmitBtn.disabled = false
          fleetSubmitBtn.style.background = ''
          fleetSubmitBtn.style.borderColor = ''
          fleetSubmitBtn.innerHTML = originalHtml

          const inputs = fleetBookingForm.querySelectorAll('.form-input')
          inputs.forEach(i => i.classList.remove('is-valid', 'is-invalid'))

          fleetBtns.forEach(b => b.classList.remove('active'))
          if (fleetBtns[0]) fleetBtns[0].classList.add('active')
          if (selectedFleetSize) selectedFleetSize.value = '1-10'

          showToast('✓ FLEET BOOKING REGISTERED')
        }, 1000)
      }, () => {
        fleetSubmitBtn.disabled = false
        fleetSubmitBtn.innerHTML = originalHtml
        showToast('❌ SUBMISSION FAILED. PLEASE TRY AGAIN.')
      })
    })
  }

  // ──────────────── INVESTOR FORM CONTROLS ────────────────
  const investCard = document.getElementById('invest-card')
  const investorModal = document.getElementById('investorModal')
  const closeInvestorModal = document.getElementById('closeInvestorModal')
  const investorBookingForm = document.getElementById('investorBookingForm')
  const investorName = document.getElementById('investorName')
  const investorPhone = document.getElementById('investorPhone')
  const investorEmail = document.getElementById('investorEmail')
  const investorLocation = document.getElementById('investorLocation')
  const investorArea = document.getElementById('investorArea')
  const investorSubmitBtn = document.getElementById('investorSubmitBtn')
  const capacityBtns = document.querySelectorAll('#investorModal .budget-btn')
  const selectedCapacity = document.getElementById('selectedCapacity')

  if (investCard && investorModal) {
    investCard.addEventListener('click', () => {
      investorModal.classList.add('active')
      document.body.classList.add('modal-open')
    })

    const hideInvestorModal = () => {
      investorModal.classList.remove('active')
      document.body.classList.remove('modal-open')
    }

    if (closeInvestorModal) closeInvestorModal.addEventListener('click', hideInvestorModal)

    // Close investor modal when clicking on the blurred backdrop overlay
    investorModal.addEventListener('click', (e) => {
      if (e.target === investorModal) hideInvestorModal()
    })

    // Setup phone number formatting
    setupPhoneFormatter(investorPhone)

    // Real-time blur validation
    if (investorName) investorName.addEventListener('blur', () => validateField(investorName, investorName.value.trim().length > 2))
    if (investorEmail) investorEmail.addEventListener('blur', () => validateField(investorEmail, emailRegex.test(investorEmail.value.trim())))
    if (investorLocation) investorLocation.addEventListener('blur', () => validateField(investorLocation, investorLocation.value.trim().length > 2))
    if (investorArea) investorArea.addEventListener('blur', () => validateField(investorArea, investorArea.value.trim().length > 2))

    // Capacity buttons selection toggle
    capacityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        capacityBtns.forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        if (selectedCapacity) selectedCapacity.value = btn.getAttribute('data-value')
      })
    })

    // Submit Investor Form
    if (investorBookingForm && investorSubmitBtn) {
      investorBookingForm.addEventListener('submit', (e) => {
        e.preventDefault()

        const rawPhone = investorPhone.value.replace(/\D/g, '').replace(/^91/, '')
        const isFormValid = investorName.value.trim().length > 2 &&
                            rawPhone.length === 10 &&
                            emailRegex.test(investorEmail.value.trim()) &&
                            investorLocation.value.trim().length > 2 &&
                            investorArea.value.trim().length > 2

        if (!isFormValid) {
          validateField(investorName, investorName.value.trim().length > 2)
          validateField(investorPhone, rawPhone.length === 10)
          validateField(investorEmail, emailRegex.test(investorEmail.value.trim()))
          validateField(investorLocation, investorLocation.value.trim().length > 2)
          validateField(investorArea, investorArea.value.trim().length > 2)
          showToast('⚠️ PLEASE CORRECT HIGHLIGHTED FIELDS')
          return
        }

        investorSubmitBtn.disabled = true
        const originalHtml = investorSubmitBtn.innerHTML
        investorSubmitBtn.innerHTML = `<span class="btn-spinner"></span> SUBMITTING...`

        const data = {
          timestamp: new Date().toLocaleString(),
          formType: 'Investor Enquiry',
          name: investorName.value,
          phone: investorPhone.value,
          email: investorEmail.value,
          location: investorLocation.value,
          areaOfInterest: investorArea.value,
          investmentCapacity: selectedCapacity ? selectedCapacity.value : '',
          message: document.getElementById('investorMessage') ? document.getElementById('investorMessage').value : ''
        }

        submitToGoogleSheets(data, () => {
          investorSubmitBtn.style.background = '#2fd36b'
          investorSubmitBtn.style.borderColor = '#2fd36b'
          investorSubmitBtn.innerHTML = `✓ ENQUIRY SENT SUCCESS!`

          setTimeout(() => {
            hideInvestorModal()
            investorBookingForm.reset()

            investorSubmitBtn.disabled = false
            investorSubmitBtn.style.background = ''
            investorSubmitBtn.style.borderColor = ''
            investorSubmitBtn.innerHTML = originalHtml

            const inputs = investorBookingForm.querySelectorAll('.form-input')
            inputs.forEach(i => i.classList.remove('is-valid', 'is-invalid'))

            capacityBtns.forEach(b => b.classList.remove('active'))
            if (capacityBtns[0]) capacityBtns[0].classList.add('active')
            if (selectedCapacity) selectedCapacity.value = '5L-10L'

            showToast('✓ INVESTOR ENQUIRY REGISTERED')
          }, 1000)
        }, () => {
          investorSubmitBtn.disabled = false
          investorSubmitBtn.innerHTML = originalHtml
          showToast('❌ SUBMISSION FAILED. PLEASE TRY AGAIN.')
        })
      })
    }
  }

  // ── Privacy Policy Modal ──
  const privacyLink = document.getElementById('privacy-link')
  const privacyModal = document.getElementById('privacyModal')
  const closePrivacyModal = document.getElementById('closePrivacyModal')

  if (privacyLink && privacyModal) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault()
      privacyModal.classList.add('active')
      document.body.classList.add('modal-open')
    })

    const hidePrivacyModal = () => {
      privacyModal.classList.remove('active')
      document.body.classList.remove('modal-open')
    }

    if (closePrivacyModal) {
      closePrivacyModal.addEventListener('click', hidePrivacyModal)
    }

    privacyModal.addEventListener('click', (e) => {
      if (e.target === privacyModal) hidePrivacyModal()
    })
  }

  // ── Terms & Conditions Modal ──
  const termsLink = document.getElementById('terms-link')
  const termsModal = document.getElementById('termsModal')
  const closeTermsModal = document.getElementById('closeTermsModal')

  if (termsLink && termsModal) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault()
      termsModal.classList.add('active')
      document.body.classList.add('modal-open')
    })

    const hideTermsModal = () => {
      termsModal.classList.remove('active')
      document.body.classList.remove('modal-open')
    }

    if (closeTermsModal) {
      closeTermsModal.addEventListener('click', hideTermsModal)
    }

    termsModal.addEventListener('click', (e) => {
      if (e.target === termsModal) hideTermsModal()
    })
  }
  // ── Preloader Animation ──
  const circle = document.getElementById('preloaderCircle')
  const preloaderText = document.querySelector('.preloader-text')
  const preloaderLogo = document.querySelector('.preloader-logo')
  const preloader = document.getElementById('preloader')
  
  if (circle) {
    const circumference = 74 * 2 * Math.PI
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`
    circle.style.strokeDashoffset = circumference

    const setProgress = (percent) => {
      const offset = circumference - (percent / 100) * circumference
      circle.style.strokeDashoffset = offset
    }

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.classList.remove('loading')
      }
    })

    // 1. Fade in text & logo
    tl.to(preloaderText, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out'
    })

    // 2. Animate the progress circle from 0% to 100%
    const progressObj = { value: 0 }
    tl.to(progressObj, {
      value: 100,
      duration: 1.8,
      ease: 'power1.inOut',
      onUpdate: () => {
        setProgress(progressObj.value)
      }
    })

    // 3. Zoom in the logo and fade out the preloader overlay to reveal page
    tl.to(circle, {
      opacity: 0,
      scale: 0.8,
      duration: 0.4,
      transformOrigin: '50% 50%',
      ease: 'power2.in'
    })
    
    tl.to(preloaderText, {
      opacity: 0,
      y: -10,
      duration: 0.4,
      ease: 'power2.in'
    }, '<')

    tl.to(preloaderLogo, {
      scale: 25,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.inOut'
    }, '<')

    tl.to(preloader, {
      opacity: 0,
      pointerEvents: 'none',
      display: 'none',
      duration: 0.8,
      ease: 'power2.out'
    }, '<+=0.1')
  }
}
