import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CardFace } from '@/components/CardFace';
import { getEdition, isEditionId } from '@/data';
import { EDITIONS } from '@/data/labels';
import type { Card, CardSet, EditionId } from '@/data/types';
import { useCollection } from '@/store/collection';
import { colors } from '@/theme';

// 🔍 전체 카드 검색 (메모 13): 판 안의 모든 세트에서 이름 · 번호 · 세트 코드로
type Hit = { card: Card; set: CardSet; score: number };
const norm = (s: string) => s.toLowerCase().replace(/[\s·・「」\-_.'’]/g, '');
const LIMIT = 80;

function search(edition: EditionId, raw: string): Hit[] {
  const q = raw.trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  // "SV2a 006" · "006/165" · "006" 같은 번호
  const numMatch = /(\d{1,3})(?:\s*\/\s*(\d{2,3}))?\s*$/.exec(q);
  const num = numMatch ? parseInt(numMatch[1], 10) : undefined;
  const total = numMatch?.[2] ? parseInt(numMatch[2], 10) : undefined;
  const codeWord =
    words.length > 1
      ? words[0].toLowerCase()
      : /^[a-z]/i.test(q) && num !== undefined
        ? q.replace(/\s*\d.*$/, '').toLowerCase()
        : undefined;
  const nameQ = norm(q.replace(/(\d{1,3})(\s*\/\s*\d{2,3})?\s*$/, ''));

  const hits: Hit[] = [];
  for (const s of getEdition(edition).series) {
    for (const set of s.sets) {
      const code = (set.code ?? '').toLowerCase();
      const codeOk = codeWord ? code === codeWord : true;
      for (const card of set.cards) {
        let score = 0;
        const name = norm(card.name);
        if (nameQ && name.includes(nameQ)) score += name === nameQ ? 6 : name.startsWith(nameQ) ? 4 : 3;
        if (num !== undefined && parseInt(card.number, 10) === num) {
          if (codeWord && codeOk) score += 6;
          else if (total !== undefined && set.officialCount === total) score += 4;
          else if (!nameQ && !codeWord) score += 1;
        }
        if (!nameQ && codeWord && !codeOk) score = 0;
        if (score > 0) hits.push({ card, set, score });
      }
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, LIMIT);
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ edition?: string }>();
  const [edition, setEdition] = useState<EditionId>(isEditionId(params.edition) ? params.edition : 'ko');
  const [q, setQ] = useState('');
  const col = useCollection();
  const hits = useMemo(() => search(edition, q), [edition, q]);

  return (
    <>
      <Stack.Screen options={{ title: '카드 검색' }} />
      <FlatList
        data={hits}
        keyExtractor={(h) => h.card.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.wrap}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <View style={styles.editions}>
              {EDITIONS.map((ed) => (
                <Pressable
                  key={ed.id}
                  onPress={() => setEdition(ed.id)}
                  style={[styles.edition, edition === ed.id && styles.editionActive]}
                >
                  <Text style={[styles.editionText, edition === ed.id && { color: colors.onAccent }]}>
                    {ed.flag} {ed.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus
              placeholder="이름이나 번호 (예: 리자몽, SV2a 006, 055/071)"
              placeholderTextColor={colors.sub}
              style={styles.input}
              autoCorrect={false}
            />
            <Text style={styles.hint}>
              {q.trim()
                ? hits.length >= LIMIT
                  ? `많이 나와서 ${LIMIT}개까지만 보여요. 더 자세히 적어 보세요.`
                  : `${hits.length}장 찾았어요`
                : '모든 세트에서 찾아요'}
            </Text>
          </View>
        }
        renderItem={({ item: h }) => {
          const owned = col.isOwned(edition, h.card);
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/[edition]/card/[cardId]', params: { edition, cardId: h.card.id } })
              }
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <CardFace card={h.card} width={44} owned={owned} photo={col.coverPhoto(edition, h.card)} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {h.card.name}
                  {h.card.rarity ? <Text style={styles.rarity}> {h.card.rarity}</Text> : null}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {h.set.code ? `${h.set.code} · ` : ''}
                  {h.card.number}
                  {h.set.officialCount ? `/${h.set.officialCount}` : ''} · {h.set.name}
                </Text>
              </View>
              <Text style={[styles.mark, owned && { color: colors.owned }]}>{owned ? '보유' : ''}</Text>
            </Pressable>
          );
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, gap: 8, paddingBottom: 40 },
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
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  hint: { fontSize: 12, color: colors.sub },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
  },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  rarity: { fontSize: 12, color: colors.accent, fontWeight: '800' },
  sub: { fontSize: 12, color: colors.sub },
  mark: { fontSize: 12, fontWeight: '800', color: colors.sub },
});
