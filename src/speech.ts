import { useEffect, useState } from 'react'

export type VoiceStatus = 'loading' | 'ready' | 'missing' | 'unsupported'

function normalizeLang(lang: string): string {
  // Android reports "fr_BE" instead of "fr-BE".
  return lang.replace('_', '-').toLowerCase()
}

/** Best French voice installed on the device: fr-BE first, then fr-FR, then any French. */
export function pickFrenchVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const french = voices.filter((v) => normalizeLang(v.lang).startsWith('fr'))
  return (
    french.find((v) => normalizeLang(v.lang) === 'fr-be') ??
    french.find((v) => normalizeLang(v.lang) === 'fr-fr') ??
    french[0] ??
    null
  )
}

export const SPEECH_RATE_NORMAL = 1
export const SPEECH_RATE_SLOW = 0.75

/** Reads French text aloud. Stops whatever was being read before. */
export function speak(text: string, rate: number = SPEECH_RATE_NORMAL, onEnd?: () => void): void {
  if (!('speechSynthesis' in window)) {
    onEnd?.()
    return
  }
  const synth = window.speechSynthesis
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = pickFrenchVoice(synth.getVoices())
  if (voice) utterance.voice = voice
  utterance.lang = voice ? voice.lang.replace('_', '-') : 'fr-BE'
  utterance.rate = rate
  if (onEnd) {
    utterance.onend = onEnd
    utterance.onerror = onEnd
  }
  synth.speak(utterance)
}

/**
 * False when we know reading aloud cannot work (no speech engine, or voices
 * are listed and none is French). True when it should work or is still unknown.
 */
export function canSpeakFrench(): boolean {
  if (!('speechSynthesis' in window)) return false
  const voices = window.speechSynthesis.getVoices()
  return voices.length === 0 || pickFrenchVoice(voices) !== null
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

/** Tells whether a French voice is available. Voices load asynchronously on most devices. */
export function useVoiceStatus(): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>(() =>
    'speechSynthesis' in window ? 'loading' : 'unsupported',
  )

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const synth = window.speechSynthesis
    let settled = false

    const check = (final: boolean) => {
      const voices = synth.getVoices()
      if (pickFrenchVoice(voices)) {
        settled = true
        setStatus('ready')
      } else if (voices.length > 0 || final) {
        setStatus('missing')
      }
    }

    check(false)
    const onChange = () => check(false)
    synth.addEventListener('voiceschanged', onChange)
    // Some devices never fire "voiceschanged": give up waiting after a moment.
    const timer = window.setTimeout(() => {
      if (!settled) check(true)
    }, 2500)

    return () => {
      synth.removeEventListener('voiceschanged', onChange)
      window.clearTimeout(timer)
    }
  }, [])

  return status
}
