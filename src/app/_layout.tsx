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
import { colors, isDark } from '@/theme';
import { UpdateProvider } from '@/update/UpdateContext';

export default function RootLayout() {
  // 🌙 폰 테마가 바뀌면 앱을 다시 불러와서 색을 맞춰요
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if ((colorScheme === 'dark') !== isDark) reloadAppAsync().catch(() => {});
    });
    return () => sub.remove();
  }, []);

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
                  headerTitleStyle: { fontWeight: '700' },
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
