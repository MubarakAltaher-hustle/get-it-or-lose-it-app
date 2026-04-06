import './style.css'

type QuizOption = { id: string; label: string }
type QuizQuestion = { id: string; prompt: string; options: QuizOption[] }

const QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'When choosing a restaurant, what matters most to you?',
    options: [
      { id: 'taste', label: 'Taste / food quality' },
      { id: 'price', label: 'Price / value' },
      { id: 'vibes', label: 'Vibes / atmosphere' },
      { id: 'speed', label: 'Speed / convenience' },
    ],
  },
  {
    id: 'q2',
    prompt: 'How often do you *want* to eat out in a typical week?',
    options: [
      { id: '0', label: '0 times' },
      { id: '1', label: '1–2 times' },
      { id: '2', label: '3–4 times' },
      { id: '3', label: '5+ times' },
    ],
  },
  {
    id: 'q3',
    prompt: 'What usually pushes you to eat outside instead of cooking?',
    options: [
      { id: 'tired', label: 'Too tired to cook' },
      { id: 'social', label: 'Seeing friends / social plan' },
      { id: 'craving', label: 'A specific craving' },
      { id: 'treat', label: 'It feels like a treat' },
    ],
  },
  {
    id: 'q4',
    prompt: 'Pick the “restaurant moment” you enjoy most.',
    options: [
      { id: 'starter', label: 'The first bite' },
      { id: 'service', label: 'Being served / no dishes' },
      { id: 'dessert', label: 'Dessert' },
      { id: 'peoplewatch', label: 'People-watching' },
    ],
  },
  {
    id: 'q5',
    prompt: 'If the bill is higher than expected, what do you do?',
    options: [
      { id: 'shrug', label: 'Shrug — it happens' },
      { id: 'note', label: 'Mentally note it for next time' },
      { id: 'regret', label: 'Instant regret' },
      { id: 'split', label: 'Try to split / optimize' },
    ],
  },
]

type Screen =
  | { kind: 'intro' }
  | { kind: 'quiz'; index: number; answers: Record<string, string> }
  | { kind: 'final'; answers: Record<string, string> }
  | { kind: 'done'; choice: 'cook' | 'eat'; answers: Record<string, string> }

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app element')

let screen: Screen = { kind: 'intro' }
let movingButtonStop: (() => void) | null = null

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function render() {
  movingButtonStop?.()
  movingButtonStop = null
  app.innerHTML = ''

  const shell = document.createElement('div')
  shell.className = 'shell'

  const card = document.createElement('div')
  card.className = 'card'
  shell.appendChild(card)

  app.appendChild(shell)

  if (screen.kind === 'intro') {
    card.innerHTML = `
      <div class="kicker">A tiny social experiment</div>
      <h1>Eat outside quiz</h1>
      <p class="subtle">Answer 5 quick questions. Then you’ll have to make a choice.</p>
      <div class="actions">
        <button class="btn primary" type="button" data-action="start">Start</button>
      </div>
    `
    card.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', () => {
      screen = { kind: 'quiz', index: 0, answers: {} }
      render()
    })
    return
  }

  if (screen.kind === 'quiz') {
    const q = QUESTIONS[screen.index]
    const progress = `${screen.index + 1} / ${QUESTIONS.length}`
    const selected = screen.answers[q.id] ?? ''

    const optionsHtml = q.options
      .map(
        (o) => `
        <label class="option">
          <input type="radio" name="${q.id}" value="${o.id}" ${selected === o.id ? 'checked' : ''} />
          <span>${o.label}</span>
        </label>
      `,
      )
      .join('')

    card.innerHTML = `
      <div class="toprow">
        <div class="kicker">Question ${progress}</div>
        <button class="btn ghost" type="button" data-action="restart">Restart</button>
      </div>
      <h2>${q.prompt}</h2>
      <div class="options" role="radiogroup" aria-label="Answer options">
        ${optionsHtml}
      </div>
      <div class="actions">
        <button class="btn" type="button" data-action="back" ${screen.index === 0 ? 'disabled' : ''}>Back</button>
        <button class="btn primary" type="button" data-action="next" ${selected ? '' : 'disabled'}>
          ${screen.index === QUESTIONS.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    `

    card.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', () => {
      screen = { kind: 'intro' }
      render()
    })

    card.querySelector<HTMLButtonElement>('[data-action="back"]')?.addEventListener('click', () => {
      if (screen.kind !== 'quiz') return
      screen = { ...screen, index: Math.max(0, screen.index - 1) }
      render()
    })

    card.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener('click', () => {
      if (screen.kind !== 'quiz') return
      if (screen.index >= QUESTIONS.length - 1) {
        screen = { kind: 'final', answers: screen.answers }
      } else {
        screen = { ...screen, index: screen.index + 1 }
      }
      render()
    })

    card.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (screen.kind !== 'quiz') return
        const nextAnswers = { ...screen.answers, [q.id]: input.value }
        screen = { ...screen, answers: nextAnswers }
        render()
      })
    })

    return
  }

  if (screen.kind === 'final') {
    // Build final screen layout. The moving button is positioned relative to the viewport
    // so it can circle the edges of the user's screen.
    card.innerHTML = `
      <div class="kicker">Last screen</div>
      <h2>Choose your destiny</h2>
      <p class="subtle">One button is polite. The other makes you work for it.</p>

      <div class="final-area">
        <button class="btn primary" type="button" data-choice="eat">Eat outside</button>
        <div class="hint">Or try to catch the one that says “cook at home”.</div>
      </div>
    `

    const moving = document.createElement('button')
    moving.type = 'button'
    moving.className = 'btn cook moving'
    moving.textContent = 'Cook at home'
    moving.setAttribute('data-choice', 'cook')
    app.appendChild(moving)

    const pick = (choice: 'cook' | 'eat') => {
      if (screen.kind !== 'final') return
      screen = { kind: 'done', choice, answers: screen.answers }
      render()
    }

    card.querySelector<HTMLButtonElement>('[data-choice="eat"]')?.addEventListener('click', () => pick('eat'))
    moving.addEventListener('click', () => pick('cook'))

    movingButtonStop = startCookAtHomeOrbit(moving)
    return
  }

  if (screen.kind === 'done') {
    card.innerHTML = `
      <div class="kicker">Result</div>
      <h2>You chose: <span class="choice">${screen.choice === 'cook' ? 'Cook at home' : 'Eat outside'}</span></h2>
      <p class="subtle">Refresh if you want to try again, or hit restart below.</p>
      <div class="actions">
        <button class="btn" type="button" data-action="restart">Restart</button>
      </div>
    `
    card.querySelector<HTMLButtonElement>('[data-action="restart"]')?.addEventListener('click', () => {
      screen = { kind: 'intro' }
      render()
    })
  }
}

function startCookAtHomeOrbit(btn: HTMLButtonElement) {
  let raf = 0
  let running = true

  const padding = 14
  const speedPxPerSec = 420
  const start = performance.now()

  const step = (now: number) => {
    if (!running) return

    const vw = window.innerWidth
    const vh = window.innerHeight

    const rect = btn.getBoundingClientRect()
    const bw = rect.width
    const bh = rect.height

    const maxX = Math.max(padding, vw - bw - padding)
    const maxY = Math.max(padding, vh - bh - padding)

    const spanX = clamp(maxX - padding, 0, vw)
    const spanY = clamp(maxY - padding, 0, vh)
    const perimeter = Math.max(1, 2 * (spanX + spanY))

    const elapsedSec = (now - start) / 1000
    const dist = (elapsedSec * speedPxPerSec) % perimeter

    let x = padding
    let y = padding

    if (dist <= spanX) {
      // top edge (left -> right)
      x = padding + dist
      y = padding
    } else if (dist <= spanX + spanY) {
      // right edge (top -> bottom)
      x = padding + spanX
      y = padding + (dist - spanX)
    } else if (dist <= 2 * spanX + spanY) {
      // bottom edge (right -> left)
      x = padding + (spanX - (dist - (spanX + spanY)))
      y = padding + spanY
    } else {
      // left edge (bottom -> top)
      x = padding
      y = padding + (spanY - (dist - (2 * spanX + spanY)))
    }

    btn.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`
    raf = window.requestAnimationFrame(step)
  }

  raf = window.requestAnimationFrame(step)
  const onResize = () => {
    // Force a new layout read next frame (step reads bounding rect anyway).
  }
  window.addEventListener('resize', onResize)

  return () => {
    running = false
    window.cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    btn.style.transform = ''
  }
}

render()
