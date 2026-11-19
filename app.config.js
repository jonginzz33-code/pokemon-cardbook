// app.json 에 더해:
//  - GitHub 빌드가 넘겨주는 VERSION_CODE 로 Android 버전 번호를 매번 올립니다.
//    (플레이 스토어도, 앱 안 업데이트도 이 번호가 커져야 새 버전으로 봅니다.)
//  - STORE_BUILD=1 이면 플레이 스토어용: 앱 안 업데이트와 'APK 설치' 권한을 뺍니다.
const store = process.env.STORE_BUILD === '1';

module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.VERSION_CODE) || config.android.versionCode,
    permissions: [...(config.android.permissions ?? []), ...(store ? [] : ['REQUEST_INSTALL_PACKAGES'])],
  },
  extra: { ...config.extra, selfUpdate: !store },
});
