import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { AvatarCliente, EstrategiaPrecio } from '@/lib/supabase/types'

// ── Layout-only styles (no colors here) ──────────────────────────────────────
const L = StyleSheet.create({
  page:           { padding: 0, fontFamily: 'Helvetica' },
  pagePadded:     { padding: 44, fontFamily: 'Helvetica' },
  cover:          { flex: 1, padding: 52, justifyContent: 'space-between' },
  coverTop:       { gap: 10 },
  coverBottom:    { gap: 14 },
  pill:           { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16, alignSelf: 'flex-start' },
  priceRow:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  divider:        { height: 1, marginVertical: 20 },
  beforeAfterRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  beforeCard:     { flex: 1, borderRadius: 8, padding: 14, borderLeftWidth: 3 },
  afterCard:      { flex: 1, borderRadius: 8, padding: 14, borderLeftWidth: 3 },
  card:           { borderRadius: 8, padding: 16, marginBottom: 12 },
  contentBox:     { borderRadius: 8, padding: 18, marginBottom: 14 },
  badge:          { borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start', marginTop: 6 },
  quote:          { borderLeftWidth: 3, paddingLeft: 14, marginVertical: 14 },
  bullet:         { flexDirection: 'row', gap: 6, marginBottom: 5 },
  twoCols:        { flexDirection: 'row', gap: 20, marginTop: 8 },
  col:            { flex: 1 },
  footer:         { position: 'absolute', bottom: 24, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between' },
})

// ── Typography scale (layout, no colors) ─────────────────────────────────────
const T = StyleSheet.create({
  brand:        { fontSize: 10, letterSpacing: 3 },
  brandSub:     { fontSize: 10, letterSpacing: 3, marginTop: 2 },
  productName:  { fontSize: 34, fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginTop: 10 },
  subtitle:     { fontSize: 14, marginTop: 14, lineHeight: 1.5 },
  priceAnchor:  { fontSize: 16, textDecoration: 'line-through' },
  pricePrimary: { fontSize: 28, fontFamily: 'Helvetica-Bold' },
  pillText:     { fontSize: 11 },
  wordsBadge:   { fontSize: 11 },
  sectionLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 14 },
  h2:           { fontSize: 20, fontFamily: 'Helvetica-Bold', marginBottom: 10, lineHeight: 1.3 },
  h3:           { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 12 },
  body:         { fontSize: 11, lineHeight: 1.7 },
  label:        { fontSize: 9, letterSpacing: 1, marginBottom: 3 },
  value:        { fontSize: 12, marginBottom: 12 },
  cardTitle:    { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  cardSub:      { fontSize: 10, marginBottom: 6 },
  cardBody:     { fontSize: 10, lineHeight: 1.5 },
  badgeText:    { fontSize: 9 },
  baLabel:      { fontSize: 9, letterSpacing: 2, marginBottom: 6 },
  baText:       { fontSize: 11, lineHeight: 1.5 },
  quoteText:    { fontSize: 12, fontStyle: 'italic', lineHeight: 1.6 },
  quoteAuthor:  { fontSize: 10, marginTop: 4 },
  contentTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  contentText:  { fontSize: 10, lineHeight: 1.7 },
  bulletDot:    { fontSize: 11, marginTop: 1 },
  bulletText:   { fontSize: 11, flex: 1, lineHeight: 1.4 },
  footerText:   { fontSize: 9 },
  pageNumber:   { fontSize: 9 },
})

// ── Themes ────────────────────────────────────────────────────────────────────
export type PdfTheme = 'dark' | 'light' | 'purple'

interface ThemeColors {
  pageBg: string
  coverBg: string
  cardBg: string
  contentBg: string
  pillBg: string
  dividerColor: string
  accent: string
  accentMuted: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  textDim: string
  textFooter: string
  textPageNum: string
  price: string
  pillText: string
  sectionLabel: string
  contentTitle: string
  baLabelBefore: string
  baLabelAfter: string
  beforeBg: string
  afterBg: string
  beforeBorder: string
  afterBorder: string
  badgeBg: string
  badgeText: string
  priceAnchorColor: string
  cardBorder: string
}

const THEMES: Record<PdfTheme, ThemeColors> = {
  dark: {
    pageBg: '#0f0f1a',
    coverBg: '#0f0f1a',
    cardBg: '#1e293b',
    contentBg: '#111827',
    pillBg: '#1e1b4b',
    dividerColor: '#1e293b',
    accent: '#a855f7',
    accentMuted: '#a5b4fc',
    textPrimary: '#ffffff',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    textFooter: '#334155',
    textPageNum: '#475569',
    price: '#4ade80',
    pillText: '#a5b4fc',
    sectionLabel: '#a855f7',
    contentTitle: '#c084fc',
    baLabelBefore: '#fca5a5',
    baLabelAfter: '#86efac',
    beforeBg: '#450a0a',
    afterBg: '#052e16',
    beforeBorder: '#ef4444',
    afterBorder: '#22c55e',
    badgeBg: 'rgba(254,240,138,0.12)',
    badgeText: '#fde047',
    priceAnchorColor: '#475569',
    cardBorder: '#1e293b',
  },
  light: {
    pageBg: '#ffffff',
    coverBg: '#f8fafc',
    cardBg: '#f1f5f9',
    contentBg: '#f8fafc',
    pillBg: '#ede9fe',
    dividerColor: '#e2e8f0',
    accent: '#7c3aed',
    accentMuted: '#8b5cf6',
    textPrimary: '#0f172a',
    textSecondary: '#1e293b',
    textMuted: '#475569',
    textDim: '#94a3b8',
    textFooter: '#94a3b8',
    textPageNum: '#64748b',
    price: '#15803d',
    pillText: '#6d28d9',
    sectionLabel: '#6d28d9',
    contentTitle: '#7c3aed',
    baLabelBefore: '#dc2626',
    baLabelAfter: '#16a34a',
    beforeBg: '#fef2f2',
    afterBg: '#f0fdf4',
    beforeBorder: '#ef4444',
    afterBorder: '#22c55e',
    badgeBg: 'rgba(254,240,138,0.3)',
    badgeText: '#854d0e',
    priceAnchorColor: '#94a3b8',
    cardBorder: '#e2e8f0',
  },
  purple: {
    pageBg: '#1e1b4b',
    coverBg: '#0f0c2e',
    cardBg: '#312e81',
    contentBg: '#16144a',
    pillBg: '#312e81',
    dividerColor: '#3730a3',
    accent: '#e879f9',
    accentMuted: '#c084fc',
    textPrimary: '#e0e7ff',
    textSecondary: '#c7d2fe',
    textMuted: '#a5b4fc',
    textDim: '#818cf8',
    textFooter: '#4f46e5',
    textPageNum: '#6366f1',
    price: '#4ade80',
    pillText: '#c7d2fe',
    sectionLabel: '#e879f9',
    contentTitle: '#f0abfc',
    baLabelBefore: '#fca5a5',
    baLabelAfter: '#86efac',
    beforeBg: '#450a0a',
    afterBg: '#052e16',
    beforeBorder: '#ef4444',
    afterBorder: '#22c55e',
    badgeBg: 'rgba(254,240,138,0.1)',
    badgeText: '#fef08a',
    priceAnchorColor: '#6366f1',
    cardBorder: 'transparent',
  },
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SeccionContenido {
  orden: number
  tipo_seccion: string
  titulo: string
  contenido: string
  palabras_count: number
}

interface Props {
  nombre_producto: string
  subtitulo: string | null
  promesa_before: string | null
  promesa_after: string | null
  avatar: AvatarCliente | null
  precio: EstrategiaPrecio | null
  precio_sugerido: number | null
  tipo_producto: string | null
  tamano_total_palabras: number | null
  secciones: SeccionContenido[]
  ganchos: string[] | null
  vendedor_output: {
    guion_apertura_whatsapp?: string
    guion_cierre?: string
  } | null
  // Personalization
  footerText?: string
  theme?: PdfTheme
  showTransformation?: boolean
  showAvatar?: boolean
  showScripts?: boolean
  showGanchos?: boolean
  customTitle?: string
  customSubtitle?: string
}

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim()
}

export function ProductoPDF({
  nombre_producto,
  subtitulo,
  promesa_before,
  promesa_after,
  avatar,
  precio,
  precio_sugerido,
  tipo_producto,
  tamano_total_palabras,
  secciones,
  ganchos,
  vendedor_output,
  footerText,
  theme = 'dark',
  showTransformation = false,
  showAvatar = false,
  showScripts = false,
  showGanchos = false,
  customTitle,
  customSubtitle,
}: Props) {
  const t = THEMES[theme]
  const displayTitle = customTitle || nombre_producto
  const displaySubtitle = customSubtitle !== undefined ? customSubtitle : subtitulo
  const footer = footerText || `DigitalMint · ${displayTitle}`
  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`

  const tocSection = secciones.find(s => s.tipo_seccion === 'toc')
  const introSection = secciones.find(s => s.tipo_seccion === 'intro')
  const conclusionSection = secciones.find(s => s.tipo_seccion === 'conclusion')
  const mainSections = secciones
    .filter(s => !['toc', 'intro', 'conclusion'].includes(s.tipo_seccion))
    .sort((a, b) => a.orden - b.orden)

  const orderedSections = [
    ...(introSection ? [introSection] : []),
    ...mainSections,
    ...(conclusionSection ? [conclusionSection] : []),
  ]

  const PageFooter = () => (
    <View style={L.footer} fixed>
      <Text style={[T.footerText, { color: t.textFooter }]}>{footer}</Text>
      <Text
        style={[T.pageNumber, { color: t.textPageNum }]}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  )

  const Bullet = ({ text }: { text: string }) => (
    <View style={L.bullet}>
      <Text style={[T.bulletDot, { color: t.accent }]}>›</Text>
      <Text style={[T.bulletText, { color: t.textMuted }]}>{text}</Text>
    </View>
  )

  return (
    <Document title={displayTitle} author="DigitalMint" subject="Producto Digital">

      {/* ── PORTADA ── */}
      <Page size="A4" style={[L.page, { backgroundColor: t.coverBg }]}>
        <View style={L.cover}>
          <View style={L.coverTop}>
            <Text style={[T.brand, { color: t.accent }]}>DIGITALMINT · PRODUCTO DIGITAL</Text>
            {tipo_producto && (
              <Text style={[T.brandSub, { color: t.textDim }]}>{tipo_producto.toUpperCase()}</Text>
            )}
            <Text style={[T.productName, { color: t.textPrimary }]}>{displayTitle}</Text>
            {displaySubtitle && (
              <Text style={[T.subtitle, { color: t.textMuted }]}>{displaySubtitle}</Text>
            )}
          </View>
          <View style={L.coverBottom}>
            <View style={[L.divider, { backgroundColor: t.dividerColor }]} />
            {precio_sugerido && (
              <View style={L.priceRow}>
                {precio?.precio_anchor && (
                  <Text style={[T.priceAnchor, { color: t.priceAnchorColor }]}>{fmt(precio.precio_anchor)}</Text>
                )}
                <Text style={[T.pricePrimary, { color: t.price }]}>{fmt(precio_sugerido)}</Text>
              </View>
            )}
            {tamano_total_palabras && (
              <Text style={[T.wordsBadge, { color: t.textDim }]}>
                {tamano_total_palabras.toLocaleString()} palabras de contenido real
              </Text>
            )}
            <View style={[L.pill, { backgroundColor: t.pillBg }]}>
              <Text style={[T.pillText, { color: t.pillText }]}>Generado con DigitalMint</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── TABLA DE CONTENIDOS ── */}
      {tocSection && (
        <Page size="A4" style={[L.pagePadded, { backgroundColor: t.pageBg }]}>
          <Text style={[T.sectionLabel, { color: t.sectionLabel }]}>ÍNDICE</Text>
          <Text style={[T.body, { color: t.textMuted, lineHeight: 1.9 }]}>
            {cleanMarkdown(tocSection.contenido)}
          </Text>
          <PageFooter />
        </Page>
      )}

      {/* ── TRANSFORMACIÓN (opcional) ── */}
      {showTransformation && (promesa_before || promesa_after) && (
        <Page size="A4" style={[L.pagePadded, { backgroundColor: t.pageBg }]}>
          <Text style={[T.sectionLabel, { color: t.sectionLabel }]}>TRANSFORMACIÓN PROMETIDA</Text>
          <View style={L.beforeAfterRow}>
            {promesa_before && (
              <View style={[L.beforeCard, { backgroundColor: t.beforeBg, borderLeftColor: t.beforeBorder }]}>
                <Text style={[T.baLabel, { color: t.baLabelBefore }]}>ANTES</Text>
                <Text style={[T.baText, { color: t.textSecondary }]}>{promesa_before}</Text>
              </View>
            )}
            {promesa_after && (
              <View style={[L.afterCard, { backgroundColor: t.afterBg, borderLeftColor: t.afterBorder }]}>
                <Text style={[T.baLabel, { color: t.baLabelAfter }]}>DESPUÉS</Text>
                <Text style={[T.baText, { color: t.textSecondary }]}>{promesa_after}</Text>
              </View>
            )}
          </View>
          <PageFooter />
        </Page>
      )}

      {/* ── AVATAR (opcional) ── */}
      {showAvatar && avatar && (
        <Page size="A4" style={[L.pagePadded, { backgroundColor: t.pageBg }]}>
          <Text style={[T.sectionLabel, { color: t.sectionLabel }]}>AVATAR DEL CLIENTE IDEAL</Text>
          <Text style={[T.label, { color: t.textDim }]}>Perfil</Text>
          <Text style={[T.value, { color: t.textSecondary }]}>
            {avatar.nombre_ficticio} · {avatar.edad} · {avatar.ocupacion}
          </Text>
          {avatar.cita_directa && (
            <View style={[L.quote, { borderLeftColor: t.accent }]}>
              <Text style={[T.quoteText, { color: t.textSecondary }]}>"{avatar.cita_directa}"</Text>
              <Text style={[T.quoteAuthor, { color: t.textDim }]}>— {avatar.nombre_ficticio}</Text>
            </View>
          )}
          <View style={L.twoCols}>
            <View style={L.col}>
              <Text style={[T.label, { color: t.textDim }]}>Dolores</Text>
              {avatar.dolores?.map((d, i) => <Bullet key={i} text={d} />)}
            </View>
            <View style={L.col}>
              <Text style={[T.label, { color: t.textDim }]}>Deseos</Text>
              {avatar.deseos?.map((d, i) => <Bullet key={i} text={d} />)}
            </View>
          </View>
          <PageFooter />
        </Page>
      )}

      {/* ── CONTENIDO PRINCIPAL ── */}
      {orderedSections.map((sec) => {
        const cleanedContent = cleanMarkdown(sec.contenido)
        const sectionLabel =
          sec.tipo_seccion === 'intro'       ? 'INTRODUCCIÓN' :
          sec.tipo_seccion === 'conclusion'  ? 'CONCLUSIÓN' :
          sec.tipo_seccion === 'bonus'       ? 'BONUS' :
          `SECCIÓN ${sec.orden}`

        return (
          <Page key={sec.orden} size="A4" style={[L.pagePadded, { backgroundColor: t.pageBg }]}>
            <Text style={[T.sectionLabel, { color: t.sectionLabel }]}>{sectionLabel}</Text>
            <Text style={[T.h2, { color: t.textPrimary }]}>{sec.titulo}</Text>
            <Text style={[T.contentText, { color: t.textMuted }]}>{cleanedContent}</Text>
            <PageFooter />
          </Page>
        )
      })}

      {/* ── SCRIPTS WHATSAPP ── */}
      {showScripts && vendedor_output && (
        <Page size="A4" style={[L.pagePadded, { backgroundColor: t.pageBg }]}>
          <Text style={[T.sectionLabel, { color: t.sectionLabel }]}>SCRIPTS DE VENTAS · WHATSAPP</Text>
          {vendedor_output.guion_apertura_whatsapp && (
            <View style={[L.card, { backgroundColor: t.cardBg, marginBottom: 16 }]}>
              <Text style={[T.cardSub, { color: t.textDim }]}>APERTURA — primer mensaje</Text>
              <Text style={[T.cardBody, { color: t.textMuted }]}>
                {vendedor_output.guion_apertura_whatsapp as string}
              </Text>
            </View>
          )}
          {vendedor_output.guion_cierre && (
            <View style={[L.card, { backgroundColor: t.cardBg }]}>
              <Text style={[T.cardSub, { color: t.textDim }]}>CIERRE — cuando muestra interés</Text>
              <Text style={[T.cardBody, { color: t.textMuted }]}>
                {vendedor_output.guion_cierre as string}
              </Text>
            </View>
          )}
          <PageFooter />
        </Page>
      )}

      {/* ── GANCHOS FACEBOOK ADS ── */}
      {showGanchos && ganchos && ganchos.length > 0 && (
        <Page size="A4" style={[L.pagePadded, { backgroundColor: t.pageBg }]}>
          <Text style={[T.sectionLabel, { color: t.sectionLabel }]}>GANCHOS · FACEBOOK ADS</Text>
          {ganchos.map((gancho, i) => (
            <View key={i} style={[L.card, { backgroundColor: t.cardBg, borderLeftWidth: 3, borderLeftColor: t.accentMuted, marginBottom: 12 }]}>
              <Text style={[T.cardSub, { color: t.accentMuted }]}>
                {['PAS · Problema→Agitación→Solución', 'BAB · Antes→Después→Puente', 'Hook contraintuitivo'][i]}
              </Text>
              <Text style={[T.cardBody, { color: t.textMuted }]}>{gancho}</Text>
            </View>
          ))}
          <PageFooter />
        </Page>
      )}

    </Document>
  )
}
