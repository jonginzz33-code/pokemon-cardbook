import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { UpdateButton } from '@/components/UpdateBanner';
import { CollectionProvider } from '@/store/collection';
import { colors } from '@/theme';
import { UpdateProvider } from '@/update/UpdateContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <UpdateProvider>
        <CollectionProvider>
          <StatusBar style="dark" />
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
        </CollectionProvider>
      </UpdateProvider>
    </SafeAreaProvider>
  );
}
