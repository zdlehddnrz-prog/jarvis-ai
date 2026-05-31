'use client'
import { useState, useRef, useEffect, useCallback } from 'react'

const QUICK = [
  { icon: '🌤', label: '날씨', cmd: '지금 서울 날씨 실시간으로 검색해서 알려줘' },
  { icon: '📰', label: '뉴스', cmd: '오늘 최신 뉴스 5가지 deep_explore로 조사해줘' },
  { icon: '📈', label: '주가', cmd: '삼성전자 오늘 주가와 최근 동향 조사해줘' },
  { icon: '🔬', label: '리서치', cmd: '' },
  { icon: '🌐', label: 'URL 분석', cmd: '' },
  { icon: '💻', label: '코드', cmd: '파이썬 FastAPI로 간단한 REST API 서버 코드 만들어줘' },
]

export default function Home() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'J.A.R.V.I.S 온라인. 자율 웹 탐색 시스템 준비 완료.\n\n🔍 단순 검색부터 멀티사이트 자율 탐색까지 가능합니다.\n예: "AI 최신 트렌드 리서치해줘" → 자동으로 여러 사이트 탐색 후 종합 보고서 생성', }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [micOn, setMicOn] = useState(false)
  const [ttsOn, setTtsOn] = useState(false)
  const [lang, setLang] = useState('ko')
  const [camOn, setCamOn] = useState(false)
  const [logs, setLogs] = useState(['시스템 부팅 완료', '자율 탐색 모듈 온라인', '멀티서치 준비', '딥탐색 준비'])
  const [respTime, setRespTime] = useState('--')
  const [cpuVal, setCpuVal] = useState(76)
  const [tab, setTab] = useState('chat')
  const [urlInput, setUrlInput] = useState('')
  const [researchInput, setResearchInput] = useState('')
  const [searchStatus, setSearchStatus] = useState('')

  const msgsRef = useRef(null)
  const recogRef = useRef(null)
  const vidRef = useRef(null)
  const arCanvasRef = useRef(null)
  const arAnimRef = useRef(null)
  const streamRef = useRef(null)
  const apiMsgs = useRef([])

  const addLog = (t) => {
    const ts = new Date().toLocaleTimeString('ko', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    setLogs(prev => [`[${ts}] ${t}`, ...prev].slice(0, 10))
  }

  useEffect(() => { if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight }, [messages])
  useEffect(() => { const iv = setInterval(() => setCpuVal(65 + Math.floor(Math.random()*28)), 2500); return () => clearInterval(iv) }, [])

  const speak = useCallback((text) => {
    if (!ttsOn || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = { ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN' }[lang]
    u.rate = 1.0; u.pitch = 0.9
    const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(lang))
    if (v) u.voice = v
    window.speechSynthesis.speak(u)
  }, [ttsOn, lang])

  const send = useCallback(async (text) => {
    const msg = (text !== undefined ? text : input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    apiMsgs.current = [...apiMsgs.current, { role: 'user', content: msg }].slice(-20)
    setLoading(true)
    setSearchStatus('탐색 중...')
    addLog(`입력: ${msg.slice(0,20)}...`)
    const t0 = Date.now()
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMsgs.current, lang }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || '오류 발생'
      apiMsgs.current = [...apiMsgs.current, { role: 'assistant', content: reply }]
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
      const ms = Date.now() - t0
      setRespTime(ms + 'ms')
      setSearchStatus('')
      addLog(`응답 ${ms}ms`)
      speak(reply.slice(0, 200))
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: '통신 오류: ' + e.message }])
      setSearchStatus('')
      addLog('오류 발생')
    }
    setLoading(false)
  }, [input, loading, lang, speak])

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('크롬 브라우저에서만 음성 인식 가능합니다.'); return }
    if (micOn) { recogRef.current?.stop(); setMicOn(false); return }
    const r = new SR()
    r.lang = { ko:'ko-KR', en:'en-US', ja:'ja-JP', zh:'zh-CN' }[lang]
    r.continuous = false; r.interimResults = true
    r.onstart = () => { setMicOn(true); addLog('음성 입력 시작') }
    r.onresult = (e) => {
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) final += e.results[i][0].transcript
      if (final) setInput(final)
    }
    r.onend = () => { setMicOn(false); addLog('음성 종료'); setTimeout(() => { if (input.trim()) send() }, 400) }
    r.onerror = (e) => { setMicOn(false); addLog('음성 오류: ' + e.error) }
    recogRef.current = r; r.start()
  }

  const toggleCam = async () => {
    if (camOn) {
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (vidRef.current) vidRef.current.srcObject = null
      if (arAnimRef.current) cancelAnimationFrame(arAnimRef.current)
      setCamOn(false); addLog('AR 카메라 OFF'); return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (vidRef.current) { vidRef.current.srcObject = stream; vidRef.current.play() }
      setCamOn(true); addLog('AR 카메라 ON'); setTab('ar'); startARDraw()
    } catch { addLog('카메라 권한 거부') }
  }

  const startARDraw = () => {
    const canvas = arCanvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = canvas.offsetWidth || 320; canvas.height = canvas.offsetHeight || 240
    let frame = 0
    const draw = () => {
      arAnimRef.current = requestAnimationFrame(draw); frame++
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(0,212,255,0.2)'; ctx.lineWidth = 0.5
      for (let x = 0; x < canvas.width; x += 36) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke() }
      for (let y = 0; y < canvas.height; y += 36) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke() }
      if (frame % 80 === 0) {
        const rx = 40+Math.random()*(canvas.width-120), ry = 20+Math.random()*(canvas.height-80)
        ctx.strokeStyle = 'rgba(0,255,150,0.7)'; ctx.lineWidth = 1.5
        ctx.strokeRect(rx, ry, 80+Math.random()*60, 50+Math.random()*40)
      }
    }
    draw()
  }

  const S = (style) => style  // style helper

  return (
    <div style={{ minHeight:'100vh', background:'#060b14', paddingBottom:80 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Share Tech Mono',monospace; color:#c8e8f8; }
        .scanline { position:fixed; top:0; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(0,212,255,0.4),transparent); animation:scan 8s linear infinite; pointer-events:none; z-index:1000; }
        @keyframes scan { 0%{top:-2px;opacity:0} 5%{opacity:1} 95%{opacity:1} 100%{top:100vh;opacity:0} }
        .pulse { animation:pulse 1.8s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{box-shadow:0 0 15px #00d4ff,0 0 30px rgba(0,212,255,.4)} 50%{box-shadow:0 0 25px #00d4ff,0 0 50px rgba(0,212,255,.6)} }
        .blink { animation:blink 2s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .msgin { animation:msgin .25s ease; }
        @keyframes msgin { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .tdot { width:4px;height:4px;border-radius:50%;background:#00d4ff;display:inline-block; }
        .tdot:nth-child(1){animation:tp 1.2s 0s infinite}
        .tdot:nth-child(2){animation:tp 1.2s .2s infinite}
        .tdot:nth-child(3){animation:tp 1.2s .4s infinite}
        @keyframes tp { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        input::placeholder{color:#3a6a84}
        input{outline:none}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(0,212,255,.3);border-radius:2px}
        .panel{background:rgba(8,16,32,0.92);border:1px solid rgba(0,212,255,0.2);border-radius:4px;padding:12px;position:relative}
        .panel::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(0,212,255,0.15),transparent)}
        .plabel{font-family:'Orbitron',monospace;font-size:8px;letter-spacing:3px;color:#3a6a84;margin-bottom:10px;display:flex;align-items:center;gap:4px}
        .plabel::before{content:'';width:4px;height:4px;background:#00d4ff;border-radius:50%;animation:blink 2s infinite}
        .qbtn{background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.18);border-radius:3px;padding:8px 10px;color:#8ab8cc;font-size:11px;cursor:pointer;white-space:nowrap;font-family:'Share Tech Mono',monospace;transition:all .15s}
        .qbtn:active{background:rgba(0,212,255,0.15)}
        .tab{flex:1;padding:10px 0;background:none;border:none;font-family:'Orbitron',monospace;font-size:10px;letter-spacing:2px;cursor:pointer;transition:all .2s;border-bottom:2px solid transparent}
        .tab.act{color:#00d4ff;border-bottom-color:#00d4ff}
        .tab.off{color:#3a6a84}
        .sendbtn{padding:10px 16px;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.35);border-radius:4px;color:#00d4ff;font-family:'Orbitron',monospace;font-size:9px;letter-spacing:1px;cursor:pointer;white-space:nowrap}
        .sendbtn:active{transform:scale(.96)}
        .micbtn{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;flex-shrink:0;border:1px solid rgba(0,212,255,0.35);background:rgba(0,212,255,0.08);transition:all .2s}
        .micbtn.on{background:rgba(255,40,80,.2);border-color:rgba(255,40,80,.5);animation:recpulse 1s infinite}
        @keyframes recpulse{0%,100%{box-shadow:0 0 4px rgba(255,40,80,.3)}50%{box-shadow:0 0 12px rgba(255,40,80,.6)}}
        .cinput{flex:1;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.2);border-radius:4px;color:#e0f0ff;padding:10px 12px;font-size:14px;font-family:'Share Tech Mono',monospace;transition:border-color .2s}
        .cinput:focus{border-color:rgba(0,212,255,.5)}
        .urlbtn{padding:8px 12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);border-radius:3px;color:#00d4ff;font-family:'Orbitron',monospace;font-size:8px;cursor:pointer;white-space:nowrap}
        .deepbtn{width:100%;padding:12px;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);border-radius:4px;color:#00d4ff;font-family:'Orbitron',monospace;font-size:9px;letter-spacing:2px;cursor:pointer;margin-top:6px}
        .deepbtn:active{transform:scale(.98)}
        .langbtn{padding:10px;background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.15);border-radius:3px;color:#3a6a84;font-family:'Orbitron',monospace;font-size:10px;cursor:pointer;transition:all .2s}
        .langbtn.act{background:rgba(0,212,255,0.15);border-color:rgba(0,212,255,0.5);color:#00d4ff}
      `}</style>

      <div className="scanline" />

      {/* Header */}
      <div style={{ background:'rgba(8,16,32,0.97)', borderBottom:'1px solid rgba(0,212,255,0.2)', padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div className="pulse" style={{ width:28, height:28, borderRadius:'50%', background:'radial-gradient(circle,#fff 0%,#00d4ff 50%,#004488 100%)', flexShrink:0 }} />
          <div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:14, fontWeight:900, color:'#fff', letterSpacing:4, textShadow:'0 0 10px #00d4ff' }}>J.A.R.V.I.S</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:7, letterSpacing:2, color:'#3a6a84' }}>AUTONOMOUS WEB EXPLORER v5.0</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          {loading && <span style={{ fontSize:9, color:'#ffaa00', fontFamily:'Orbitron', animation:'blink 1s infinite' }}>탐색중...</span>}
          <span className="blink" style={{ fontSize:9, color:'#00ffaa' }}>● ONLINE</span>
          <span style={{ fontSize:9, color:'#3a6a84', fontFamily:'Orbitron' }}>{respTime}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'rgba(8,16,32,0.9)', borderBottom:'1px solid rgba(0,212,255,0.12)' }}>
        {[['chat','대화'],['explore','탐색'],['ar','AR'],['settings','설정']].map(([t,l]) => (
          <button key={t} className={`tab ${tab===t?'act':'off'}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {tab === 'chat' && (
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4 }}>
            {QUICK.map((q,i) => (
              <button key={i} className="qbtn" onClick={() => q.cmd ? send(q.cmd) : setTab('explore')}>
                {q.icon} {q.label}
              </button>
            ))}
          </div>

          <div ref={msgsRef} style={{ background:'rgba(4,10,22,0.9)', border:'1px solid rgba(0,212,255,0.18)', borderRadius:4, padding:12, maxHeight:'52vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {messages.map((m,i) => (
              <div key={i} className="msgin" style={{ display:'flex', gap:6, flexDirection:m.role==='user'?'row-reverse':'row', alignItems:'flex-start' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:m.role==='assistant'?'rgba(0,212,255,0.1)':'rgba(80,160,255,0.1)', border:`1px solid ${m.role==='assistant'?'rgba(0,212,255,0.4)':'rgba(80,160,255,0.3)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, fontFamily:'Orbitron,monospace', color:m.role==='assistant'?'#00d4ff':'#60aaff', flexShrink:0 }}>
                  {m.role==='assistant'?'AI':'나'}
                </div>
                <div style={{ maxWidth:'84%', padding:'8px 12px', borderRadius:m.role==='assistant'?'0 4px 4px 4px':'4px 0 4px 4px', background:m.role==='assistant'?'rgba(0,212,255,0.06)':'rgba(40,100,200,0.12)', border:`1px solid ${m.role==='assistant'?'rgba(0,212,255,0.18)':'rgba(80,140,255,0.2)'}`, fontSize:13, lineHeight:1.6, color:m.role==='assistant'?'#b8e4f4':'#c8deff', textAlign:m.role==='user'?'right':'left', whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:7, color:'#00d4ff', fontFamily:'Orbitron' }}>AI</div>
                <div style={{ display:'flex', gap:4, padding:'10px 14px', background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.18)', borderRadius:'0 4px 4px 4px', alignItems:'center' }}>
                  <div className="tdot"/><div className="tdot"/><div className="tdot"/>
                  <span style={{ fontSize:10, color:'#3a6a84', marginLeft:6, fontFamily:'Orbitron' }}>{searchStatus}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <button className={`micbtn ${micOn?'on':''}`} onClick={toggleMic}>🎤</button>
            <input className="cinput" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="명령 또는 탐색 요청..." />
            <button className="sendbtn" onClick={()=>send()}>전송</button>
          </div>
        </div>
      )}

      {/* ── EXPLORE TAB ── */}
      {tab === 'explore' && (
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>

          <div className="panel">
            <div className="plabel">자율 딥 리서치</div>
            <p style={{ fontSize:11, color:'#8ab8cc', marginBottom:8, lineHeight:1.7 }}>
              주제 입력 → JARVIS가 자동으로 여러 사이트 탐색 후 종합 보고서 생성
            </p>
            <textarea value={researchInput} onChange={e=>setResearchInput(e.target.value)}
              placeholder="예: 2025년 AI 트렌드&#10;예: 테슬라 최근 뉴스 분석&#10;예: 파이썬 최신 버전 변경사항"
              style={{ width:'100%', background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:3, color:'#e0f0ff', padding:'8px 10px', fontSize:12, fontFamily:'Share Tech Mono,monospace', resize:'vertical', minHeight:80, outline:'none' }}
            />
            <button className="deepbtn" onClick={() => { if(researchInput.trim()){ send(`다음 주제를 deep_explore로 여러 사이트 탐색해서 종합 보고서 작성해줘: ${researchInput}`); setResearchInput(''); setTab('chat'); } }}>
              🔬 자율 탐색 시작
            </button>
          </div>

          <div className="panel">
            <div className="plabel">URL 직접 분석</div>
            <div style={{ display:'flex', gap:6 }}>
              <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                placeholder="https://..." onKeyDown={e=>e.key==='Enter'&&(send(`이 URL 내용을 읽고 분석해줘: ${urlInput}`),setUrlInput(''),setTab('chat'))}
                style={{ flex:1, background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:3, color:'#e0f0ff', padding:'8px 10px', fontSize:12, fontFamily:'Share Tech Mono,monospace' }}
              />
              <button className="urlbtn" onClick={()=>{ if(urlInput.trim()){ send(`이 URL 내용을 읽고 분석해줘: ${urlInput}`); setUrlInput(''); setTab('chat'); } }}>분석</button>
            </div>
          </div>

          <div className="panel">
            <div className="plabel">빠른 탐색 명령</div>
            {[
              ['📊','비교 분석','두 가지를 multi_search로 비교해줘: ChatGPT vs Claude 최신 성능 비교'],
              ['📰','뉴스 심층','오늘 한국 IT 뉴스 top5 deep_explore로 탐색해서 요약해줘'],
              ['💹','주식/경제','코스피, 나스닥 오늘 현황 검색해서 알려줘'],
              ['🔭','최신 기술','2025년 최신 AI/반도체 기술 트렌드 deep_explore로 조사해줘'],
              ['🌍','글로벌 뉴스','오늘 세계 주요 뉴스 multi_search로 수집해줘'],
            ].map(([icon,label,cmd],i) => (
              <button key={i} style={{ display:'flex', gap:10, alignItems:'center', width:'100%', background:'rgba(0,212,255,0.04)', border:'1px solid rgba(0,212,255,0.12)', borderRadius:3, padding:'10px', marginBottom:4, cursor:'pointer', color:'#8ab8cc', fontSize:12, textAlign:'left', fontFamily:'Share Tech Mono' }}
                onClick={()=>{ send(cmd); setTab('chat'); }}>
                <span style={{ fontSize:16 }}>{icon}</span>
                <div>
                  <div style={{ color:'#c8e8f8', fontSize:12 }}>{label}</div>
                  <div style={{ fontSize:10, color:'#3a6a84', marginTop:2 }}>{cmd.slice(0,40)}...</div>
                </div>
              </button>
            ))}
          </div>

          <div className="panel">
            <div className="plabel">탐색 엔진</div>
            {[
              ['🔍 web_search','단순 검색 1회','#00ffaa'],
              ['🔬 deep_explore','검색 + 자동 페이지 읽기 (4~6개)','#00d4ff'],
              ['🔀 multi_search','여러 쿼리 동시 검색','#ffaa00'],
              ['🕷 crawl_links','사이트 링크 수집 후 순차 탐색','#ff9944'],
              ['📄 read_webpage','특정 URL 전체 읽기','#00d4ff'],
            ].map(([name,desc,color],i) => (
              <div key={i} style={{ display:'flex', gap:8, padding:'5px 0', borderBottom:'1px solid rgba(0,212,255,0.07)', alignItems:'flex-start' }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:color, flexShrink:0, marginTop:6 }} />
                <div>
                  <div style={{ fontSize:12, color:'#c8e8f8', fontFamily:'Orbitron', letterSpacing:1 }}>{name}</div>
                  <div style={{ fontSize:10, color:'#3a6a84', marginTop:2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AR TAB ── */}
      {tab === 'ar' && (
        <div style={{ padding:12 }}>
          <div style={{ position:'relative', background:'#000', borderRadius:4, overflow:'hidden', height:'55vw', minHeight:200, maxHeight:340, border:'1px solid rgba(0,212,255,0.3)' }}>
            <video ref={vidRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} playsInline muted />
            <canvas ref={arCanvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
            <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
              <div style={{ position:'absolute', top:8, left:8, background:'rgba(0,212,255,0.15)', border:'1px solid rgba(0,212,255,0.4)', borderRadius:2, padding:'2px 8px', fontSize:9, color:'#00d4ff', fontFamily:'Orbitron' }}>AR HUD</div>
              <div style={{ position:'absolute', top:8, right:8, background:'rgba(0,212,255,0.15)', border:'1px solid rgba(0,212,255,0.4)', borderRadius:2, padding:'2px 8px', fontSize:9, color:'#00d4ff', fontFamily:'Orbitron' }}>{camOn?'LIVE':'STANDBY'}</div>
            </div>
          </div>
          <button onClick={toggleCam} style={{ width:'100%', marginTop:10, padding:12, background:camOn?'rgba(255,40,80,0.15)':'rgba(255,170,0,0.1)', border:`1px solid ${camOn?'rgba(255,40,80,0.4)':'rgba(255,170,0,0.35)'}`, borderRadius:4, color:camOn?'#ff4466':'#ffaa00', fontFamily:'Orbitron,monospace', fontSize:10, letterSpacing:2, cursor:'pointer' }}>
            {camOn ? '카메라 OFF' : '카메라 ON (AR)'}
          </button>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === 'settings' && (
        <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:10 }}>
          <div className="panel">
            <div className="plabel">언어</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {[['ko','🇰🇷 한국어'],['en','🇺🇸 English'],['ja','🇯🇵 日本語'],['zh','🇨🇳 中文']].map(([code,label]) => (
                <button key={code} className={`langbtn ${lang===code?'act':''}`} onClick={()=>setLang(code)}>{label}</button>
              ))}
            </div>
          </div>
          <div className="panel">
            <div className="plabel">음성 출력 (TTS)</div>
            <button onClick={()=>setTtsOn(!ttsOn)} style={{ width:'100%', padding:12, background:ttsOn?'rgba(0,255,150,0.1)':'rgba(0,212,255,0.04)', border:`1px solid ${ttsOn?'rgba(0,255,150,0.3)':'rgba(0,212,255,0.15)'}`, borderRadius:3, color:ttsOn?'#00ffaa':'#3a6a84', fontFamily:'Orbitron', fontSize:10, cursor:'pointer', letterSpacing:2 }}>
              TTS: {ttsOn?'ON':'OFF'}
            </button>
          </div>
          <div className="panel">
            <div className="plabel">시스템 정보</div>
            {[['AI 모델','Claude Sonnet 4'],['탐색 엔진','deep_explore + multi_search'],['URL 리더','Jina AI Reader'],['검색','DuckDuckGo / Tavily'],['처리',cpuVal+'%'],['응답',respTime]].map(([k,v],i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid rgba(0,212,255,0.07)', fontSize:11 }}>
                <span style={{ color:'#3a6a84' }}>{k}</span>
                <span style={{ color:'#00d4ff', fontFamily:'Orbitron', fontSize:10 }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="panel" style={{ fontSize:11, color:'#8ab8cc', lineHeight:1.9 }}>
            <div className="plabel">홈화면 앱으로 설치</div>
            📱 <strong style={{ color:'#00d4ff' }}>iOS:</strong> Safari → 공유 → 홈 화면에 추가<br/>
            🤖 <strong style={{ color:'#00d4ff' }}>Android:</strong> Chrome → 메뉴 → 홈 화면에 추가
          </div>
          <div className="panel">
            <div className="plabel">활동 로그</div>
            {logs.map((l,i) => <div key={i} style={{ fontSize:9, color:'#3a6a84', lineHeight:1.9, fontFamily:'Orbitron' }}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}
