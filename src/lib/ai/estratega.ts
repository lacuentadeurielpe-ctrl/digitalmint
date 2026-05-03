import Anthropic from '@anthropic-ai/sdk'
import type { InvestigadorOutput } from './investigador'

export interface EstrategaOutput {
  nombre_producto: string
  justificacion_nombre: string
  subtitulo: string
  posicionamiento: string
  promesa_before: string
  promesa_after: string
  transformacion_visible: string
  avatar: {
    nombre_ficticio: string
    edad: string
    ocupacion: string
    dolores: string[]
    deseos: string[]
    objeciones: string[]
    donde_vive: string
    nivel_ingresos: string
    cita_directa: string
  }
  precio_anchor: number
  precio_principal: number
  precio_downsell: number
  justificacion_precio: string
  tipo_producto: string
}

const SYSTEM_PROMPT = `Eres un estratega de posicionamiento y pricing para productos digitales. Aplicás:

- Blue Ocean Strategy: crear espacio de mercado sin competencia directa
- Semiótica aplicada al naming: nombres que evocan la transformación, son memorables, únicos
- Psicología Kahneman: Sistema 1 (emocional) y Sistema 2 (racional) del comprador
- Economía conductual Ariely: anclaje de precios, precio de referencia, efecto señuelo
- Principio de transformación: el producto debe prometer un BEFORE→AFTER visible y prometible

REGLAS DE NAMING:
- Máximo 2-3 palabras
- Evoca la transformación, no el proceso
- Suena premium y memorable
- Puede ser en inglés, español o mezcla según el mercado
- Ejemplos buenos: "Launch School", "Zero to Mastery", "Notion Mastery", "Copy Hacker"

REGLAS DE PRICING:
- precio_anchor: precio "tachado" de referencia (3-5x el principal)
- precio_principal: precio real de venta
- precio_downsell: versión reducida si no compran (60-70% del principal)
- Justifica con transformación, no con horas de contenido

Devuelve SOLO JSON válido con exactamente esta estructura:
{
  "nombre_producto": "Nombre del Producto",
  "justificacion_nombre": "por qué este nombre funciona semiótica y psicológicamente",
  "subtitulo": "subtítulo de 1 línea que completa el nombre y clarifica la propuesta",
  "posicionamiento": "en qué océano azul está este producto, qué lo hace único",
  "promesa_before": "situación actual dolorosa del cliente (1-2 oraciones en primera persona)",
  "promesa_after": "situación futura deseada después del producto (1-2 oraciones en primera persona)",
  "transformacion_visible": "qué resultado concreto y medible promete el producto",
  "avatar": {
    "nombre_ficticio": "nombre de persona ficticia representativa",
    "edad": "ej: 32 años",
    "ocupacion": "ocupación específica",
    "dolores": ["dolor 1", "dolor 2", "dolor 3"],
    "deseos": ["deseo 1", "deseo 2", "deseo 3"],
    "objeciones": ["objeción 1", "objeción 2", "objeción 3"],
    "donde_vive": "plataformas y comunidades donde está",
    "nivel_ingresos": "ingresos actuales aproximados",
    "cita_directa": "frase que diría este avatar sobre su problema (en primera persona)"
  },
  "precio_anchor": 297,
  "precio_principal": 97,
  "precio_downsell": 67,
  "justificacion_precio": "por qué este precio es el correcto para este mercado y transformación",
  "tipo_producto": "curso online | ebook | template pack | workshop | membresía | herramienta"
}`

export async function runEstrategа(
  idea: string,
  investigador: InvestigadorOutput
): Promise<EstrategaOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Idea original: "${idea}"

Datos de investigación de mercado:
${JSON.stringify(investigador, null, 2)}

Crea la estrategia completa de posicionamiento y pricing. Devuelve SOLO el JSON, sin markdown.`,
      },
    ],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as EstrategaOutput
}
