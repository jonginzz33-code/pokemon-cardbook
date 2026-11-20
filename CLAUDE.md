# 카드 도감 (pokemon-cardbook) 작업 규칙

## 사용자와 일하는 방식 (사용자 요청 2026-11-19)
- 사용자가 **"만들어줘"** 라고 할 때만 코드를 만들고 올려요. 그 전에는 아래 **메모**에 번호를 붙여 정리만 해요.
  - 아이디어 · 고칠 점 · 바꾸고 싶은 것 → 메모에 추가하고 "메모해 뒀어요 (N번)" 이라고 답해요.
  - "만들어줘" → 메모에 쌓인 것을 한 번에 만들어 버전 하나로 올려요. 만든 항목은 ~~취소선~~ + "(v0.N에서 함)".
- 메모만 바꿀 때는 커밋 메시지에 `[skip ci]` 를 넣어 빌드가 돌지 않게 해요 (빌드가 돌면 앱에 '새 버전'이 떠요).
- 답은 한국어, 쉬운 말로.

## 새 버전을 만들 때
- `app.json`, `package.json` 의 `version` 을 올려요 (0.3.0 → 0.4.0 …).
- `store/whatsnew/whatsnew-ko-KR` 에 이번에 바뀐 것을 적어요 (500자 이내).
- `npx tsc --noEmit` 통과 확인 후 main 에 올리면 GitHub 빌드가 APK 를 Releases `latest` 에 올리고, 폰의 앱이 켜질 때 '새 버전이 있어요'로 알려요.
- 빌드 결과(Actions)를 확인하고, 실패하면 고쳐서 다시 올려요.

## 구조 메모
- Expo(React Native) 앱. 화면 `src/app/`, 데이터 `src/data/editions/*.json` (판별 전체 목록, 처음 쓸 때 불러옴 · 다시 받기: `NODE_USE_ENV_PROXY=1 node scripts/fetch-kr-official.mjs` / `NODE_USE_ENV_PROXY=1 node scripts/fetch-jp-official.mjs` / `node scripts/fetch-tcgdex.mjs en`), 보유 기록 `src/store/collection.tsx`, 사진 `src/store/photos.ts`.
- 카드 찍어서 넣기 `src/app/scan.tsx` + `src/scan/recognize.ts`. 네이티브 모듈 `modules/card-scanner` (우리가 만든 Expo 모듈, Kotlin): 카드 촬영(ML Kit 문서 스캐너) + 글자 인식(ML Kit 한국어·일본어·영문, 앱에 포함된 모델).
- 앱 안 업데이트 `src/update/updater.ts` (APK판만, 스토어용 AAB 는 STORE_BUILD=1 로 꺼짐).
- 빌드 `.github/workflows/build.yml`. 플레이 콘솔 자동 업로드는 저장소 변수 `PLAY_UPLOAD=true` 일 때만 (지금 꺼짐).

## 메모 (만들어줘 하기 전까지 여기만 정리)
1. ~~실제 카드 데이터 채우기~~ (v0.4.0에서 함 · 한국판 `scripts/fetch-kr-official.mjs` 공식 사이트 상세 페이지 BS{연도}{세트}{번호} · 일본/영문 `scripts/fetch-tcgdex.mjs` · TCGdex 한국어는 세트 3개만 카드가 있어 안 씀 · TCG Pocket 뺌 · 2026-11-19 기준 한국 205세트 17,394장 / 일본(v0.5.0 공식 사이트) 357세트 25,714장 / 영문 20시리즈 21,432장) — ✅ 2026-11-19 네트워크 허용됨 (클라우드 환경 'pokemon-cardbook': `api.tcgdex.net` · `pokemoncard.co.kr` · `www.pokemoncard.co.kr`). TCGdex 한국어: 세트 95개 · 카드 약 7,931장 (썬&문 SM1 ~ 스칼렛&바이올렛). 빠진 한국판 세트는 공식 사이트(pokemoncard.co.kr/main)로 보충. 일본판 · 영문판은 TCGdex.
2. ~~APK 크기 줄이기~~ (v0.4.0에서 함 · APK 는 arm64-v8a 만, AAB 는 전부)
3. ~~📷 카드 사진을 카드 모양에 딱 맞게~~ (v0.5.0에서 함 · `modules/card-scanner` ML Kit 문서 스캐너 `scanCard()` — 못 쓰면 예전 자르기 화면 · 저장은 늘 720×1006) (사용자 2026-11-19: 폰 사진 비율이 카드와 달라 사진이 이상하게 찍힘) — 지금은 expo-image-picker 의 자르기 화면(63:88)에 의존. 할 것: ① 촬영 화면에 카드 모양 테두리(가이드) 띄우기 ② 카드 테두리를 자동으로 찾아 반듯하게 펴서 잘라 주기 (Google ML Kit 문서 스캐너 — 기울어지게 찍어도 사각형으로 펴 줌) ③ 결과를 63:88 로 맞춰 저장 · 글자 인식도 잘라낸 사진으로 (더 잘 읽힘). 확인함(2026-11-19): 자르기 화면은 뜸 — 손으로 맞추는 게 불편한 것이 문제라 ①② 자동으로 맞추는 쪽이 핵심.
4. ~~🔄 홈 화면 왼쪽 맨 위에 업데이트 버튼~~ (v0.5.0에서 함 · `src/update/UpdateContext.tsx` · 홈은 왼쪽, 다른 화면은 오른쪽 위 · 앱 복귀 시 1분 간격 확인) (사용자 2026-11-19: 테스트 버전이라 자주 업데이트할 것) — 헤더 왼쪽에 항상 보이는 버튼. 누르면 바로 확인 → 새 버전이면 받기·설치, 아니면 '최신 버전이에요'. 새 버전이 있으면 버튼에 빨간 점. '실시간'으로: 앱을 켤 때뿐 아니라 앱으로 다시 돌아올 때(백그라운드 → 앞)도 확인. (선택지, 사용자 결정 전: 화면·글자만 바뀐 업데이트는 APK 재설치 없이 앱 안에서 바로 바뀌게 하는 방식(expo-updates) — 서버 준비가 필요해서 지금은 안 함)
5. ~~🇯🇵 일본판 빠진 카드 채우기~~ (v0.5.0에서 함 · `scripts/fetch-jp-official.mjs` 공식 검색 resultAPI 목록 + 카드 상세 · 세트 = 이미지 폴더 · DP 이전 옛날 시리즈만 TCGdex) (사용자 2026-11-19: 일본판이 한국판보다 적은 게 이상함) — TCGdex 일본어는 세트 204개 중 83개가 카드 목록이 비어 있음 (13,156장 / 원래 약 19,261장 이상). 빠진 것: ADV(2003~) · LEGEND · BW 전부 · XY 대부분 · 프로모 등. 할 것: 일본 공식 카드 검색(www.pokemon-card.com 카드 상세 페이지)에서 한국판처럼 천천히 받아 빈 세트 채우기 (또는 일본판 전체를 공식 사이트 기준으로). 필요: 클라우드 환경 'pokemon-cardbook' 에 `www.pokemon-card.com` 접속 허용 추가.
6. ~~🐞 카드 찍어서 넣기 오류~~ (v0.5.0에서 함 · expo-text-extractor 빼고 `modules/card-scanner` `recognizeText(uri, korean|japanese|latin)` · 단계별 오류 · 실패해도 번호/이름 검색) (사용자 2026-11-19 스샷, v0.4.0): 찍은 뒤 '⚠️ 문제가 생겼어요 — Attempt to invoke virtual method 'java.lang.Class java.lang.Object.getClass()' on a null object reference' (안드로이드 안쪽 NullPointerException). 가장 의심: 글자 인식 모듈 `expo-text-extractor` 2.0.0 — Expo SDK 54용으로 만들어져 우리 SDK 58과 안 맞을 가능성 (Play 서비스 ML Kit 초기화/파일 읽기 쪽). 고칠 것: ① 글자 인식을 우리 앱 안의 작은 네이티브 모듈로 직접 만들기 (ML Kit '앱에 포함된' 인식기 `com.google.mlkit:text-recognition` + 한국어 `text-recognition-korean` · 일본어 `text-recognition-japanese` → **한국어·일본어 카드 이름도 읽을 수 있게 됨**) 또는 관리 중인 다른 모듈로 바꾸기 ② 오류 창에 어느 단계(사진 받기 / 글자 읽기 / 저장)에서 났는지 표시 ③ 글자 인식이 실패해도 사진은 버리지 말고 '직접 고르기'로 넘어가게.
