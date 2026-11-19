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
- Expo(React Native) 앱. 화면 `src/app/`, 데이터 `src/data/editions/*.json` (판별 전체 목록, 처음 쓸 때 불러옴 · 다시 받기: `NODE_USE_ENV_PROXY=1 node scripts/fetch-kr-official.mjs` / `node scripts/fetch-tcgdex.mjs ja en`), 보유 기록 `src/store/collection.tsx`, 사진 `src/store/photos.ts`.
- 카드 찍어서 넣기 `src/app/scan.tsx` + `src/scan/recognize.ts` (ML Kit 글자 인식, 영문·숫자만).
- 앱 안 업데이트 `src/update/updater.ts` (APK판만, 스토어용 AAB 는 STORE_BUILD=1 로 꺼짐).
- 빌드 `.github/workflows/build.yml`. 플레이 콘솔 자동 업로드는 저장소 변수 `PLAY_UPLOAD=true` 일 때만 (지금 꺼짐).

## 메모 (만들어줘 하기 전까지 여기만 정리)
1. ~~실제 카드 데이터 채우기~~ (v0.4.0에서 함 · 한국판 `scripts/fetch-kr-official.mjs` 공식 사이트 상세 페이지 BS{연도}{세트}{번호} · 일본/영문 `scripts/fetch-tcgdex.mjs` · TCGdex 한국어는 세트 3개만 카드가 있어 안 씀 · TCG Pocket 뺌 · 2026-11-19 기준 한국 205세트 17,394장 / 일본 121세트 13,156장 / 영문 20시리즈 21,432장) — ✅ 2026-11-19 네트워크 허용됨 (클라우드 환경 'pokemon-cardbook': `api.tcgdex.net` · `pokemoncard.co.kr` · `www.pokemoncard.co.kr`). TCGdex 한국어: 세트 95개 · 카드 약 7,931장 (썬&문 SM1 ~ 스칼렛&바이올렛). 빠진 한국판 세트는 공식 사이트(pokemoncard.co.kr/main)로 보충. 일본판 · 영문판은 TCGdex.
2. ~~APK 크기 줄이기~~ (v0.4.0에서 함 · APK 는 arm64-v8a 만, AAB 는 전부)
3. 📷 카드 사진을 카드 모양에 딱 맞게 (사용자 2026-11-19: 폰 사진 비율이 카드와 달라 사진이 이상하게 찍힘) — 지금은 expo-image-picker 의 자르기 화면(63:88)에 의존. 할 것: ① 촬영 화면에 카드 모양 테두리(가이드) 띄우기 ② 카드 테두리를 자동으로 찾아 반듯하게 펴서 잘라 주기 (Google ML Kit 문서 스캐너 — 기울어지게 찍어도 사각형으로 펴 줌) ③ 결과를 63:88 로 맞춰 저장 · 글자 인식도 잘라낸 사진으로 (더 잘 읽힘). 확인할 것: 찍은 뒤 '자르기 화면'이 지금 뜨는지.
