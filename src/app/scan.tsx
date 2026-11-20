import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { cardVariants, isEditionId } from '@/data';
import { EDITIONS } from '@/data/labels';
import type { EditionId } from '@/data/types';
import { confidentPick, findCandidates, readText, type Candidate, type ReadInfo } from '@/scan/recognize';
import { useCollection, type OwnedEntry } from '@/store/collection';
import { pickPhoto, savePhoto, type PhotoSource, type PickedPhoto } from '@/store/photos';
import { colors } from '@/theme';

type Saved = {
  cand: Candidate;
  variant: ReturnType<typeof cardVariants>[number];
  prev: OwnedEntry | undefined;
  /** photo = 빈칸에 사진을 넣음 · count = 이미 사진이 있어 수량만 +1 */
  mode: 'photo' | 'count';
};

type State =
  | { step: 'idle' }
  | { step: 'reading'; photo: PickedPhoto }
  | {
      step: 'result';
      photo: PickedPhoto;
      info: ReadInfo;
      candidates: Candidate[];
      saved?: Saved;
      undone?: boolean;
      /** 글자 읽기가 실패했을 때 그 이유 (사진은 그대로 두고 직접 고르게) */
      ocrError?: string;
    }
  | { step: 'error'; where: string; message: string };

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function ScanScreen() {
  const params = useLocalSearchParams<{ edition?: string }>();
  const col = useCollection();
  const [edition, setEdition] = useState<EditionId>(isEditionId(params.edition) ? params.edition : 'ko');
  const [state, setState] = useState<State>({ step: 'idle' });
  const [count, setCount] = useState(0);
  const [query, setQuery] = useState('');

  const assign = async (photo: PickedPhoto, cand: Candidate): Promise<Saved> => {
    const variant = cardVariants(cand.card)[0];
    const prev = col.get(edition, cand.card.id, variant);
    if (prev?.photo) {
      // 이미 사진이 있는 카드 → 같은 카드를 한 장 더 가진 것으로
      col.setCount(edition, cand.card.id, variant, prev.count + 1);
      setCount((n) => n + 1);
      return { cand, variant, prev, mode: 'count' };
    }
    const file = await savePhoto(photo, `${edition}_${cand.card.id}_${variant}`);
    col.setPhoto(edition, cand.card.id, variant, file);
    setCount((n) => n + 1);
    return { cand, variant, prev, mode: 'photo' };
  };

  const scan = async (source: PhotoSource) => {
    // ① 사진 받기
    let photo: PickedPhoto | null;
    try {
      photo = await pickPhoto(source);
    } catch (e) {
      setState({ step: 'error', where: '사진 받기', message: errText(e) });
      return;
    }
    if (!photo) return;
    setState({ step: 'reading', photo });
    setQuery('');

    // ② 글자 읽기 — 실패해도 사진은 두고 직접 고르게
    let lines: string[] = [];
    let ocrError: string | undefined;
    try {
      lines = await readText(photo.uri, edition);
    } catch (e) {
      ocrError = errText(e);
    }
    const { info, candidates } = findCandidates(edition, lines);

    // ③ 확실하면 바로 저장
    const pick = confidentPick(candidates);
    let saved: Saved | undefined;
    if (pick) {
      try {
        saved = await assign(photo, pick);
      } catch (e) {
        setState({ step: 'error', where: '저장', message: errText(e) });
        return;
      }
    }
    setState({ step: 'result', photo, info, candidates, saved, ocrError });
  };

  /** 번호(예: 006/165, SV2a 006)나 이름으로 직접 찾기 */
  const search = (text: string) => {
    setQuery(text);
    if (state.step !== 'result' || state.saved) return;
    const t = text.trim();
    if (!t) return;
    const { candidates } = findCandidates(edition, [t], true);
    setState({ ...state, candidates });
  };

  const choose = async (cand: Candidate) => {
    if (state.step !== 'result') return;
    try {
      const saved = await assign(state.photo, cand);
      setState({ ...state, saved, undone: false });
    } catch (e) {
      setState({ step: 'error', where: '저장', message: errText(e) });
    }
  };

  const undo = () => {
    if (state.step !== 'result' || !state.saved) return;
    const { cand, variant, prev } = state.saved;
    col.restore(edition, cand.card.id, variant, prev);
    setCount((n) => Math.max(0, n - 1));
    setState({ ...state, saved: undefined, undone: true });
  };

  return (
    <>
      <Stack.Screen options={{ title: '카드 찍어서 넣기' }} />
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.editions}>
          {EDITIONS.map((ed) => (
            <Pressable
              key={ed.id}
              onPress={() => setEdition(ed.id)}
              style={[styles.edition, edition === ed.id && styles.editionActive]}
            >
              <Text style={[styles.editionText, edition === ed.id && { color: '#fff' }]}>
                {ed.flag} {ed.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {state.step === 'idle' ? (
          <Text style={styles.help}>
            카드 한 장을 화면에 꽉 차게 찍으면, 아래쪽 번호(예: 025/165)와 세트 코드를 읽어서 알맞은 칸에 자동으로
            넣어요. 밝은 곳에서 반사 없이 찍을수록 잘 읽혀요.
          </Text>
        ) : null}

        {state.step === 'reading' ? (
          <View style={styles.center}>
            <Image source={{ uri: state.photo.uri }} style={styles.photo} contentFit="cover" />
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.help}>카드 번호 읽는 중…</Text>
          </View>
        ) : null}

        {state.step === 'error' ? (
          <View style={styles.box}>
            <Text style={styles.boxTitle}>⚠️ {state.where} 중에 문제가 생겼어요</Text>
            <Text style={styles.help}>{state.message}</Text>
          </View>
        ) : null}

        {state.step === 'result' ? (
          <View style={styles.resultWrap}>
            <Image source={{ uri: state.photo.uri }} style={styles.photo} contentFit="cover" />
            <Text style={styles.readLine}>
              {state.info.number !== undefined
                ? `읽은 번호: ${state.info.number}${state.info.total ? ` / ${state.info.total}` : ''}`
                : '번호를 읽지 못했어요'}
            </Text>

            {state.saved ? (
              <View style={[styles.box, styles.okBox]}>
                <Text style={styles.boxTitle}>
                  ✅ {state.saved.cand.set.code ?? state.saved.cand.set.name} {state.saved.cand.card.number}{' '}
                  {state.saved.cand.card.name}
                </Text>
                <Text style={styles.help}>
                  {state.saved.mode === 'photo'
                    ? '빈칸에 이 사진을 넣었어요.'
                    : `이미 사진이 있어서 수량만 늘렸어요 (${(state.saved.prev?.count ?? 0) + 1}장).`}
                </Text>
                <View style={styles.row}>
                  <SmallBtn label="되돌리기" onPress={undo} />
                  <SmallBtn
                    label="카드 보기"
                    onPress={() =>
                      router.push({
                        pathname: '/[edition]/card/[cardId]',
                        params: { edition, cardId: state.saved!.cand.card.id },
                      })
                    }
                  />
                </View>
              </View>
            ) : (
              <View style={styles.box}>
                <Text style={styles.boxTitle}>
                  {state.undone
                    ? '되돌렸어요. 맞는 카드를 고르거나 다시 찍어 주세요.'
                    : state.candidates.length
                      ? '어떤 카드인가요? 골라 주세요'
                      : '맞는 카드를 찾지 못했어요'}
                </Text>
                {state.ocrError ? (
                  <Text style={styles.help}>
                    글자를 읽지 못했어요 ({state.ocrError}). 아래에 번호를 적어 찾아 주세요.
                  </Text>
                ) : null}
                <TextInput
                  value={query}
                  onChangeText={search}
                  placeholder="번호나 이름으로 찾기 (예: 006/165, SV2a 006, 피카츄)"
                  placeholderTextColor={colors.sub}
                  style={styles.input}
                  autoCorrect={false}
                />
                {state.candidates.map((c) => (
                  <Pressable
                    key={c.card.id}
                    style={({ pressed }) => [styles.cand, pressed && { opacity: 0.6 }]}
                    onPress={() => choose(c)}
                  >
                    <Text style={styles.candTitle}>
                      {c.set.code ?? c.set.name} · {c.card.number} {c.card.name}
                    </Text>
                    <Text style={styles.candSub}>
                      {c.series.name} · 맞은 것: {c.reasons.join(', ')}
                    </Text>
                  </Pressable>
                ))}
                <SmallBtn
                  label="세트에서 직접 고르기"
                  onPress={() => router.push({ pathname: '/[edition]', params: { edition } })}
                />
                {state.info.text ? (
                  <Text style={styles.raw} numberOfLines={4}>
                    읽은 글자: {state.info.text}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.row}>
          <BigBtn
            label={state.step === 'result' ? '📷 다음 카드 찍기' : '📷 카드 찍기'}
            primary
            disabled={state.step === 'reading'}
            onPress={() => scan('camera')}
          />
          <BigBtn label="🖼️ 앨범에서" disabled={state.step === 'reading'} onPress={() => scan('library')} />
        </View>
        {count > 0 ? <Text style={styles.count}>이번에 넣은 카드 {count}장</Text> : null}
      </ScrollView>
    </>
  );
}

function BigBtn({
  label,
  onPress,
  primary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.big, primary && styles.bigPrimary, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[styles.bigText, primary && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function SmallBtn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.small, pressed && { opacity: 0.6 }]}>
      <Text style={styles.smallText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 14, paddingBottom: 40 },
  editions: { flexDirection: 'row', gap: 6 },
  edition: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  editionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  editionText: { fontSize: 14, fontWeight: '700', color: colors.text },
  help: { fontSize: 13, color: colors.sub, lineHeight: 20 },
  center: { alignItems: 'center', gap: 10 },
  resultWrap: { gap: 10, alignItems: 'center' },
  photo: { width: 180, height: 180 * (88 / 63), borderRadius: 10, backgroundColor: colors.line },
  readLine: { fontSize: 13, color: colors.sub },
  box: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: 12, padding: 14, gap: 8 },
  okBox: { borderWidth: 2, borderColor: colors.owned },
  boxTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cand: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.line, gap: 2 },
  candTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  candSub: { fontSize: 12, color: colors.sub },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  raw: { fontSize: 11, color: colors.sub, marginTop: 4 },
  row: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  big: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  bigPrimary: { backgroundColor: colors.accent, borderColor: colors.accent },
  bigText: { fontSize: 16, fontWeight: '700', color: colors.text },
  small: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
  },
  smallText: { fontSize: 14, fontWeight: '600', color: colors.text },
  count: { textAlign: 'center', fontSize: 13, color: colors.owned, fontWeight: '700' },
});
