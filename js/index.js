const crear = (tag, props = {}, styles = {}, padre = document.body) => {
  const el = document.createElement(tag)
  Object.assign(el, props)
  Object.assign(el.style, styles)
  padre.appendChild(el)
  return el
}

const universo = crear('div', { id: 'universo' })
const tamahoNave = ['pequeho', 'mediano', 'grande'][
  Math.floor(Math.random() * 3)
]
let width = 80,
  height = 120
if (tamahoNave === 'mediano') {
  width = 100
  height = 140
} else if (tamahoNave === 'grande') {
  width = 120
  height = 160
}

const nave = crear(
  'img',
  { src: 'img/nave1.png', className: 'nave' },
  { width: `${width}px`, height: `${height}px` }
)

const sndDisparo = crear('audio', { src: 'audio/disparo.mp3' })
const sndImpacto = crear('audio', { src: 'audio/explosion.mp3' })
const sndMotor = crear('audio', { src: 'audio/motor.mp3', loop: true })

let ang = 0,
  vel = 5,
  turbo = 10
let ux = -9500,
  uy = -9500
let avanzando = false,
  asteroides = []
let gameOver = false
let pausado = false
let puntuacion = 0
let vidas = 3
let hitsParaVida = 0
let nivel = 0
let cantidadDisparosPorNivel = 1
let intervaloAsteroides
let intervaloEnemigos
let sonidoActivo = true

const keysPressed = {}

// HUD
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
gameOverDiv.innerHTML = `
  El juego ha terminado<br>
  <button id="reiniciar">Volver a jugar</button>
`
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
mensajeNivel.innerText = '¡Nivel 1 Completado!'
document.body.appendChild(mensajeNivel)

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

const sndCelebracion = crear('audio', { src: 'audio/aplausos.mp3' })

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

document.addEventListener('click', (e) => {
  if (!sonidoActivo) return

  // Reproduce todos los sonidos una sola vez si es la primera vez
  sndDisparo.play().catch(() => {})
  sndImpacto.play().catch(() => {})
  sndMotor.play().catch(() => {})
  sndMotor.pause()
  sndCelebracion.play().catch(() => {})
})

btnSonido.addEventListener('click', () => {
  sonidoActivo = !sonidoActivo
  btnSonido.innerText = sonidoActivo ? '🔊 Sonido' : '🔇 Silencio'

  const audios = [sndDisparo, sndImpacto, sndMotor, sndCelebracion]
  audios.forEach((audio) => {
    if (sonidoActivo) {
      // no hacemos nada, los sonidos se activarán en su contexto al reproducirse
    } else {
      audio.pause()
    }
  })
})

const mostrarMensajeNivel = (nivel) => {
  mensajeNivel.innerText = `¡Felicidades! Nivel ${nivel} alcanzado 🚀`
  mensajeNivel.style.display = 'block'

  setTimeout(() => {
    mensajeNivel.style.display = 'none'
  }, 3000)
}

hud.innerHTML = `
  <div id="contador">
    <img src="img/moneda.gif" alt="Moneda" style="width:60px; vertical-align: middle;">
    <span id="puntos">0</span>
  </div>
  <div id="nivel">Nivel 0</div>
  <div id="vidas">
    <div id="barraVidas">
      <div id="barraRelleno"></div>
    </div>
  </div>
  <button id="btnPausa">⏸ Pausar</button>
`

document.body.appendChild(hud)

// Eventos
document.addEventListener('click', (e) => {
  nivel = 1 // <-- 🔄 Reinicia el nivel
  document.getElementById('nivel').innerText = `Nivel 1`
  if (e.target.id === 'reiniciar') {
    gameOver = false
    pausado = false
    vidas = 3
    puntuacion = 0
    nivel = 1
    document.getElementById('nivel').innerText = `Nivel 1`
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

    moverFondo()
  }

  if (e.target.id === 'btnPausa') {
    pausado = !pausado
    e.target.innerText = pausado ? '▶ Reanudar' : '⏸ Pausar'
    if (!pausado && !gameOver) moverFondo()
  }
})

document.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key))
    e.preventDefault()
  keysPressed[e.key] = true

  if (e.key === 'Enter') {
    vel = turbo
    nave.src = 'img/nave2.png'
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
    vel = 5
    nave.src = 'img/nave1.png'
  }
})

document.addEventListener('mousemove', (e) => {
  if (gameOver || pausado) return
  const centroX = innerWidth / 2
  const centroY = innerHeight / 2
  const dx = e.clientX - centroX
  const dy = e.clientY - centroY
  ang = (Math.atan2(dy, dx) * 180) / Math.PI + 90
  nave.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`
})

const moverFondo = () => {
  if (gameOver || pausado) return

  if (keysPressed['ArrowLeft']) ang -= 5
  if (keysPressed['ArrowRight']) ang += 5
  nave.style.transform = `translate(-50%, -50%) rotate(${ang}deg)`

  if (keysPressed['ArrowUp']) {
    if (!avanzando) {
      avanzando = true
      if (sonidoActivo) {
        sndMotor.currentTime = 0
        sndMotor.play().catch(() => {})
      }
    }
  } else {
    if (avanzando) {
      avanzando = false
      sndMotor.pause()
    }
  }

  if (avanzando) {
    const rad = ((ang - 90) * Math.PI) / 180
    ux = Math.min(Math.max(ux - Math.cos(rad) * vel, -18000), 0)
    uy = Math.min(Math.max(uy - Math.sin(rad) * vel, -18000), 0)
    universo.style.left = `${ux}px`
    universo.style.top = `${uy}px`
  }

  moverAsteroides()
  requestAnimationFrame(moverFondo)
}

const disparar = () => {
  if (gameOver || pausado) return

  for (let i = 0; i < cantidadDisparosPorNivel; i++) {
    setTimeout(() => {
      if (sonidoActivo) {
        sndDisparo.currentTime = 0
        sndDisparo.play().catch(() => {})
      }

      const rad = ((ang - 90) * Math.PI) / 180
      const naveRect = nave.getBoundingClientRect()
      const centroX = naveRect.left + naveRect.width / 2
      const centroY = naveRect.top + naveRect.height / 2
      const px = -ux + centroX
      const py = -uy + centroY

      const dx = Math.cos(rad) * 10
      const dy = Math.sin(rad) * 10

      const bala = crear(
        'img',
        { src: 'img/proyectil.png', className: 'proyectil' },
        {
          position: 'absolute',
          left: `${px}px`,
          top: `${py}px`,
          width: '40px',
          height: '30px',
          zIndex: 9,
          transform: `rotate(${ang}deg)`,
          pointerEvents: 'none',
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
            bala.remove()
            a.remove()
            asteroides = asteroides.filter((x) => x !== a)
            clearInterval(mover)

            puntuacion++
            hitsParaVida++

            document.getElementById('puntos').innerText = puntuacion

            if (hitsParaVida >= 3 && vidas < 3) {
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

const crearAsteroide = () => {
  if (gameOver || pausado) return

  const x = -ux + Math.random() * innerWidth
  const y = -uy - 100

  const tamaño = ['pequeño', 'mediano', 'grande'][Math.floor(Math.random() * 3)]
  let size = 40
  if (tamaño === 'mediano') size = 70
  if (tamaño === 'grande') size = 100

  const a = crear(
    'img',
    {
      src: 'img/asteroide.png',
      className: 'asteroide',
    },
    {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${size}px`,
      height: `${size}px`,
    },
    universo
  )

  asteroides.push(a)
}

const crearEnemigo = () => {
  if (gameOver || pausado) return

  const x = -ux + Math.random() * innerWidth
  const y = -uy - 100

  const enemigo = crear(
    'img',
    {
      src: 'img/enemigo.png',
      className: 'enemigo',
    },
    {
      position: 'absolute',
      width: '80px',
      height: '80px',
      left: `${x}px`,
      top: `${y}px`,
    },
    universo
  )

  asteroides.push(enemigo) // para que también puedan ser destruidos por proyectiles
}

const moverAsteroides = () => {
  for (let a of asteroides) {
    let top = parseFloat(a.style.top) || 0
    top += 2
    a.style.top = `${top}px`

    const r1 = a.getBoundingClientRect()
    const r2 = nave.getBoundingClientRect()

    if (colision(a, nave)) {
      if (vidas <= 1) {
        explotarNave(true)
      } else {
        explotarNave(false)
      }

      if (sonidoActivo) {
        sndImpacto.currentTime = 0
        sndImpacto.play().catch(() => {})
      }

      vidas--
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

const colision = (a, b) => {
  const r1 = a.getBoundingClientRect()
  const r2 = b.getBoundingClientRect()

  // Margen extra de tolerancia
  const margen = 30 // aumenta este valor para que el asteroide llegue más cerca

  return !(
    r1.right < r2.left + margen ||
    r1.left > r2.right - margen ||
    r1.bottom < r2.top + margen ||
    r1.top > r2.bottom - margen
  )
}

const explotarNave = (eliminar = false) => {
  const ex = crear('img', { src: 'img/explosion.gif', className: 'explosion' })
  if (eliminar) nave.remove()
  setTimeout(() => ex.remove(), 1000)
}

const finalizarJuego = () => {
  gameOver = true
  puntuacion = 0
  actualizarBarraVidas()
  document.getElementById('puntos').innerText = 0
  gameOverDiv.style.display = 'block'
}

Object.assign(universo.style, {
  width: '20000px',
  height: '20000px',
  background: 'url("img/fondo-espacio.jpg") repeat',
  position: 'absolute',
  left: '-9500px',
  top: '-9500px',
  zIndex: '0',
})

const actualizarBarraVidas = () => {
  const barra = document.getElementById('barraRelleno')

  if (vidas === 3) {
    barra.style.width = '100%'
    barra.style.backgroundColor = 'green'
  } else if (vidas === 2) {
    barra.style.width = '66%'
    barra.style.backgroundColor = 'yellow'
  } else if (vidas === 1) {
    barra.style.width = '33%'
    barra.style.backgroundColor = 'red'
  } else {
    barra.style.width = '0%'
  }
}

const subirDeNivel = () => {
  clearInterval(intervaloAsteroides)
  clearInterval(intervaloEnemigos)

  const velocidad = Math.max(2000, 7000 - nivel * 1000)

  intervaloAsteroides = setInterval(crearAsteroide, velocidad)
  intervaloEnemigos = setInterval(crearEnemigo, velocidad)

  document.getElementById('nivel').innerText = `Nivel ${nivel}`
  mostrarMensajeNivel(nivel)

  // 🎉 Mostrar gif de celebración
  gifCelebracion.style.display = 'block'
  sndCelebracion.currentTime = 0
  if (sonidoActivo) sndCelebracion.play().catch(() => {})

  setTimeout(() => {
    gifCelebracion.style.display = 'none'
  }, 3000)

  // 🔫 Aumentar ráfaga de disparo cada 10 niveles
  if (nivel % 10 === 0) {
    cantidadDisparosPorNivel++
  }
}

// Inicia el fondo en movimiento
moverFondo()

setInterval(crearAsteroide, 7000)
setInterval(crearEnemigo, 7000)
