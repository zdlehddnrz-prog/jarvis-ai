import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function searchWeb(query) {
  try {
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    const d = await res.json()
    const parts = []
    if (d.AbstractText) parts.push(`[${d.Heading}]\n${d.AbstractText}\nURL: ${d.AbstractURL}`)
    ;(d.RelatedTopics || []).slice(0, 5).forEach(t => {
      if (t.Text) parts.push(`[관련]\n${t.Text}\nURL: ${t.FirstURL || ''}`)
    })
    return parts.join('\n\n') || '검색 결과 없음'
  } catch (e) { return '검색 오류: ' + e.message }
}

async function readPage(url) {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(10000),
    })
    return (await res.text()).slice(0, 6000)
  } catch (e) { return '읽기 실패: ' + e.message }
}

async function deepExplore(query) {
  const searchResult = await searchWeb(query)
  const urls = []
  const urlRegex = /URL: (https?:\/\/[^\s]+)/g
  let m
  while ((m = urlRegex.exec(searchResult)) !== null) urls.push(m[1])
  const pages = []
  for (const url of urls.slice(0, 3)) {
    const content = await readPage(url)
    pages.push(`=== ${url} ===\n${content}`)
  }
  return `[검색 결과]\n${searchResult}\n\n[페이지 내용]\n${pages.join('\n\n')}`
}

const tools = [
  { type: 'function', function: { name: 'web_search', description: '인터넷 검색', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'read_webpage', description: 'URL 읽기', parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] } } },
  { type: 'function', function: { name: 'deep_explore', description: '검색 후 여러 사이트 자동 탐색', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } },
  { type: 'function', function: { name: 'get_time', description: '현재 시각', parameters: { type: 'object', properties: {} } } },
]

export async function POST(req) {
  try {
    const { messages, lang = 'ko' } = await req.json()
    const lnames = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' }
    const systemMsg = {
      role: 'system',
      content: `당신은 J.A.R.V.I.S — 강력한 자율 웹 탐색 AI 비서입니다.
현재 시간: ${new Date().toLocaleString('ko', { timeZone: 'Asia/Seoul' })}
응답 언어: ${lnames[lang] || '한국어'}
최신 정보가 필요하면 반드시 web_search 또는 deep_explore 도구를 사용하세요.
항상 ${lnames[lang] || '한국어'}로 답변하고 출처를 명시하세요.
간결하고 정확하게, JARVIS답게 답변하세요.`
    }

    let currentMessages = [systemMsg, ...messages]
    let iterations = 0

    while (iterations < 8) {
      iterations++
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2048,
        tools,
        tool_choice: 'auto',
        messages: currentMessages,
      })

      const choice = res.choices[0]

      if (choice.finish_reason === 'stop') {
        return Response.json({ reply: choice.message.content })
      }

      if (choice.finish_reason === 'tool_calls') {
        const toolCalls = choice.message.tool_calls || []
        const toolMsgs = [choice.message]
        for (const tc of toolCalls) {
          let result = ''
          const args = JSON.parse(tc.function.arguments || '{}')
          if (tc.function.name === 'web_search') result = await searchWeb(args.query)
          else if (tc.function.name === 'read_webpage') result = await readPage(args.url)
          else if (tc.function.name === 'deep_explore') result = await deepExplore(args.query)
          else if (tc.function.name === 'get_time') result = new Date().toLocaleString('ko', { timeZone: 'Asia/Seoul' })
          toolMsgs.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
        currentMessages = [...currentMessages, ...toolMsgs]
        continue
      }

      return Response.json({ reply: choice.message.content || '응답 없음' })
    }

    return Response.json({ reply: '최대 반복 도달' })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
