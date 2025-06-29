// Utilidad para crear elementos
const crear = (tag, props = {}, styles = {}, padre = document.body) => {
  const el = document.createElement(tag)
  Object.assign(el, props)
  Object.assign(el.style, styles)
  padre.appendChild(el)
  return el
}

// --- Variables globales ---
const universo = crear('div', { id: 'universo' })
const tamahoNave = ['pequeho', 'mediano', 'grande'][
  Math.floor(Math.random() * 3)
]
// Elimina width/height en línea, deja que el CSS controle el tamaño
const nave = crear('img', { src: 'img/nave1.png', className: 'nave' })
const sndDisparo = crear('audio', { src: 'audio/disparo.mp3' })
const sndImpacto = crear('audio', { src: 'audio/explosion.mp3' })
const sndMotor = crear('audio', { src: 'audio/motor.mp3', loop: true })
const sndCelebracion = crear('audio', { src: 'audio/aplausos.mp3' })
sndCelebracion.loop = false // Asegura que no se repita
const sndVida = crear('audio', { src: 'audio/vida.mp3' }) // Sonido para power-up de vida

let ang = 0,
  vel = 10, // velocidad normal más lenta
  turbo = 15 // velocidad turbo más lenta
let ux = -9500,
  uy = -9500
let avanzando = false,
  asteroides = []
let gameOver = false,
  pausado = false
let puntuacion = 0,
  vidas = 10, // ahora 10 vidas
  hitsParaVida = 0,
  nivel = 1
let cantidadDisparosPorNivel = 1
let intervaloAst = null
let intervaloEnem = null
let intervaloDisparoEnemigos = null
let sonidoActivo = true
const keysPressed = {}
let mouseX = innerWidth / 2,
  mouseY = innerHeight / 2,
  mouseMoving = false,
  mouseControlActivo = false
let mouseMoveTimeout

// --- HUD y mensajes ---
const gameOverDiv = crear(
  'div',
  {},
  {
    position: 'fixed',
    top: '40%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    fontSize: '32px',
    display: 'none',
    textAlign: 'center',
    zIndex: '9999',
  }
)
gameOverDiv.innerHTML = `El juego ha terminado<br><button id="reiniciar">Volver a jugar</button>`
document.body.appendChild(gameOverDiv)

const hud = crear(
  'div',
  { id: 'hud' },
  {
    position: 'fixed',
    top: '10px',
    left: '10px',
    color: 'white',
    fontSize: '20px',
    zIndex: '10000',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  }
)
hud.innerHTML = `
  <div id="contador"><img src="img/moneda.gif" alt="Moneda" style="width:60px; vertical-align: middle;"><span id="puntos">1</span></div>
  <div id="nivel">Nivel 1</div>
  <div id="vidas"><div id="barraVidas"><div id="barraRelleno"></div></div></div>
  <button id="btnPausa">⏸ Pausar</button>
`
document.body.appendChild(hud)

const mensajeNivel = crear(
  'div',
  { id: 'mensajeNivel' },
  {
    position: 'fixed',
    top: '30%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '40px',
    color: '#00ff99',
    zIndex: 9999,
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'none',
    textAlign: 'center',
    fontWeight: 'bold',
  }
)
const gifCelebracion = crear(
  'img',
  { src: 'img/felicidades.gif' },
  {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px',
    height: '300px',
    display: 'none',
    zIndex: 9999,
    pointerEvents: 'none',
  }
)
document.body.appendChild(mensajeNivel)

const btnSonido = crear(
  'button',
  { id: 'btnSonido', innerText: '🔊 Sonido' },
  {
    position: 'fixed',
    top: '10px',
    right: '10px',
    padding: '10px 15px',
    fontSize: '16px',
    zIndex: '10000',
    cursor: 'pointer',
    backgroundColor: '#111',
    color: '#fff',
    border: '2px solid #0f0',
    borderRadius: '8px',
  }
)

// --- Utilidades ---
function esDispositivoTactil() {
  return (
    ('ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0) &&
    window.innerWidth <= 1024
  )
}
function estiloBtn() {
  return {
    fontSize: '48px',
    padding: '30px',
    borderRadius: '20px',
    border: '4px solid lime',
    background: '#111',
    color: '#fff',
    minWidth: '110px',
    minHeight: '110px',
    boxShadow: '0 0 20px 5px #0f0a, 0 2px 8px #000',
    margin: '0 10px',
    touchAction: 'none',
    outline: 'none',
    fontWeight: 'bold',
  }
}
function mostrarMensajeNivel(nivel) {
  mensajeNivel.innerText = `¡Felicidades! Nivel ${nivel} alcanzado 🚀`
  mensajeNivel.style.display = 'block'
  setTimeout(() => {
    mensajeNivel.style.display = 'none'
  }, 3000)
}
function actualizarBarraVidas() {
  const barra = document.getElementById('barraRelleno')
  const colores = [
    '#ff0000', // 1 vida - rojo
    '#ff4000', // 2
    '#ff8000', // 3
    '#ffaa00', // 4
    '#ffff00', // 5 - amarillo
    '#bfff00', // 6
    '#80ff00', // 7
    '#40ff00', // 8
    '#00ff00', // 9
    '#00ff80', // 10 - verde
  ]
  if (vidas > 0) {
    barra.style.width = vidas * 10 + '%'
    barra.style.backgroundColor = colores[vidas - 1]
  } else {
    barra.style.width = '0%'
  }
}

// --- Controles táctiles ---
let controlesTouch, btnIzq, btnDer, btnUp, btnDisparo
if (esDispositivoTactil()) {
  controlesTouch = crear(
    'div',
    {},
    {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '15px',
      zIndex: 10000,
    }
  )
  document.body.appendChild(controlesTouch)
  btnIzq = crear('button', { innerText: '⬅️' }, estiloBtn(), controlesTouch)
  btnDer = crear('button', { innerText: '➡️' }, estiloBtn(), controlesTouch)
  btnUp = crear('button', { innerText: '⬆️' }, estiloBtn(), controlesTouch)
  btnDisparo = crear('button', { innerText: '🔫' }, estiloBtn(), controlesTouch)
  btnIzq.addEventListener('touchstart', () => (keysPressed['ArrowLeft'] = true))
  btnIzq.addEventListener('touchend', () => delete keysPressed['ArrowLeft'])
  btnDer.addEventListener(
    'touchstart',
    () => (keysPressed['ArrowRight'] = true)
  )
  btnDer.addEventListener('touchend', () => delete keysPressed['ArrowRight'])
  btnUp.addEventListener('touchstart', () => {
    keysPressed['ArrowUp'] = true
    if (!avanzando) {
      avanzando = true
      if (sonidoActivo) {
        sndMotor.currentTime = 0
        sndMotor.play().catch(() => {})
      }
    }
  })
  btnUp.addEventListener('touchend', () => {
    delete keysPressed['ArrowUp']
    avanzando = false
    sndMotor.pause()
  })
  btnDisparo.addEventListener('touchstart', disparar)
}

function crearParticulas(x, y, color = '#fff', cantidad = 12) {
  for (let i = 0; i < cantidad; i++) {
    const p = crear(
      'div',
      {},
      {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: color,
        opacity: 0.8,
        zIndex: 9999,
        pointerEvents: 'none',
        transition: 'all 0.7s linear',
      },
      universo
    )
    const ang = Math.random() * 2 * Math.PI
    const dist = 40 + Math.random() * 30
    setTimeout(() => {
      p.style.left = `${x + Math.cos(ang) * dist}px`
      p.style.top = `${y + Math.sin(ang) * dist}px`
      p.style.opacity = 0
    }, 10)
    setTimeout(() => p.remove(), 700)
  }
} // --- Controles de mouse y teclado para escritorio ---
if (!esDispositivoTactil()) {
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) disparar()
    if (e.button === 2) {
      vel = turbo
      nave.src = 'img/nave2.png'
      avanzando = true
      keysPressed['ArrowUp'] = true
      if (sonidoActivo) {
        sndMotor.currentTime = 0
        sndMotor.play().catch(() => {})
      }
    }
  })
  window.addEventListener('mouseup', (e) => {
    if (e.button === 2) {
      vel = 10 // velocidad normal restaurada
      nave.src = 'img/nave1.png'
      avanzando = false
      delete keysPressed['ArrowUp']
      sndMotor.pause()
    }
  })
  window.addEventListener('contextmenu', (e) => e.preventDefault())
}

document.addEventListener('keyup', (e) => {
  delete keysPressed[e.key]
  if (e.key === 'ArrowUp') {
    avanzando = false
    sndMotor.pause()
  }
  if (e.key === 'Enter') {
    vel = 10 // velocidad normal restaurada
    nave.src = 'img/nave1.png'
  }
})

// --- Eventos de teclado ---
document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key))
    e.preventDefault()
  keysPressed[e.key] = true
  mouseControlActivo = false
  if (e.key === 'ArrowUp') {
    avanzando = true
    if (sonidoActivo) {
      sndMotor.currentTime = 0
      sndMotor.play().catch(() => {})
    }
  }
  if (e.key === 'Enter') {
    vel = turbo
    nave.src = 'img/nave2.png'
    avanzando = true
    if (sonidoActivo) {
      sndMotor.currentTime = 0
      sndMotor.play().catch(() => {})
    }
  }
  if (e.key === ' ') disparar()
})
document.addEventListener('keyup', (e) => {
  delete keysPressed[e.key]
  if (e.key === 'ArrowUp') {
    avanzando = false
    sndMotor.pause()
  }
  if (e.key === 'Enter') {
    vel = 10 // velocidad normal restaurada
    nave.src = 'img/nave1.png'
  }
})

// --- Mouse mueve nave (solo si no hay teclas) ---
document.addEventListener('mousemove', (e) => {
  if (gameOver || pausado) return
  const centroX = innerWidth / 2,
    centroY = innerHeight / 2
  const dx = e.clientX - centroX,
    dy = e.clientY - centroY
  ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  nave.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`
  if (
    !keysPressed['ArrowUp'] &&
    !keysPressed['ArrowLeft'] &&
    !keysPressed['ArrowRight']
  ) {
    mouseX = e.clientX
    mouseY = e.clientY
    mouseControlActivo = true
    mouseMoving = true
    keysPressed['ArrowUp'] = true
    avanzando = true
    if (sonidoActivo) {
      sndMotor.currentTime = 0
      sndMotor.play().catch(() => {})
    }
    clearTimeout(mouseMoveTimeout)
    mouseMoveTimeout = setTimeout(() => {
      mouseMoving = false
      avanzando = false
      delete keysPressed['ArrowUp']
      sndMotor.pause()
      mouseControlActivo = false
    }, 200)
  }
})

// --- Lógica principal ---
function moverFondo() {
  if (gameOver || pausado) return
  const centroX = innerWidth / 2,
    centroY = innerHeight / 2
  let dx = 0,
    dy = 0
  if (mouseControlActivo) {
    dx = mouseX - centroX
    dy = mouseY - centroY
    ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  }
  nave.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`
  if (keysPressed['ArrowLeft']) ang -= 5
  if (keysPressed['ArrowRight']) ang += 5
  // El avance debe depender de cualquier método de control
  if (
    avanzando ||
    mouseMoving ||
    keysPressed['ArrowUp'] ||
    mouseControlActivo
  ) {
    if (!avanzando) {
      avanzando = true
      if (sonidoActivo) {
        sndMotor.currentTime = 0
        sndMotor.play().catch(() => {})
      }
    }
    const rad = ((ang - 90) * Math.PI) / 180
    ux = Math.min(Math.max(ux - Math.cos(rad) * vel, -18000), 0)
    uy = Math.min(Math.max(uy - Math.sin(rad) * vel, -18000), 0)
    universo.style.left = `${ux}px`
    universo.style.top = `${uy}px`
  } else {
    if (avanzando) {
      avanzando = false
      sndMotor.pause()
    }
  }
  moverAsteroides()
  requestAnimationFrame(moverFondo)
}

function disparar() {
  if (gameOver || pausado) return
  for (let i = 0; i < cantidadDisparosPorNivel; i++) {
    setTimeout(() => {
      if (sonidoActivo) {
        sndDisparo.currentTime = 0
        sndDisparo.play().catch(() => {})
      }
      const rad = ((ang - 90) * Math.PI) / 180
      const naveRect = nave.getBoundingClientRect(),
        universoRect = universo.getBoundingClientRect()
      const px = naveRect.left + naveRect.width / 2 - universoRect.left
      const py = naveRect.top + naveRect.height / 2 - universoRect.top
      const dx = Math.cos(rad) * 20,
        dy = Math.sin(rad) * 20
      // Elimina width/height en línea, deja que el CSS controle el tamaño
      const bala = crear(
        'img',
        { src: 'img/proyectil.png', className: 'proyectil' },
        {
          position: 'absolute',
          left: `${px}px`,
          top: `${py}px`,
          zIndex: 999,
          transform: `rotate(${ang}deg)`,
        },
        universo
      )
      let bx = px,
        by = py
      const mover = setInterval(() => {
        bx += dx
        by += dy
        bala.style.left = `${bx}px`
        bala.style.top = `${by}px`
        for (let a of asteroides) {
          if (colision(bala, a)) {
            sndImpacto.currentTime = 0
            // Mostrar explosión en la posición del objeto destruido
            const ax = parseFloat(a.style.left) || 0
            const ay = parseFloat(a.style.top) || 0
            const ex = crear(
              'img',
              { src: 'img/explosion.gif', className: 'explosion' },
              {
                position: 'absolute',
                left: `${ax}px`,
                top: `${ay}px`,
                width: a.width ? `${a.width}px` : '',
                height: a.height ? `${a.height}px` : '',
                zIndex: 20,
                pointerEvents: 'none',
                transform: '',
              },
              universo
            )
            setTimeout(() => ex.remove(), 1000)
            bala.remove()
            a.remove()
            asteroides = asteroides.filter((x) => x !== a)
            clearInterval(mover)
            puntuacion++
            hitsParaVida++
            document.getElementById('puntos').innerText = puntuacion
            if (hitsParaVida >= 3 && vidas < 10) {
              vidas++
              hitsParaVida = 0
              actualizarBarraVidas()
            }
            if (puntuacion % 10 === 0) {
              nivel++
              vel += 1
              subirDeNivel()
            }
          }
        }
        if (bx < 0 || bx > 20000 || by < 0 || by > 20000) {
          clearInterval(mover)
          bala.remove()
        }
      }, 20)
    }, i * 150)
  }
}

function crearAsteroide() {
  if (gameOver || pausado) return
  const x = -ux + Math.random() * innerWidth,
    y = -uy - 100
  const tamanos = ['asteroide-pequeno', 'asteroide-mediano', 'asteroide-grande']
  const claseTamano = tamanos[Math.floor(Math.random() * tamanos.length)]
  // Elimina size en línea, deja que el CSS controle el tamaño
  const a = crear(
    'img',
    { src: 'img/asteroide.png', className: `asteroide ${claseTamano}` },
    { position: 'absolute', left: `${x}px`, top: `${y}px` },
    universo
  )
  asteroides.push(a)
}
function crearEnemigo() {
  if (gameOver || pausado) return
  const margen = 100
  const radioExclusion = 250 // radio de exclusión alrededor de la nave
  let x, y
  let cx = -ux + innerWidth / 2
  let cy = -uy + innerHeight / 2
  let intentos = 0
  do {
    x = -ux + margen + Math.random() * (innerWidth - 2 * margen)
    y = -uy + margen + Math.random() * (innerHeight - 2 * margen)
    intentos++
    // Si no encuentra lugar tras varios intentos, lo pone en el borde superior
    if (intentos > 10) {
      x = -ux + margen + Math.random() * (innerWidth - 2 * margen)
      y = -uy + margen
      break
    }
  } while (Math.hypot(x - cx, y - cy) < radioExclusion)
  const tamanos = ['enemigo-pequeno', 'enemigo-mediano', 'enemigo-grande']
  const claseTamano = tamanos[Math.floor(Math.random() * tamanos.length)]
  // Elimina width/height en línea, deja que el CSS controle el tamaño
  const enemigo = crear(
    'img',
    { src: 'img/enemigo.png', className: `enemigo ${claseTamano}` },
    { position: 'absolute', left: `${x}px`, top: `${y}px`, zIndex: 10 },
    universo
  )
  asteroides.push(enemigo)
}
function moverAsteroides() {
  for (let a of asteroides) {
    let top = parseFloat(a.style.top) || 0
    top += 2
    a.style.top = `${top}px`
    if (colision(a, nave)) {
      if (vidas <= 1) explotarNave(true)
      else explotarNave(false)
      if (sonidoActivo) {
        sndImpacto.currentTime = 0
        sndImpacto.play().catch(() => {})
      }
      vidas--
      if (vidas < 0) vidas = 0
      actualizarBarraVidas()
      if (vidas <= 0) {
        finalizarJuego()
        return
      }
      a.remove()
      asteroides = asteroides.filter((x) => x !== a)
    }
    if (top > 20000) {
      a.remove()
      asteroides = asteroides.filter((x) => x !== a)
    }
  }
}
function colision(a, b) {
  const r1 = a.getBoundingClientRect(),
    r2 = b.getBoundingClientRect(),
    margen = 30
  return !(
    r1.right < r2.left + margen ||
    r1.left > r2.right - margen ||
    r1.bottom < r2.top + margen ||
    r1.top > r2.bottom - margen
  )
}
function explotarNave(eliminar = false) {
  const ex = crear('img', { src: 'img/explosion.gif', className: 'explosion' })
  if (eliminar) nave.remove()
  setTimeout(() => ex.remove(), 1000)
}
function finalizarJuego() {
  gameOver = true
  puntuacion = 0
  actualizarBarraVidas()
  document.getElementById('puntos').innerText = 0
  gameOverDiv.style.display = 'block'
}

// --- Lógica de niveles y dificultad ---
function subirDeNivel() {
  document.getElementById('nivel').innerText = `Nivel ${nivel}`
  mostrarMensajeNivel(nivel)
  gifCelebracion.style.display = 'block'
  sndCelebracion.currentTime = 0
  if (sonidoActivo) sndCelebracion.play().catch(() => {})
  setTimeout(() => {
    gifCelebracion.style.display = 'none'
    // Refuerzo: detener el audio de aplausos siempre tras 3s
    sndCelebracion.pause()
    sndCelebracion.currentTime = 0
  }, 3000)
  iniciarNivel(nivel)
  if (nivel % 10 === 0) cantidadDisparosPorNivel++
}

function iniciarNivel(nivel) {
  if (intervaloAst) clearInterval(intervaloAst)
  if (intervaloEnem) clearInterval(intervaloEnem)
  if (intervaloDisparoEnemigos) clearInterval(intervaloDisparoEnemigos)
  universo.style.backgroundImage = 'url("img/fondo-espacio.jpg")'
  universo.style.backgroundSize = 'repeat'
  universo.style.backgroundRepeat = 'repeat'
  universo.style.backgroundPosition = 'left top'
  universo.classList.remove('fondo-ciudad')
  // Ajusta dificultad según nivel
  let freqAst = 3000
  let freqEnem = null
  if (nivel >= 2) {
    freqAst = 2000
    freqEnem = 4000 // menos enemigos
  }
  if (nivel >= 5) {
    freqAst = 1500
    freqEnem = 3000 // menos enemigos
  }
  intervaloAst = setInterval(crearAsteroide, freqAst)
  if (nivel >= 2) {
    intervaloEnem = setInterval(crearEnemigo, freqEnem)
    intervaloDisparoEnemigos = setInterval(dispararEnemigos, 1200)
  } else {
    intervaloEnem = null
    intervaloDisparoEnemigos = null
  }
}

// --- Reinicio de juego robusto ---
document.addEventListener('click', (e) => {
  if (e.target.id === 'reiniciar') {
    gameOver = false
    pausado = false
    vidas = 10
    puntuacion = 0
    nivel = 0
    cantidadDisparosPorNivel = 1
    document.getElementById('nivel').innerText = `Nivel 0`
    ux = -9500
    uy = -9500
    ang = 0
    universo.style.left = `${ux}px`
    universo.style.top = `${uy}px`
    nave.src = 'img/nave1.png'
    nave.style.display = 'block'
    document.body.appendChild(nave)
    document.getElementById('puntos').innerText = puntuacion
    actualizarBarraVidas()
    gameOverDiv.style.display = 'none'
    for (let a of asteroides) a.remove()
    asteroides = []
    for (let obj of proyectilesEnemigos) {
      if (obj.bala) obj.bala.remove()
      if (obj.intervalo) clearInterval(obj.intervalo)
    }
    proyectilesEnemigos = []
    if (intervaloAst) clearInterval(intervaloAst)
    if (intervaloEnem) clearInterval(intervaloEnem)
    if (intervaloDisparoEnemigos) clearInterval(intervaloDisparoEnemigos)
    iniciarNivel(0)
    moverFondo()
    return
  }
  if (e.target.id === 'btnPausa') {
    pausado = !pausado
    e.target.innerText = pausado ? '▶ Reanudar' : '⏸ Pausar'
    if (pausado) {
      avanzando = false
      sndMotor.pause()
      delete keysPressed['ArrowUp']
      pausarProyectilesEnemigos()
    } else if (!gameOver) {
      moverFondo()
      reanudarProyectilesEnemigos()
    }
    return
  }
  if (e.target.id === 'btnSonido') {
    sonidoActivo = !sonidoActivo
    btnSonido.innerText = sonidoActivo ? '🔊 Sonido' : '🔇 Silencio'
    if (!sonidoActivo) {
      ;[sndDisparo, sndImpacto, sndMotor, sndCelebracion].forEach((audio) =>
        audio.pause()
      )
    }
    return
  }
  if (!sonidoActivo) return
  sndDisparo.play().catch(() => {})
  sndImpacto.play().catch(() => {})
  sndMotor.play().catch(() => {})
  sndMotor.pause()
  // sndCelebracion.play().catch(() => {}) // Eliminado: solo debe sonar al pasar de nivel
})

// --- Power-up de vida extra ---
function crearPowerUpVida() {
  if (gameOver || pausado) return
  // Posición aleatoria dentro de la pantalla visible
  const x = -ux + 100 + Math.random() * (innerWidth - 200)
  const y = -uy + 100 + Math.random() * (innerHeight - 200)
  const powerUp = crear(
    'img',
    { src: 'img/vida.gif', className: 'powerup-vida' },
    {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: '100px', // más grande
      height: '100px',
      zIndex: 20,
      pointerEvents: 'none',
    },
    universo
  )
  // Desaparece tras 10 segundos si no se recoge
  const timeout = setTimeout(() => {
    powerUp.remove()
  }, 10000)
  // Chequeo de colisión con la nave
  function checkColisionPowerUp() {
    if (!document.body.contains(powerUp)) return
    if (colision(powerUp, nave)) {
      if (vidas < 10) {
        vidas++
        actualizarBarraVidas()
      }
      if (sonidoActivo) {
        sndVida.currentTime = 0
        sndVida.play().catch(() => {})
      }
      powerUp.remove()
      clearTimeout(timeout)
    } else {
      requestAnimationFrame(checkColisionPowerUp)
    }
  }
  requestAnimationFrame(checkColisionPowerUp)
}
// Aparece cada 25 segundos
setInterval(crearPowerUpVida, 25000)

// --- CSS sugerido para el power-up (agregar en tu style.css) ---
// .powerup-vida { animation: parpadeo 1s infinite alternate; }
// @keyframes parpadeo { 0% { opacity: 1; } 100% { opacity: 0.5; } }

// --- Estilo universo ---
Object.assign(universo.style, {
  width: '20000px',
  height: '20000px',
  background: 'url("img/fondo-espacio.jpg") repeat',
  position: 'absolute',
  left: '-9500px',
  top: '-9500px',
  zIndex: '0',
})

// --- Iniciar juego ---
iniciarNivel(0)
moverFondo()

// --- Proyectiles enemigos ---
let proyectilesEnemigos = []
function dispararEnemigos() {
  if (gameOver || pausado) return
  const enemigos = Array.from(universo.querySelectorAll('.enemigo'))
  enemigos.forEach((enemigo) => {
    const naveRect = nave.getBoundingClientRect()
    const enemigoRect = enemigo.getBoundingClientRect()
    const universoRect = universo.getBoundingClientRect()
    const ex = enemigoRect.left + enemigoRect.width / 2 - universoRect.left
    const ey = enemigoRect.top + enemigoRect.height / 2 - universoRect.top
    const nx = naveRect.left + naveRect.width / 2 - universoRect.left
    const ny = naveRect.top + naveRect.height / 2 - universoRect.top
    const dx = nx - ex
    const dy = ny - ey
    const dist = Math.hypot(dx, dy)
    const velocidad = 3 // más lento
    const vx = (dx / dist) * velocidad
    const vy = (dy / dist) * velocidad
    // Ángulo para que la punta apunte a la nave (igual que la nave)
    const angulo = (Math.atan2(dy, dx) * 180) / Math.PI + 90
    const bala = crear(
      'img',
      { src: 'img/proyectil.png', className: 'proyectil enemigo-proyectil' },
      {
        position: 'absolute',
        left: `${ex}px`,
        top: `${ey}px`,
        zIndex: 999,
        filter: 'hue-rotate(180deg)',
        transform: `rotate(${angulo}deg)`,
      },
      universo
    )
    let bx = ex,
      by = ey
    let recorrido = 0
    const maxDistancia = 500 // desaparecen antes
    function moverBala() {
      if (pausado || gameOver) return
      bx += vx
      by += vy
      recorrido += velocidad
      bala.style.left = `${bx}px`
      bala.style.top = `${by}px`
      if (colision(bala, nave)) {
        if (vidas > 0) {
          vidas--
          actualizarBarraVidas()
        }
        if (sonidoActivo) {
          sndImpacto.currentTime = 0
          sndImpacto.play().catch(() => {})
        }
        bala.remove()
        clearInterval(intervalo)
        if (vidas <= 0) finalizarJuego()
        return
      }
      if (
        bx < 0 ||
        bx > 20000 ||
        by < 0 ||
        by > 20000 ||
        recorrido > maxDistancia
      ) {
        bala.remove()
        clearInterval(intervalo)
      }
    }
    const intervalo = setInterval(moverBala, 20)
    proyectilesEnemigos.push({
      bala,
      intervalo,
      moverBala,
      bx,
      by,
      vx,
      vy,
      recorrido,
      maxDistancia,
    })
  })
}

function pausarProyectilesEnemigos() {
  for (let obj of proyectilesEnemigos) {
    if (obj.intervalo) clearInterval(obj.intervalo)
    obj.intervalo = null
  }
}
function reanudarProyectilesEnemigos() {
  for (let obj of proyectilesEnemigos) {
    if (!obj.intervalo && obj.bala && document.body.contains(obj.bala)) {
      obj.intervalo = setInterval(() => {
        if (pausado || gameOver) return
        obj.bx += obj.vx
        obj.by += obj.vy
        obj.recorrido += 3 // igual que velocidad
        obj.bala.style.left = `${obj.bx}px`
        obj.bala.style.top = `${obj.by}px`
        if (colision(obj.bala, nave)) {
          if (vidas > 0) {
            vidas--
            actualizarBarraVidas()
          }
          if (sonidoActivo) {
            sndImpacto.currentTime = 0
            sndImpacto.play().catch(() => {})
          }
          obj.bala.remove()
          clearInterval(obj.intervalo)
          obj.intervalo = null
          if (vidas <= 0) finalizarJuego()
          return
        }
        if (
          obj.bx < 0 ||
          obj.bx > 20000 ||
          obj.by < 0 ||
          obj.by > 20000 ||
          obj.recorrido > obj.maxDistancia
        ) {
          obj.bala.remove()
          clearInterval(obj.intervalo)
          obj.intervalo = null
        }
      }, 20)
    }
  }
}

// --- Registro de usuario al inicio ---
let nombreUsuario = localStorage.getItem('nombreUsuario') || ''

function mostrarPopupRegistro() {
  const popup = crear(
    'div',
    {},
    {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.85)',
      zIndex: 20000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  )
  const caja = crear(
    'div',
    {},
    {
      background: '#222',
      padding: '40px 30px',
      borderRadius: '18px',
      boxShadow: '0 0 30px #0f0',
      textAlign: 'center',
      color: '#fff',
      minWidth: '320px',
    },
    popup
  )
  caja.innerHTML = `
    <h2>¡Bienvenido/a!</h2>
    <p>Por favor, ingresa tu nombre para comenzar:</p>
    <input id="inputNombreUsuario" type="text" maxlength="20" style="font-size:1.2em;padding:8px;border-radius:6px;border:1px solid #0f0;width:90%;margin-bottom:18px;" autofocus>
    <br>
    <button id="btnRegistroUsuario" style="font-size:1.1em;padding:10px 30px;border-radius:8px;background:#0f0;color:#222;border:none;font-weight:bold;cursor:pointer;">Comenzar</button>
  `
  document.body.appendChild(popup)
  document.getElementById('btnRegistroUsuario').onclick = () => {
    const nombre = document.getElementById('inputNombreUsuario').value.trim()
    if (nombre.length < 2) {
      alert('Por favor, ingresa un nombre válido.')
      return
    }
    nombreUsuario = nombre
    localStorage.setItem('nombreUsuario', nombreUsuario)
    popup.remove()
    mostrarNombreUsuario()
  }
  document
    .getElementById('inputNombreUsuario')
    .addEventListener('keydown', (e) => {
      if (e.key === 'Enter')
        document.getElementById('btnRegistroUsuario').click()
    })
}

// Mostrar nombre en la parte superior derecha
function mostrarNombreUsuario() {
  let divNombre = document.getElementById('nombreUsuario')
  if (!divNombre) {
    divNombre = crear(
      'div',
      { id: 'nombreUsuario' },
      {
        position: 'fixed',
        top: '10px',
        right: '140px',
        color: '#0f0',
        fontSize: '20px',
        zIndex: '10001',
        fontWeight: 'bold',
        background: 'rgba(0,0,0,0.7)',
        padding: '8px 18px',
        borderRadius: '10px',
        letterSpacing: '1px',
        pointerEvents: 'none',
      }
    )
    document.body.appendChild(divNombre)
  }
  divNombre.innerText = `👤 ${nombreUsuario}`
}

// Personaliza los avisos emergentes con el nombre del usuario
function mensajePersonalizado(texto) {
  const div = crear(
    'div',
    {},
    {
      position: 'fixed',
      top: '30%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '32px',
      color: '#00ff99',
      zIndex: 20001,
      padding: '30px',
      borderRadius: '14px',
      backgroundColor: 'rgba(0,0,0,0.9)',
      textAlign: 'center',
      fontWeight: 'bold',
      boxShadow: '0 0 30px #0f0',
    }
  )
  div.innerHTML = `<span style="font-size:1.2em;">${
    nombreUsuario ? nombreUsuario + ', ' : ''
  }${texto}</span>`
  document.body.appendChild(div)
  setTimeout(() => div.remove(), 3000)
}

// Llama a la ventana de registro si no hay nombre guardado
if (!nombreUsuario) {
  setTimeout(mostrarPopupRegistro, 300)
} else {
  mostrarNombreUsuario()
}

// Ejemplo de uso en avisos emergentes:
// mensajePersonalizado('¡Felicidades! Nivel superado 🚀')

// Puedes reemplazar los avisos de nivel y game over así:
// mensajePersonalizado('¡El juego ha terminado!');
// mensajePersonalizado('¡Felicidades! Nivel ' + nivel + ' alcanzado 🚀');
