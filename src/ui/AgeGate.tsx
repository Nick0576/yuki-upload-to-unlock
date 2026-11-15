import { useState } from 'react'
import { useApp } from '../store'

export function AgeGate() {
  const { anon } = useApp()
  const [declined, setDeclined] = useState(false)

  if (declined) {
    return (
      <div className="gate">
        <div className="gate-art" aria-hidden>
          🌙
        </div>
        <h1>Yuki is for adults only</h1>
        <p className="muted">
          You must be 18 or older to continue. Nothing was saved and the app stays locked.
        </p>
        <button className="btn ghost wide" onClick={() => setDeclined(false)}>
          I entered by mistake
        </button>
        <p className="tiny muted">Not for you? Please close the app.</p>
      </div>
    )
  }

  return (
    <div className="gate">
      <div className="gate-art" aria-hidden>
        🌸
      </div>
      <span className="pill">Age check</span>
      <h1>Are you 18 years or older?</h1>
      <p className="muted">
        Yuki contains romance and mature themes. This is a one-time check — your answer is remembered on this
        device.
      </p>
      <div className="gate-actions">
        <button className="btn primary wide" onClick={() => anon(true)}>
          YES, I am 18 or older
        </button>
        <button className="btn ghost wide" onClick={() => setDeclined(true)}>
          NO, I am under 18
        </button>
      </div>
      <p className="tiny muted">No ID, no documents, no accounts needed for this check.</p>
    </div>
  )
}
