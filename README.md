# 카드 도감 (pokemon-cardbook)

내가 가진 포켓몬 카드를 판별·세트별로 기록하는 Android 앱입니다. Expo(React Native)로 만들었습니다.

- 전체 카드 목록에서 **없는 카드는 `?` 카드 뒷면**으로 보입니다.
- 가진 카드를 **직접 사진 찍어 올리면** 그 자리에 내 사진이 들어갑니다.
- 사진과 기록은 **이 폰에만** 저장됩니다. 서버는 쓰지 않습니다.
- **📷 카드 찍어서 넣기**: 사진에서 카드 번호(`025/165`)와 세트 코드(`SV2a`, `MEW`)를 읽어 알맞은 칸에 자동으로 넣습니다.
  - 글자 읽기는 폰 안에서 Google ML Kit(`expo-text-extractor`)으로 합니다. 인터넷이 필요 없고 사진을 밖으로 보내지 않습니다. 처음 한 번은 Play 서비스가 인식 모델을 받을 수 있습니다.
  - 번호와 함께 총장수·세트 코드·이름 중 하나가 더 맞고 후보가 하나뿐이면 자동으로 넣습니다. 아니면 후보를 보여주고 고르게 합니다.
  - 이미 사진이 있는 카드면 수량만 +1. 넣은 직후 '되돌리기' 가능.
  - 영문·숫자만 읽어서 한국어·일본어 카드 이름은 인식에 쓰지 않고 번호·세트 코드로 찾습니다.
- 공식 카드 이미지는 쓰지 않습니다. 이름, 번호, 레어도 같은 정보만 씁니다.

## 분류 구조

```
판 (한국판 / 일본판 / 영문판)
 └ 시리즈 (스칼렛&바이올렛, 소드&실드 …)      ← 최신순
    └ 세트 (SV2a 151, MEW 151 …)               ← 최신순, 세트 코드·발매일·수집률
       └ 카드 (번호 · 이름 · 레어도 · 타입)      ← 보유/미보유, 레어도 필터
          └ 버전 (일반 / 리버스 홀로 / 1st 에디션 / 섀도리스 …)
```

- 같은 카드라도 **버전마다 사진과 수량을 따로** 기록합니다.
- 세트 수집률은 카드 종류 기준입니다. 버전 중 하나라도 가지고 있으면 보유로 칩니다.

## 폴더

| 경로 | 내용 |
| --- | --- |
| `src/app/` | 화면. 홈 → `[edition]` 시리즈·세트 → `set/[setId]` 카드 그리드 → `card/[cardId]` 상세 |
| `src/data/editions/*.json` | 판별 카드 목록 (지금은 **샘플**) |
| `src/data/types.ts` | 데이터 구조 |
| `src/store/collection.tsx` | 보유 기록 (AsyncStorage) |
| `src/scan/recognize.ts` | 사진 글자 읽기, 번호·세트 코드로 카드 후보 찾기 |
| `src/app/scan.tsx` | 카드 찍어서 넣기 화면 |
| `src/store/photos.ts` | 사진 찍기, 카드 비율로 자르기, 줄여서 앱 폴더에 저장 |
| `src/components/CardBack.tsx` | `?` 카드 뒷면 (앱 자체 디자인) |
| `scripts/fetch-tcgdex.mjs` | 전체 카드 목록 수집 스크립트 |

## 카드 데이터

| 판 | 출처 | 2026-11-19 기준 | 다시 받기 |
| --- | --- | --- | --- |
| 한국판 | 포켓몬코리아 공식 카드 검색 상세 페이지 | 205세트 · 17,394장 (DP 2010 ~ MEGA 2026) | `NODE_USE_ENV_PROXY=1 node scripts/fetch-kr-official.mjs` |
| 일본판 | 일본 공식 카드 검색 (DP 이후) + TCGdex (DP 이전) | 357세트 · 25,714장 | `NODE_USE_ENV_PROXY=1 node scripts/fetch-jp-official.mjs` |
| 영문판 | TCGdex (TCG Pocket 제외) | 21,432장 | `node scripts/fetch-tcgdex.mjs en` |

- TCGdex 한국어는 카드 목록이 있는 세트가 3개뿐이라 한국판은 공식 사이트를 씁니다. 천천히(동시 6~8개, 요청마다 쉼) 받고, 받은 세트는 `.cache/kr-official/` 에 남겨 다시 돌리면 새 세트만 받습니다.
- 카드 이미지는 받지 않습니다.

## 실행과 빌드

```bash
npm install
npm start          # Expo 개발 서버
npm run typecheck
```

## 앱 안 업데이트 (화장실 앱과 같은 방식)

- APK판은 앱을 켤 때 GitHub Releases `latest` 본문의 `versionCode=N` 과 내 빌드 번호를 비교합니다. 새 버전이면 홈 맨 위에 **🆕 새 버전이 있어요 → 지금 업데이트**가 뜨고, `cardbook.apk` 를 받아 안드로이드 설치 화면을 엽니다 (`src/update/updater.ts`).
- 홈 맨 아래 '버전 … · 업데이트 확인'을 눌러 손으로 확인할 수도 있습니다.
- 플레이 스토어용 AAB 는 `STORE_BUILD=1` 로 따로 만들어 앱 안 업데이트와 `REQUEST_INSTALL_PACKAGES` 권한을 뺍니다 (스토어 정책).

## 빌드와 플레이 스토어 자동 올리기

`.github/workflows/build.yml` (조과기록·화장실 앱과 같은 방식)

| 언제 | 무엇을 |
| --- | --- |
| 아무 브랜치에 올릴 때 | APK → Actions 실행 화면 Artifacts `Cardbook-apk` |
| `main` 에 올리거나 Actions 탭에서 손으로 실행 | 위 + Releases `latest` 에 **`cardbook.apk`**(폰에서 바로 설치) + 업로드 키로 서명한 AAB |
| 저장소 변수 `PLAY_UPLOAD` = `true` 일 때만 | 플레이 콘솔 자동 업로드 (지금은 꺼 둠 — APK 직접 설치로 먼저 테스트) |

- 버전 번호(versionCode)는 워크플로 실행 번호라 올릴 때마다 자동으로 커집니다. 화면에 보이는 버전 이름은 `app.json` 의 `version`.
- 업로드 키: `keystore/play-upload.p12.enc` (AES-256 · pbkdf2 200000, 별칭 `upload`). 비밀값 `PLAY_KEY_PASS` 로 풀어서 `plugins/withPlaySigning.js` 가 release 빌드에 서명합니다.
  - 업로드 키 SHA-1 `9F:B1:6E:D7:CD:54:BF:41:AC:7A:CF:E6:C7:24:37:CC:FD:74:3E:9A`
- 플레이 콘솔: 비밀값 `PLAY_SERVICE_ACCOUNT_JSON`. 기본은 내부 테스트(`internal`). 저장소 변수 `PLAY_TRACK` 을 `alpha` 로 두면 비공개 테스트로 올라갑니다.
- 패키지 이름: `com.jonginzz.cardbook` (한 번 스토어에 올리면 바꿀 수 없음)
- 올리기 글(이번에 바뀐 것): `store/whatsnew/whatsnew-ko-KR` (500자 이내)

### 처음 한 번만 사람이 할 일
1. GitHub 저장소 Settings → Secrets → Actions 에 `PLAY_KEY_PASS`, `PLAY_SERVICE_ACCOUNT_JSON` 추가
2. 플레이 콘솔에서 앱 만들기 (패키지 `com.jonginzz.cardbook`)
3. 첫 AAB 는 Releases `latest` 에서 받아 플레이 콘솔 내부 테스트에 **직접** 올리기 (Google 정책상 첫 업로드는 손으로)
4. 플레이 콘솔 '사용자 및 권한'에 서비스 계정 메일을 이 앱 권한으로 추가
