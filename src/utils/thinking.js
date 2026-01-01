export function splitThinkingAnswer(raw) {
  if (!raw) return { thinking: '', answer: '' }
  const thinkStart = '[THINKING_START]'
  const thinkEnd = '[THINKING_END]'
  const ansStart = '[ANSWER_START]'
  const ansEnd = '[ANSWER_END]'

  let thinking = ''
  let answer = ''

  const tStartIdx = raw.indexOf(thinkStart)
  const tEndIdx = raw.indexOf(thinkEnd)
  const aStartIdx = raw.indexOf(ansStart)
  const aEndIdx = raw.indexOf(ansEnd)

  if (tStartIdx !== -1 && tEndIdx !== -1 && tEndIdx > tStartIdx) {
    thinking = raw.substring(tStartIdx + thinkStart.length, tEndIdx)
  }
  if (aStartIdx !== -1) {
    const start = aStartIdx + ansStart.length
    const end = aEndIdx !== -1 && aEndIdx > start ? aEndIdx : raw.length
    answer = raw.substring(start, end)
  } else {
    answer = raw
  }

  return {
    thinking: (thinking || '').trim(),
    answer: (answer || '').trim()
  }
}

export function createThinkingStreamProcessor({
  onThinking,
  onAnswer
} = {}) {
  const markers = [
    { m: '[THINKING_START]', t: 'thinking_start' },
    { m: '[THINKING_END]', t: 'thinking_end' },
    { m: '[ANSWER_START]', t: 'answer_start' },
    { m: '[ANSWER_END]', t: 'answer_end' }
  ]

  let streamBuffer = ''
  let streamMode = 'answer'

  const appendText = (txt) => {
    if (!txt) return
    if (streamMode === 'thinking') {
      onThinking && onThinking(txt)
    } else if (streamMode === 'answer') {
      onAnswer && onAnswer(txt)
    }
  }

  const maxLen = Math.max(...markers.map(x => x.m.length))

  const process = () => {
    while (true) {
      let next = null
      for (const it of markers) {
        const idx = streamBuffer.indexOf(it.m)
        if (idx === -1) continue
        if (!next || idx < next.idx) {
          next = { idx, ...it }
        }
      }

      if (!next) {
        if (streamBuffer.length > maxLen) {
          const safeLen = streamBuffer.length - (maxLen - 1)
          const out = streamBuffer.slice(0, safeLen)
          streamBuffer = streamBuffer.slice(safeLen)
          appendText(out)
        }
        break
      }

      const before = streamBuffer.slice(0, next.idx)
      appendText(before)
      streamBuffer = streamBuffer.slice(next.idx + next.m.length)

      if (next.t === 'thinking_start') {
        streamMode = 'thinking'
      } else if (next.t === 'thinking_end') {
        streamMode = 'answer'
      } else if (next.t === 'answer_start') {
        streamMode = 'answer'
      } else if (next.t === 'answer_end') {
        streamMode = 'answer'
      }
    }
  }

  const push = (chunk) => {
    streamBuffer += chunk || ''
    process()
  }

  const flush = () => {
    if (streamBuffer) {
      appendText(streamBuffer)
      streamBuffer = ''
    }
  }

  return {
    push,
    flush
  }
}
