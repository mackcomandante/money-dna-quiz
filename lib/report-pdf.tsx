import 'server-only';
import { Children } from 'react';
import path from 'node:path';
import { Document, Font, Image, Link, Page, StyleSheet, Text, View, renderToBuffer, type Styles } from '@react-pdf/renderer';
import { TYPES, TYPE_ORDER, type TypeKey } from './quiz-data';
import { percentages, type Scores } from './scoring';
import { BOOK_INTRO, LOWEST_SCORE_HINT, READING_RESULTS, REPORTS, TRAIT_LABELS, TYPE_AXES } from './report-content';

// Assets live in public/report so they ship with the standalone Docker image.
const ASSETS = path.join(process.cwd(), 'public', 'report');
const font = (f: string) => path.join(ASSETS, 'fonts', f);

Font.register({
  family: 'DM Sans',
  fonts: [
    { src: font('DMSans-400-normal.woff'), fontWeight: 400 },
    { src: font('DMSans-400-italic.woff'), fontWeight: 400, fontStyle: 'italic' },
    { src: font('DMSans-500-normal.woff'), fontWeight: 500 },
    { src: font('DMSans-700-normal.woff'), fontWeight: 700 },
  ],
});
Font.register({
  family: 'Bricolage',
  fonts: [
    { src: font('Bricolage-700.woff'), fontWeight: 700 },
    { src: font('Bricolage-800.woff'), fontWeight: 800 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const C = {
  ink: '#0F1B2D', text: '#1E2B3D', soft: '#3A4A60', muted: '#6B7A8F', line: '#E3E8EF', panel: '#F4F6F9',
  navySoft: '#C9D4E3', navyMuted: '#8796AB', amber: '#F5B841',
};
// Darker shades of each type colour for text on white, plus a light tint for panels.
const SHADE: Record<TypeKey, { deep: string; tint: string }> = {
  D: { deep: '#C4472A', tint: '#FDEDE8' },
  I: { deep: '#9C6B00', tint: '#FEF5E0' },
  S: { deep: '#18806C', tint: '#E3F6F1' },
  C: { deep: '#3563C9', tint: '#E9F0FD' },
};

const s = StyleSheet.create({
  page: { backgroundColor: '#FFFFFF', color: C.text, fontFamily: 'DM Sans', fontSize: 10.5, lineHeight: 1.55, paddingTop: 64, paddingBottom: 64, paddingHorizontal: 54 },
  header: { position: 'absolute', top: 26, left: 54, right: 54, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, letterSpacing: 1.2, color: C.muted, textTransform: 'uppercase' },
  footer: { position: 'absolute', top: 806, left: 54, right: 54, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: C.muted },
  kicker: { fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 },
  h1: { fontFamily: 'Bricolage', fontWeight: 800, fontSize: 30, lineHeight: 1.1, color: C.ink },
  h2: { fontFamily: 'Bricolage', fontWeight: 800, fontSize: 21, lineHeight: 1.15, color: C.ink, marginBottom: 10 },
  h3: { fontFamily: 'Bricolage', fontWeight: 700, fontSize: 12.5, color: C.ink, marginBottom: 2 },
  p: { marginBottom: 8 },
  section: { marginTop: 22 },
  rule: { height: 1, backgroundColor: C.line, marginVertical: 18 },
  panel: { backgroundColor: C.panel, borderRadius: 10, padding: 14 },
  row: { flexDirection: 'row' },
});

function Section({ k, kicker, title, children, first }: { k: TypeKey; kicker: string; title: string; children: React.ReactNode; first?: boolean }) {
  // Keep the heading on the same page as the first block that follows it.
  const [lead, ...rest] = Children.toArray(children);
  return (
    <View style={first ? undefined : s.section}>
      <View wrap={false}>
        <Text style={[s.kicker, { color: SHADE[k].deep }]}>{kicker}</Text>
        <Text style={s.h2}>{title}</Text>
        {lead}
      </View>
      {rest}
    </View>
  );
}

function Para({ children, style }: { children: React.ReactNode; style?: Styles[string] }) {
  return <Text style={style ? [s.p, style] : s.p}>{children}</Text>;
}

/** Numbered or titled item with a coloured marker on the left. */
function Item({ k, marker, title, text }: { k: TypeKey; marker: string; title: string; text: string }) {
  return (
    <View style={[s.row, { marginBottom: 10 }]} wrap={false}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: SHADE[k].tint, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: 700, color: SHADE[k].deep }}>{marker}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.h3}>{title}</Text>
        <Text>{text}</Text>
      </View>
    </View>
  );
}

function Chrome({ name }: { name: string }) {
  return (
    <>
      <View style={s.header} fixed>
        <Text>Money DNA · Full report</Text>
        <Text>{name}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text>Adapted from Money DNA by Mack Comandante · Exoasia</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </>
  );
}

const capitalise = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

function rankTypes(scores: Scores): TypeKey[] {
  return [...TYPE_ORDER].sort((a, b) => scores[b] - scores[a] || TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b));
}

/** Applies the book's "Reading your results" rules to one set of scores (each out of 20). */
export function readResult(primary: TypeKey, scores: Scores) {
  const ranked = rankTypes(scores);
  const top = scores[primary];
  const secondary = ranked[1];
  const lowest = ranked[ranked.length - 1];
  const strength = top >= 10 ? 'a strong preference' : top >= 6 ? 'a clear lean' : 'a light lean';
  const isBlend = top - scores[secondary] <= 3;
  const named = READING_RESULTS.blends.find((b) => b.types.includes(primary) && b.types.includes(secondary));
  // Balanced: any three types within 2 points of each other (ranked is sorted, so check each window of three).
  const balanced = [0, 1].some((i) => scores[ranked[i]] - scores[ranked[i + 2]] <= 2);
  return { ranked, top, secondary, lowest, strength, isBlend, named, balanced };
}

export interface ReportInput { primary: TypeKey; scores: Scores; date?: Date; name?: string | null }

function ReportDocument({ primary, scores, date = new Date(), name }: ReportInput) {
  const k = primary;
  const t = TYPES[k];
  const r = REPORTS[k];
  const ax = TYPE_AXES[k];
  const pct = percentages(scores);
  const rr = readResult(k, scores);
  const first = (name || '').trim().split(/\s+/)[0] || '';
  const dateLabel = date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const hermes = 'https://hermes.exoasia.org/?utm_source=money-dna-quiz&utm_medium=pdf-report';

  return (
    <Document title={`Money DNA Full Report: ${t.name}`} author="Mack Comandante" subject="Money DNA Full Report" creator="Money DNA Quiz · Exoasia">
      {/* Cover */}
      <Page size="A4" style={{ backgroundColor: C.ink, color: '#FFFFFF', fontFamily: 'DM Sans', padding: 48 }}>
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 26 }]}>
          <Text style={{ fontFamily: 'Bricolage', fontWeight: 800, fontSize: 15 }}>Money DNA</Text>
          <Text style={{ fontSize: 8.5, letterSpacing: 1.4, color: C.navyMuted, textTransform: 'uppercase', marginTop: 4 }}>Full report</Text>
        </View>
        <Image src={path.join(ASSETS, 'avatars', `${k}.jpg`)} style={{ width: 499, height: 380, objectFit: 'cover', borderRadius: 18 }} />
        <View style={{ marginTop: 30 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.6, color: t.color, textTransform: 'uppercase' }}>{name ? `${name}'s Money DNA · ${k}` : `Your Money DNA · ${k}`}</Text>
          <Text style={{ fontFamily: 'Bricolage', fontWeight: 800, fontSize: 44, lineHeight: 1.05, marginTop: 6 }}>{t.name}</Text>
          <Text style={{ fontSize: 14, fontStyle: 'italic', color: C.navySoft, marginTop: 12, lineHeight: 1.45 }}>&ldquo;{r.tagline}&rdquo;</Text>
        </View>
        <View style={{ position: 'absolute', left: 48, right: 48, bottom: 44, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#24364F', paddingTop: 12 }}>
          <Text style={{ fontSize: 8.5, color: C.navyMuted }}>{name ? `Prepared for ${name} · ${dateLabel}` : `Prepared ${dateLabel}`}</Text>
          <Text style={{ fontSize: 8.5, color: C.navyMuted }}>Adapted from Money DNA by Mack Comandante</Text>
        </View>
      </Page>

      {/* About the book */}
      <Page size="A4" style={s.page}>
        <Chrome name={name ? `${name} · ${t.name}` : t.name} />
        <Text style={[s.kicker, { color: SHADE[k].deep }]}>Introduction</Text>
        <Text style={[s.h1, { marginBottom: 14 }]}>{BOOK_INTRO.title}</Text>
        {BOOK_INTRO.paragraphs.map((p, n) => <Para key={n}>{p}</Para>)}

        <View style={{ marginTop: 10, borderWidth: 1, borderColor: C.line, borderRadius: 10 }}>
          <View style={[s.row, { backgroundColor: C.panel, paddingVertical: 7, paddingHorizontal: 12, borderTopLeftRadius: 10, borderTopRightRadius: 10 }]}>
            {['Type', 'Pace · Focus', 'Money means', 'Core fear'].map((h, n) => (
              <Text key={h} style={{ flex: n === 0 ? 1.15 : 1, fontSize: 8, fontWeight: 700, letterSpacing: 0.8, color: C.muted, textTransform: 'uppercase' }}>{h}</Text>
            ))}
          </View>
          {TYPE_ORDER.map((tk) => (
            <View key={tk} style={[s.row, { paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: tk === k ? SHADE[tk].tint : '#FFFFFF' }]}>
              <View style={[s.row, { flex: 1.15, alignItems: 'center' }]}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: TYPES[tk].color, marginRight: 6 }} />
                <Text style={{ fontWeight: 700, fontSize: 9.5 }}>{TYPES[tk].name}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: 9.5 }}>{TYPE_AXES[tk].pace} · {TYPE_AXES[tk].focus}</Text>
              <Text style={{ flex: 1, fontSize: 9.5 }}>{TYPE_AXES[tk].moneyMeans}</Text>
              <Text style={{ flex: 1, fontSize: 9.5 }}>{TYPE_AXES[tk].coreFear}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 18, borderLeftWidth: 3, borderLeftColor: t.color, paddingLeft: 12 }}>
          <Text style={{ fontFamily: 'Bricolage', fontWeight: 700, fontSize: 13, lineHeight: 1.35, color: C.ink }}>&ldquo;{BOOK_INTRO.quote}&rdquo;</Text>
          <Text style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>Mack Comandante, Money DNA</Text>
        </View>
        <Text style={{ fontSize: 8, color: C.muted, marginTop: 18, lineHeight: 1.45 }}>{BOOK_INTRO.disclaimer}</Text>
      </Page>

      {/* Reading your results */}
      <Page size="A4" style={s.page}>
        <Chrome name={name ? `${name} · ${t.name}` : t.name} />
        <Text style={[s.kicker, { color: SHADE[k].deep }]}>Introduction</Text>
        <Text style={[s.h1, { marginBottom: 14 }]}>{READING_RESULTS.title}</Text>
        <Para><Text style={{ fontWeight: 700, color: C.ink }}>{READING_RESULTS.primary.title}</Text> {READING_RESULTS.primary.text}</Para>
        <Para><Text style={{ fontWeight: 700, color: C.ink }}>{READING_RESULTS.blend.title}</Text> {READING_RESULTS.blend.text}</Para>
        <View style={{ marginTop: 2, marginBottom: 8 }}>
          {READING_RESULTS.blends.map((b) => (
            <View key={b.name} style={[s.panel, s.row, { marginBottom: 6, paddingVertical: 10 }]} wrap={false}>
              <View style={[s.row, { width: 26, marginTop: 4 }]}>
                {b.types.map((bt) => <View key={bt} style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: TYPES[bt].color, marginRight: 3 }} />)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Bricolage', fontWeight: 700, fontSize: 12, color: C.ink }}>
                  {b.name} <Text style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: 9.5, color: C.muted }}>({b.types.map((bt) => TYPES[bt].short).join(' + ')})</Text>
                </Text>
                <Text>{capitalise(b.text)}</Text>
              </View>
            </View>
          ))}
        </View>
        <Para><Text style={{ fontWeight: 700, color: C.ink }}>{READING_RESULTS.balanced.title}</Text> {READING_RESULTS.balanced.text}</Para>
        <Para><Text style={{ fontWeight: 700, color: C.ink }}>{READING_RESULTS.lowest.title}</Text> {READING_RESULTS.lowest.text}</Para>
      </Page>

      {/* Summary and body */}
      <Page size="A4" style={s.page}>
        <Chrome name={name ? `${name} · ${t.name}` : t.name} />
        <Text style={[s.kicker, { color: SHADE[k].deep }]}>Summary</Text>
        <Text style={[s.h1, { marginBottom: 14 }]}>{first ? `${first}, meet your Money DNA` : 'Your Money DNA archetype'}</Text>

        <View style={[s.panel, { backgroundColor: SHADE[k].tint, flexDirection: 'row' }]} wrap={false}>
          <Image src={path.join(ASSETS, 'avatars', `${k}.jpg`)} style={{ width: 92, height: 92, borderRadius: 46, objectFit: 'cover', marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.2, color: SHADE[k].deep, textTransform: 'uppercase' }}>Money DNA · {k}</Text>
            <Text style={{ fontFamily: 'Bricolage', fontWeight: 800, fontSize: 24, lineHeight: 1.15, color: C.ink, marginTop: 2 }}>{t.name}</Text>
            <Text style={{ marginTop: 4, color: C.soft }}>{t.summary}</Text>
          </View>
        </View>

        <View style={[s.row, { marginTop: 12 }]} wrap={false}>
          {[['Pace · Focus', `${ax.pace} · ${ax.focus}`], ['Money means', ax.moneyMeans], ['Core fear', ax.coreFear]].map(([label, value], n) => (
            <View key={label} style={[s.panel, { flex: 1, marginLeft: n ? 8 : 0, paddingVertical: 10 }]}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: 'uppercase' }}>{label}</Text>
              <Text style={{ fontWeight: 700, color: C.ink, marginTop: 2 }}>{value}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 16 }} wrap={false}>
          <Text style={s.h3}>Your score mix</Text>
          {rr.ranked.map((tk) => (
            <View key={tk} style={[s.row, { alignItems: 'center', marginTop: 6 }]}>
              <Text style={{ width: 96, fontSize: 9.5, fontWeight: tk === k ? 700 : 400 }}>{TYPES[tk].short}</Text>
              <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: C.panel }}>
                <View style={{ width: `${Math.max(pct[tk], 1)}%`, height: 8, borderRadius: 4, backgroundColor: TYPES[tk].color }} />
              </View>
              <Text style={{ width: 70, textAlign: 'right', fontSize: 9.5 }}><Text style={{ fontWeight: 700 }}>{scores[tk]}</Text>/20 · {pct[tk]}%</Text>
            </View>
          ))}
        </View>

        <View style={[s.panel, { marginTop: 12 }]} wrap={false}>
          <Text style={s.h3}>Reading your result</Text>
          <Text style={{ marginTop: 4 }}>
            <Text style={{ fontWeight: 700, color: C.ink }}>{t.short}, {rr.top} of 20.</Text> That is {rr.strength}
            {rr.top >= 6 ? '' : ': your scores are spread fairly evenly, so read the balanced-profile note below'}.
          </Text>
          {rr.isBlend && (
            <Text style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 700, color: C.ink }}>
                {rr.named ? `You are ${rr.named.name.replace(/^The /, 'a ')} blend` : 'You are a two-type blend'} ({t.short} + {TYPES[rr.secondary].short}).
              </Text>{' '}
              {rr.named
                ? capitalise(rr.named.text)
                : `Your ${TYPES[rr.secondary].short} score is within 3 points of your ${t.short} score, so expect to see both patterns in yourself.`}
            </Text>
          )}
          {!rr.isBlend && (
            <Text style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 700, color: C.ink }}>Your secondary type is the {TYPES[rr.secondary].short}</Text> ({scores[rr.secondary]} of 20). It is more than 3 points behind, so your {t.short} pattern clearly leads.
            </Text>
          )}
          {rr.balanced && (
            <Text style={{ marginTop: 6 }}>
              <Text style={{ fontWeight: 700, color: C.ink }}>You have a balanced profile.</Text> Three of your types are within 2 points of each other, so you adapt your money behaviour to the situation. To find your core, ask what you do first when money gets tight: take a bold risk, spend to feel better, freeze and protect, or analyze.
            </Text>
          )}
          <Text style={{ marginTop: 6 }}>
            <Text style={{ fontWeight: 700, color: C.ink }}>Your lowest score is the {TYPES[rr.lowest].short}</Text> ({scores[rr.lowest]} of 20). Its strengths often point straight at your biggest blind spot. For you, that probably means building more {LOWEST_SCORE_HINT[rr.lowest]}.
          </Text>
        </View>

        <Section k={k} kicker="Core belief" title={`What money means to the ${t.short}`}>
          <Para>{r.coreBelief}</Para>
          <Para>{r.traits.relationship}</Para>
        </Section>

        <Section k={k} kicker="Your money in practice" title={`How the ${t.short} handles money`}>
          {TRAIT_LABELS.map(([key, label]) => (
            <View key={key} style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.line }]} wrap={false}>
              <Text style={{ width: 96, fontFamily: 'Bricolage', fontWeight: 700, fontSize: 11, color: SHADE[k].deep }}>{label}</Text>
              <Text style={{ flex: 1 }}>{r.traits[key]}</Text>
            </View>
          ))}
        </Section>

        <Section k={k} kicker="In the real world" title={`Famous ${t.short}s`}>
          {r.famousIntro ? <Para>{r.famousIntro}</Para> : null}
          {r.famous.map((f) => (
            <View key={f.name} style={{ marginBottom: 8 }} wrap={false}>
              <Text><Text style={{ fontWeight: 700, color: C.ink }}>{f.name}</Text>{/^[,.]/.test(f.text) ? '' : ' '}{f.text}</Text>
            </View>
          ))}
          <View style={[s.panel, { marginTop: 4 }]} wrap={false}><Text style={{ color: C.soft }}>{r.famousNote}</Text></View>
        </Section>

        <Section k={k} kicker="The evidence" title={`What the research says about ${t.short}s`}>
          {r.research.map((p, n) => <Para key={n}>{p}</Para>)}
        </Section>

        <Section k={k} kicker="Your strengths" title="Your superpowers">
          {r.superpowers.map((x, n) => <Item key={x.title} k={k} marker={String(n + 1)} title={x.title} text={x.text} />)}
        </Section>

        <Section k={k} kicker="Your blind spots" title="Your shadow">
          <Para>{r.shadowIntro || 'Every superpower has a shadow. These are the patterns to watch.'}</Para>
          {r.shadow.map((x, n) => <Item key={x.title} k={k} marker={String(n + 1)} title={x.title} text={x.text} />)}
        </Section>

        <Section k={k} kicker="When money gets tight" title="Under stress">
          <View style={[s.panel, { borderLeftWidth: 3, borderLeftColor: t.color }]}><Text>{r.underStress}</Text></View>
        </Section>

        <Section k={k} kicker="Love and money" title={`The ${t.short} in relationships`}>
          <Para>{r.relationships.intro}</Para>
          {r.relationships.rules.map((rule, n) => {
            const [title, ...rest] = rule.split(':');
            return rest.length
              ? <Item key={n} k={k} marker={String(n + 1)} title={title} text={capitalise(rest.join(':').trim())} />
              : <Item key={n} k={k} marker={String(n + 1)} title={rule} text="" />;
          })}
          {r.relationships.outro ? <Para>{r.relationships.outro}</Para> : null}
        </Section>

        <Section k={k} kicker="For financial advisors and coaches" title={`How to work with ${/^[AEIOU]/.test(t.short) ? 'an' : 'a'} ${t.short}`}>
          <Para>{r.advisors}</Para>
        </Section>

      </Page>

      <Page size="A4" style={s.page}>
        <Chrome name={name ? `${name} · ${t.name}` : t.name} />
        <Section k={k} kicker="Your plan" title={`The ${t.short} Blueprint`} first>
          <Text style={{ fontFamily: 'Bricolage', fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 12 }}>{r.blueprintIntro}</Text>
          {r.blueprint.map((x, n) => <Item key={x.title} k={k} marker={String(n + 1)} title={x.title} text={x.text} />)}
        </Section>

      </Page>

      <Page size="A4" style={s.page}>
        <Chrome name={name ? `${name} · ${t.name}` : t.name} />
        <Section k={k} kicker="Reflect" title="Coaching questions" first>
          <Para style={{ color: C.soft }}>Take your time with these. Write your answers down, and come back to them in a few months.</Para>
          {r.coaching.map((q, n) => (
            <View key={n} style={{ marginTop: 10 }} wrap={false}>
              <Text style={{ fontWeight: 700, color: C.ink }}>{n + 1}. {q}</Text>
              {[0, 1, 2].map((l) => <View key={l} style={{ height: 22, borderBottomWidth: 1, borderBottomColor: C.line }} />)}
            </View>
          ))}
        </Section>
      </Page>

      {/* Closing and CTA */}
      <Page size="A4" style={[s.page, { backgroundColor: C.ink, color: '#FFFFFF' }]}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, color: t.color, textTransform: 'uppercase', marginTop: 20 }}>{first ? `A word to ${first}, the ${t.short}` : `A word to the ${t.short}`}</Text>
        <Text style={{ fontFamily: 'Bricolage', fontWeight: 700, fontSize: 15, lineHeight: 1.5, color: '#FFFFFF', marginTop: 10 }}>{r.closing}</Text>
        <Text style={{ fontSize: 9, color: C.navyMuted, marginTop: 10 }}>Mack Comandante, Money DNA</Text>

        <View style={{ marginTop: 40, borderWidth: 2, borderColor: C.amber, borderRadius: 18, padding: 24 }}>
          <Text style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.4, color: C.amber, textTransform: 'uppercase' }}>Your next step</Text>
          <Text style={{ fontFamily: 'Bricolage', fontWeight: 800, fontSize: 24, lineHeight: 1.15, marginTop: 6 }}>Turn your Money DNA into your Financial Wellness Roadmap.</Text>
          <Text style={{ color: C.navySoft, marginTop: 10 }}>
            Your Money DNA is waiting in the Hermes app. Create your free account to open it anytime, then turn what you have learned here into a plan that fits how you are wired.
          </Text>
          <Link src={hermes} style={{ marginTop: 16, alignSelf: 'flex-start', backgroundColor: C.amber, color: C.ink, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 18, fontWeight: 700, fontSize: 12, textDecoration: 'none' }}>
            Visit hermes.exoasia.org
          </Link>
        </View>

        <View style={{ position: 'absolute', left: 54, right: 54, bottom: 40 }}>
          <Text style={{ fontSize: 8, color: C.navyMuted, lineHeight: 1.45 }}>
            Money DNA is a coaching framework adapted from the DISC behavioural model. It is not a clinical or psychometric test, and this report is not financial advice. © {date.getFullYear()} Mark Philip &ldquo;Mack&rdquo; C. Comandante. All rights reserved.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function reportFilename(primary: TypeKey): string {
  return `Money-DNA-Report-${TYPES[primary].short.replace(/\s+/g, '-')}.pdf`;
}

export async function renderReportPdf(input: ReportInput): Promise<Buffer> {
  return renderToBuffer(<ReportDocument {...input} />);
}
