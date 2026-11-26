import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomBar, BOTTOM_BAR_SPACE } from '@/components/BottomBar';
import { ProgressRing } from '@/components/ProgressBar';
import { getEdition, isEditionId } from '@/data';
import { editionLabel } from '@/data/labels';
import type { CardSet, EditionId } from '@/data/types';
import { useCollection } from '@/store/collection';
import { colors, fonts, softCard, stampTints } from '@/theme';

// 🗂️ 세트 목록 정렬 · 거르기 (메모 11)
type Sort = 'new' | 'owned' | 'percent' | 'old' | 'name';
type Kind = 'all' | 'pack' | 'deck' | 'promo';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'new', label: '최신순' },
  { id: 'owned', label: '내 카드 많은 순' },
  { id: 'percent', label: '수집률 높은 순' },
  { id: 'old', label: '오래된 순' },
  { id: 'name', label: '이름순' },
];
const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'pack', label: '확장팩' },
  { id: 'deck', label: '스타터 · 덱' },
  { id: 'promo', label: '프로모' },
];
const VIEW_KEY = 'cardbook.editionView.v1';

function kindOf(set: CardSet): Exclude<Kind, 'all'> {
  const n = set.name;
  const c = set.code ?? '';
  if (/프로모|プロモ|promo/i.test(n) || /(^|-)P$/.test(c)) return 'promo';
  if (
    /스타터|스타트|덱|デッキ|スターター|starter|deck|trainer kit|battle academy|box|박스|ボックス|세트|セット/i.test(n)
  )
    return 'deck';
  return 'pack';
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·・「」『』\-_&＆]/g, '');

export default function EditionScreen() {
  const { edition } = useLocalSearchParams<{ edition: string }>();
  const col = useCollection();
  const insets = useSafeAreaInsets();
  const [sort, setSort] = useState<Sort>('new');
  const [kind, setKind] = useState<Kind>('all');
  const [onlyOwned, setOnlyOwned] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // 고른 정렬 · 거르기는 폰에 기억
  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY)
      .then((raw) => {
        if (!raw) return;
        const v = JSON.parse(raw) as { sort?: Sort; kind?: Kind; onlyOwned?: boolean };
        if (v.sort) setSort(v.sort);
        if (v.kind) setKind(v.kind);
        if (typeof v.onlyOwned === 'boolean') setOnlyOwned(v.onlyOwned);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(VIEW_KEY, JSON.stringify({ sort, kind, onlyOwned })).catch(() => {});
  }, [sort, kind, onlyOwned, loaded]);

  const valid = isEditionId(edition);
  const data = valid ? getEdition(edition) : null;

  const sections = useMemo(() => {
    if (!data || !valid) return [];
    const ed = edition as EditionId;
    const q = norm(query.trim());
    type Row = { set: CardSet; series: string; owned: number; total: number; order: number };
    const rows: Row[] = [];
    let order = 0;
    for (const s of data.series) {
      for (const set of s.sets) {
        const p = col.setProgress(ed, set);
        rows.push({ set, series: s.name, owned: p.owned, total: p.total, order: order++ });
      }
    }
    const shown = rows.filter((r) => {
      if (onlyOwned && r.owned === 0) return false;
      if (kind !== 'all' && kindOf(r.set) !== kind) return false;
      if (q && !norm(`${r.set.code ?? ''}${r.set.name}`).includes(q)) return false;
      return true;
    });

    // 최신순 · 오래된 순은 시리즈로 묶고, 나머지는 한 줄로
    if ((sort === 'new' || sort === 'old') && !q) {
      const groups: { key: string; title: string; data: Row[]; ownedSum: number }[] = [];
      for (const r of shown) {
        let g = groups.find((x) => x.title === r.series);
        if (!g) {
          g = { key: r.series, title: r.series, data: [], ownedSum: 0 };
          groups.push(g);
        }
        g.data.push(r);
        g.ownedSum += r.owned;
      }
      if (sort === 'old') {
        groups.reverse();
        groups.forEach((g) => g.data.reverse());
      }
      return groups;
    }
    const sorted = [...shown].sort((a, b) => {
      if (sort === 'owned') return b.owned - a.owned || a.order - b.order;
      if (sort === 'percent') return b.owned / b.total - a.owned / a.total || b.owned - a.owned || a.order - b.order;
      if (sort === 'name') return a.set.name.localeCompare(b.set.name, 'ko');
      if (sort === 'old') return b.order - a.order;
      return a.order - b.order;
    });
    return [{ key: 'flat', title: q ? `찾은 세트 ${sorted.length}개` : '', data: sorted, ownedSum: 0 }];
  }, [data, valid, edition, col, sort, kind, onlyOwned, query]);

  if (!valid || !data) return <Text style={{ padding: 16, color: colors.text }}>알 수 없는 판이에요.</Text>;
  const ed = edition as EditionId;
  const grouped = sections.length > 0 && sections[0].key !== 'flat';
  // 처음엔 맨 위 시리즈만 펼침
  const isOpen = (key: string, i: number) => (open[key] ?? i === 0) || !!query.trim();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: editionLabel(ed) }} />
      <SectionList
        sections={sections.map((s, i) => ({
          ...s,
          data: grouped && !isOpen(s.key, i) ? [] : s.data,
          index: i,
          all: s.data.length,
        }))}
        keyExtractor={(r) => r.set.id}
        contentContainerStyle={[styles.wrap, { paddingBottom: BOTTOM_BAR_SPACE + insets.bottom }]}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="🔎 세트 이름이나 코드로 찾기 (예: SV5K, 와일드)"
              placeholderTextColor={colors.sub}
              style={styles.input}
              autoCorrect={false}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {SORTS.map((o) => (
                <Chip key={o.id} label={o.label} active={sort === o.id} onPress={() => setSort(o.id)} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip
                label={onlyOwned ? '✓ 내 카드 있는 세트만' : '내 카드 있는 세트만'}
                active={onlyOwned}
                onPress={() => setOnlyOwned((v) => !v)}
              />
              {KINDS.map((o) => (
                <Chip key={o.id} label={o.label} active={kind === o.id} onPress={() => setKind(o.id)} soft />
              ))}
            </ScrollView>
            {sections.every((s) => s.data.length === 0) ? (
              <Text style={styles.empty}>
                {onlyOwned
                  ? '아직 카드를 넣은 세트가 없어요. 카드를 찍어서 넣어 보세요.'
                  : '조건에 맞는 세트가 없어요.'}
              </Text>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            grouped ? (
              <Pressable
                onPress={() => setOpen((o) => ({ ...o, [section.key]: !isOpen(section.key, section.index) }))}
                style={styles.seriesRow}
              >
                <Text style={styles.series}>
                  {isOpen(section.key, section.index) ? '▾' : '▸'} {section.title}{' '}
                  <Text style={styles.seriesCount}>
                    · 세트 {section.all}개{section.ownedSum ? ` · 내 카드 ${section.ownedSum}장` : ''}
                  </Text>
                </Text>
              </Pressable>
            ) : (
              <Text style={styles.series}>{section.title}</Text>
            )
          ) : null
        }
        renderItem={({ item: r }) => {
          const tint = stampTints[r.order % stampTints.length];
          const pct = r.total ? Math.round((r.owned / r.total) * 100) : 0;
          return (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/[edition]/set/[setId]', params: { edition: ed, setId: r.set.id } })
              }
              style={({ pressed }) => [styles.set, pressed && { opacity: 0.75 }]}
            >
              <View style={[styles.stamp, { backgroundColor: tint.soft, borderColor: tint.ring }]}>
                <Text style={[styles.stampText, { color: tint.ink }]} numberOfLines={1} adjustsFontSizeToFit>
                  {r.set.code || r.set.name.slice(0, 2)}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.setName} numberOfLines={2}>
                  {r.set.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[
                    r.set.releaseDate ? r.set.releaseDate : r.set.year ? `${r.set.year}년` : null,
                    `${r.owned} / ${r.total}장`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <ProgressRing owned={r.owned} total={r.total} size={50} color={tint.ring} label={`${pct}%`} />
            </Pressable>
          );
        }}
      />
      <BottomBar edition={ed} />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  soft,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  soft?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && (soft ? styles.chipSoft : styles.chipActive)]}>
      <Text
        style={[
          styles.chipText,
          active && !soft && { color: colors.onAccent },
          active && soft && { color: colors.accent },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 4, gap: 10 },
  input: {
    borderWidth: 2,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  chips: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipSoft: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.text, fontFamily: fonts.title },
  empty: { color: colors.sub, textAlign: 'center', marginTop: 20, lineHeight: 20, fontFamily: fonts.body },
  seriesRow: { marginTop: 12, marginBottom: 2 },
  series: { fontSize: 18, fontFamily: fonts.title, color: colors.text, marginTop: 6, marginLeft: 4 },
  seriesCount: { fontSize: 12, fontFamily: fonts.body, color: colors.sub },
  set: { ...softCard, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  stamp: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    transform: [{ rotate: '-4deg' }],
  },
  stampText: { fontFamily: fonts.title, fontSize: 15 },
  setName: { fontSize: 15, fontFamily: fonts.title, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.body, color: colors.sub },
});
