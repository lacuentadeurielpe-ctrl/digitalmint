import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { AvatarCliente, EstrategiaPrecio } from '@/lib/supabase/types'

const S = StyleSheet.create({
  page: { backgroundColor: '#0f0f1a', padding: 0, fontFamily: 'Helvetica' },
  pagePadded: { backgroundColor: '#0f0f1a', padding: 44, fontFamily: 'Helvetica' },

  // Cover
  cover: { flex: 1, backgroundColor: '#0f0f1a', padding: 52, justifyContent: 'space-between' },
  coverTop: { gap: 10 },
  brand: { fontSize: 10, color: '#a855f7', letterSpacing: 3 },
  productName: { fontSize: 34, color: '#ffffff', fontFamily: 'Helvetica-Bold', lineHeight: 1.25, marginTop: 10 },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 14, lineHeight: 1.5 },
  coverBottom: { gap: 14 },
  pill: { backgroundColor: '#1e1b4b', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16, alignSelf: 'flex-start' },
  pillText: { color: '#a5b4fc', fontSize: 11 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  priceAnchor: { fontSize: 16, color: '#475569', textDecoration: 'line-through' },
  pricePrimary: { fontSize: 28, color: '#4ade80', fontFamily: 'Helvetica-Bold' },
  wordsBadge: { fontSize: 11, color: '#64748b' },
  divider: { height: 1, backgroundColor: '#1e293b', marginVertical: 20 },

  // Typography
  sectionLabel: { fontSize: 9, color: '#a855f7', letterSpacing: 2, marginBottom: 14 },
  h2: { fontSize: 20, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginBottom: 10, lineHeight: 1.3 },
  h3: { fontSize: 14, color: '#e2e8f0', fontFamily: 'Helvetica-Bold', marginBottom: 6, marginTop: 12 },
  body: { fontSize: 11, color: '#94a3b8', lineHeight: 1.7 },
  label: { fontSize: 9, color: '#64748b', letterSpacing: 1, marginBottom: 3 },
  value: { fontSize: 12, color: '#cbd5e1', marginBottom: 12 },

  // Cards
  card: { backgroundColor: '#1e293b', borderRadius: 8, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, color: '#ffffff', fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  cardSub: { fontSize: 10, color: '#64748b', marginBottom: 6 },
  cardBody: { fontSize: 10, color: '#94a3b8', lineHeight: 1.5 },
  badge: { backgroundColor: '#fef08a20', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6, alignSelf: 'flex-start', marginTop: 6 },
  badgeText: { fontSize: 9, color: '#fde047' },

  // Before/After
  beforeAfterRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  beforeCard: { flex: 1, backgroundColor: '#450a0a', borderRadius: 8, padding: 14, borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  afterCard: { flex: 1, backgroundColor: '#052e16', borderRadius: 8, padding: 14, borderLeftWidth: 3, borderLeftColor: '#22c55e' },
  baLabel: { fontSize: 9, letterSpacing: 2, marginBottom: 6 },
  baText: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.5 },

  // Bullet
  bullet: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  bulletDot: { fontSize: 11, color: '#a855f7', marginTop: 1 },
  bulletText: { fontSize: 11, color: '#94a3b8', flex: 1, lineHeight: 1.4 },

  // Quote
  quote: { borderLeftWidth: 3, borderLeftColor: '#a855f7', paddingLeft: 14, marginVertical: 14 },
  quoteText: { fontSize: 12, color: '#e2e8f0', fontStyle: 'italic', lineHeight: 1.6 },
  quoteAuthor: { fontSize: 10, color: '#64748b', marginTop: 4 },

  // Content section
  contentBox: { backgroundColor: '#111827', borderRadius: 8, padding: 18, marginBottom: 14 },
  contentTitle: { fontSize: 15, color: '#c084fc', fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  contentText: { fontSize: 10, color: '#9ca3af', lineHeight: 1.7 },

  // Footer
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 9, color: '#334155' },
  pageNumber: { fontSize: 9, color: '#475569' },
})

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
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={S.bullet}>
      <Text style={S.bulletDot}>›</Text>
      <Text style={S.bulletText}>{text}</Text>
    </View>
  )
}

function PageFooter({ nombre }: { nombre: string }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>DigitalMint · {nombre}</Text>
      <Text style={S.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  )
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
}: Props) {
  const fmt = (n: number) => `$${n.toLocaleString('en-US')}`

  // Sort and group sections
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

  return (
    <Document title={nombre_producto} author="DigitalMint" subject="Producto Digital">

      {/* ── PORTADA ── */}
      <Page size="A4" style={S.page}>
        <View style={S.cover}>
          <View style={S.coverTop}>
            <Text style={S.brand}>DIGITALMINT · PRODUCTO DIGITAL</Text>
            {tipo_producto && <Text style={[S.brand, { color: '#64748b', marginTop: 2 }]}>{tipo_producto.toUpperCase()}</Text>}
            <Text style={S.productName}>{nombre_producto}</Text>
            {subtitulo && <Text style={S.subtitle}>{subtitulo}</Text>}
          </View>
          <View style={S.coverBottom}>
            <View style={S.divider} />
            {precio_sugerido && (
              <View style={S.priceRow}>
                {precio?.precio_anchor && (
                  <Text style={S.priceAnchor}>{fmt(precio.precio_anchor)}</Text>
                )}
                <Text style={S.pricePrimary}>{fmt(precio_sugerido)}</Text>
              </View>
            )}
            {tamano_total_palabras && (
              <Text style={S.wordsBadge}>{tamano_total_palabras.toLocaleString()} palabras de contenido real</Text>
            )}
            <View style={S.pill}>
              <Text style={S.pillText}>Generado con DigitalMint · digitalmint-orcin.vercel.app</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── TABLA DE CONTENIDOS ── */}
      {tocSection && (
        <Page size="A4" style={S.pagePadded}>
          <Text style={S.sectionLabel}>ÍNDICE</Text>
          <Text style={[S.body, { lineHeight: 1.9 }]}>
            {cleanMarkdown(tocSection.contenido)}
          </Text>
          <PageFooter nombre={nombre_producto} />
        </Page>
      )}

      {/* ── TRANSFORMACIÓN + AVATAR ── */}
      <Page size="A4" style={S.pagePadded}>
        <Text style={S.sectionLabel}>TRANSFORMACIÓN PROMETIDA</Text>
        <View style={S.beforeAfterRow}>
          {promesa_before && (
            <View style={S.beforeCard}>
              <Text style={[S.baLabel, { color: '#fca5a5' }]}>ANTES</Text>
              <Text style={S.baText}>{promesa_before}</Text>
            </View>
          )}
          {promesa_after && (
            <View style={S.afterCard}>
              <Text style={[S.baLabel, { color: '#86efac' }]}>DESPUÉS</Text>
              <Text style={S.baText}>{promesa_after}</Text>
            </View>
          )}
        </View>

        {avatar && (
          <>
            <View style={S.divider} />
            <Text style={S.sectionLabel}>AVATAR DEL CLIENTE IDEAL</Text>
            <Text style={S.label}>Perfil</Text>
            <Text style={S.value}>{avatar.nombre_ficticio} · {avatar.edad} · {avatar.ocupacion}</Text>
            {avatar.cita_directa && (
              <View style={S.quote}>
                <Text style={S.quoteText}>"{avatar.cita_directa}"</Text>
                <Text style={S.quoteAuthor}>— {avatar.nombre_ficticio}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={S.label}>Dolores</Text>
                {avatar.dolores?.map((d, i) => <Bullet key={i} text={d} />)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.label}>Deseos</Text>
                {avatar.deseos?.map((d, i) => <Bullet key={i} text={d} />)}
              </View>
            </View>
          </>
        )}
        <PageFooter nombre={nombre_producto} />
      </Page>

      {/* ── CONTENIDO PRINCIPAL (secciones) ── */}
      {orderedSections.map((sec) => {
        const cleanedContent = cleanMarkdown(sec.contenido)
        const preview = cleanedContent.slice(0, 3000)
        const hasMore = cleanedContent.length > 3000

        return (
          <Page key={sec.orden} size="A4" style={S.pagePadded}>
            <Text style={S.sectionLabel}>
              {sec.tipo_seccion === 'intro' ? 'INTRODUCCIÓN' :
               sec.tipo_seccion === 'conclusion' ? 'CONCLUSIÓN' :
               sec.tipo_seccion === 'bonus' ? `BONUS · ${sec.orden}` :
               `SECCIÓN ${sec.orden}`}
            </Text>
            <Text style={S.h2}>{sec.titulo}</Text>
            <View style={S.contentBox}>
              <Text style={S.contentText}>{preview}</Text>
              {hasMore && (
                <Text style={[S.contentText, { color: '#475569', marginTop: 8, fontStyle: 'italic' }]}>
                  [...continúa · {sec.palabras_count?.toLocaleString()} palabras en total]
                </Text>
              )}
            </View>
            <PageFooter nombre={nombre_producto} />
          </Page>
        )
      })}

      {/* ── SCRIPTS WHATSAPP ── */}
      {vendedor_output && (
        <Page size="A4" style={S.pagePadded}>
          <Text style={S.sectionLabel}>SCRIPTS DE VENTAS · WHATSAPP</Text>
          {vendedor_output.guion_apertura_whatsapp && (
            <View style={[S.card, { marginBottom: 16 }]}>
              <Text style={S.cardSub}>APERTURA — primer mensaje</Text>
              <Text style={S.cardBody}>{vendedor_output.guion_apertura_whatsapp as string}</Text>
            </View>
          )}
          {vendedor_output.guion_cierre && (
            <View style={S.card}>
              <Text style={S.cardSub}>CIERRE — cuando muestra interés</Text>
              <Text style={S.cardBody}>{vendedor_output.guion_cierre as string}</Text>
            </View>
          )}
          <PageFooter nombre={nombre_producto} />
        </Page>
      )}

      {/* ── GANCHOS FACEBOOK ADS ── */}
      {ganchos && ganchos.length > 0 && (
        <Page size="A4" style={S.pagePadded}>
          <Text style={S.sectionLabel}>GANCHOS · FACEBOOK ADS</Text>
          {ganchos.map((gancho, i) => (
            <View key={i} style={[S.card, { borderLeftWidth: 3, borderLeftColor: '#818cf8' }]}>
              <Text style={[S.cardSub, { color: '#818cf8' }]}>
                {['PAS · Problema→Agitación→Solución', 'BAB · Antes→Después→Puente', 'Hook contraintuitivo'][i]}
              </Text>
              <Text style={S.cardBody}>{gancho}</Text>
            </View>
          ))}
          <PageFooter nombre={nombre_producto} />
        </Page>
      )}

    </Document>
  )
}
