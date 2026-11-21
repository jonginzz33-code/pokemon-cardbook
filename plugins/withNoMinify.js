// release 빌드에서 R8 코드 줄이기(minify)를 끕니다.
// Expo SDK 58 템플릿은 android.enableMinifyInReleaseBuilds=true 로 켜 두는데,
// 이게 Google ML Kit(글자 인식 · 카드 촬영) 코드를 망가뜨려
// InputImage 를 만들 때 'getClass() on a null object reference' 오류가 났어요 (메모 8).
const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withNoMinify(config) {
  return withGradleProperties(config, (cfg) => {
    const set = (key, value) => {
      const item = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (item) item.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    };
    set('android.enableMinifyInReleaseBuilds', 'false');
    set('android.enableShrinkResourcesInReleaseBuilds', 'false');
    return cfg;
  });
};
