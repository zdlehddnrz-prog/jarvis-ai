# J.A.R.V.I.S — 완전 독립 AI 시스템

## 포함된 기능
- ✅ 실시간 AI 대화 (Claude Sonnet)
- ✅ 실시간 웹 검색 (DuckDuckGo 무료 / Tavily 고급)
- ✅ 어떤 URL이든 내용 읽기 (Jina AI Reader)
- ✅ 음성 입력 (Web Speech API)
- ✅ 음성 출력 TTS
- ✅ AR 카메라 HUD
- ✅ PWA — 홈 화면에 앱처럼 설치
- ✅ 한국어/English/日本語/中文 지원
- ✅ 모바일 완전 최적화

---

## 배포 방법 (10분 안에 완성)

### Step 1 — API 키 발급

1. **Anthropic** (필수): https://console.anthropic.com
   - 가입 → API Keys → Create Key → 복사

2. **Tavily** (선택, 더 강력한 검색): https://app.tavily.com
   - 가입 → API Keys → 복사 (무료 1000회/월)

### Step 2 — GitHub에 올리기

```bash
# 이 폴더에서:
git init
git add .
git commit -m "JARVIS init"
git branch -M main
git remote add origin https://github.com/[내계정]/jarvis-ai.git
git push -u origin main
```

### Step 3 — Vercel 배포

1. https://vercel.com 접속 → GitHub 로그인
2. "New Project" → jarvis-ai 선택 → Import
3. **Environment Variables** 설정:
   - `ANTHROPIC_API_KEY` = sk-ant-...
   - `TAVILY_API_KEY` = tvly-... (선택)
4. Deploy 클릭

→ **완료!** `jarvis-ai.vercel.app` 으로 어디서든 접속 가능

---

## 핸드폰에 앱으로 설치

배포 완료 후:

**iPhone (iOS)**:
1. Safari로 사이트 접속
2. 하단 공유 버튼 탭
3. "홈 화면에 추가" 선택
4. 아이콘 이름 "JARVIS" → 추가

**Android**:
1. Chrome으로 사이트 접속
2. 오른쪽 상단 메뉴 (점 3개)
3. "홈 화면에 추가" 선택
4. 설치 → 앱처럼 실행됨

---

## 웹 검색 작동 방식

```
사용자 질문
    ↓
Claude AI 판단 (검색 필요?)
    ↓ (YES)
DuckDuckGo API 또는 Tavily 검색
    ↓
Jina AI로 URL 내용 읽기
    ↓
Claude가 정보 분석 + 답변 생성
    ↓
사용자에게 답변 (출처 포함)
```

## 검색 예시

- "오늘 뉴스 알려줘" → 자동 웹 검색
- "https://naver.com 분석해줘" → URL 직접 읽기
- "삼성전자 주가 알려줘" → 실시간 검색
- "최신 AI 논문 요약해줘" → 검색 + 분석

---

## 로컬 테스트

```bash
npm install
npm run dev
# http://localhost:3000 접속
```

---

## 비용 안내

| 서비스 | 무료 한도 | 가격 |
|--------|-----------|------|
| Anthropic | 없음 | ~$0.003/1K 토큰 |
| Vercel | 무료 플랜 충분 | 무료 |
| Tavily | 1,000회/월 | 무료 |
| DuckDuckGo | 무제한 | 완전 무료 |
| Jina Reader | 무제한 | 완전 무료 |

일반적으로 하루 100회 대화 기준 월 $1~3 수준.
