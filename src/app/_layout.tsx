import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import { Jua_400Regular, useFonts } from '@expo-google-fonts/jua';
import { reloadAppAsync } from 'expo';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CelebrationProvider } from '@/celebrate/Celebration';
import { UpdateButton } from '@/components/UpdateBanner';
import { CollectionProvider } from '@/store/collection';
import { WishlistProvider } from '@/store/wishlist';
import { colors, fonts, isDark } from '@/theme';
import { UpdateProvider } from '@/update/UpdateContext';

export default function RootLayout() {
  // 🎨 동글동글 글꼴 (주아 · 고운돋움). 못 불러와도 앱은 기본 글꼴로 계속 떠요.
  const [loaded, error] = useFonts({ Jua_400Regular, GowunDodum_400Regular });
  // 🌙 폰 테마가 바뀌면 앱을 다시 불러와서 색을 맞춰요
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if ((colorScheme === 'dark') !== isDark) reloadAppAsync().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <UpdateProvider>
        <CollectionProvider>
          <WishlistProvider>
            <CelebrationProvider>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: colors.bg },
                  headerShadowVisible: false,
                  headerTintColor: colors.text,
                  headerTitleStyle: { fontFamily: fonts.title, fontSize: 21 },
                  contentStyle: { backgroundColor: colors.bg },
                  // 다른 화면에서는 오른쪽 위에 (왼쪽은 뒤로 가기)
                  headerRight: () => <UpdateButton />,
                }}
              >
                <Stack.Screen
                  name="index"
                  options={{ title: '카드 도감', headerLeft: () => <UpdateButton />, headerRight: undefined }}
                />
              </Stack>
            </CelebrationProvider>
          </WishlistProvider>
        </CollectionProvider>
      </UpdateProvider>
    </SafeAreaProvider>
  );
}
