import Anthropic from '@anthropic-ai/sdk'
import type { InvestigadorOutput } from './investigador'
import type { EstrategaOutput } from './estratega'
import { extractJson } from './utils'

export interface Modulo {
  numero: number
  titulo: string
  descripcion: string
  lecciones: string[]
  transformacion: string
  es_pareto: boolean
}

export interface CreadorOutput {
  tipo_estructura: string
  descripcion_general: string
  duracion_estimada: string
  modulos: Modulo[]
  bonus: Array<{ titulo: string; descripcion: string; valor_percibido: string }>
  resultado_final: string
  pareto_insight: string
}

const SYSTEM_PROMPT = `Eres un arquitecto de productos digitales de alta conversión. Aplicas el Principio de Pareto al diseño: el 20% del contenido produce el 80% de la transformación.

PRINCIPIOS:
1. Cada módulo tiene UNA transformación clara
2. Secuencia: CONCIENCIA → DECISIÓN → ACCIÓN → RESULTADO
3. El módulo Pareto (es_pareto: true) es el núcleo del producto
4. El bonus debe tener alto valor percibido
5. El resultado final debe ser medible

Responde SOLO con un JSON válido. No uses comillas dobles dentro de los valores de texto. No incluyas markdown ni backticks.`

export async function runCreador(
  idea: string,
  investigador: InvestigadorOutput,
  estratega: EstrategaOutput
): Promise<CreadorOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const userContent = `Idea original: "${idea}"
Producto: ${estratega.nombre_producto} — ${estratega.subtitulo}
Tipo de producto: ${estratega.tipo_producto}
Transformación: ${estratega.promesa_before} → ${estratega.promesa_after}
Avatar: ${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}, ${estratega.avatar.ocupacion}
Dolor principal: ${investigador.dolor_principal}
Resultado visible prometido: ${estratega.transformacion_visible}

Diseña la estructura completa. Devuelve exactamente este JSON:
{
  "tipo_estructura": "descripción del formato del producto",
  "descripcion_general": "qué es el producto en 2 oraciones",
  "duracion_estimada": "tiempo de consumo estimado",
  "modulos": [
    {
      "numero": 1,
      "titulo": "Título del módulo",
      "descripcion": "qué aprende en este módulo",
      "lecciones": ["Lección 1", "Lección 2", "Lección 3"],
      "transformacion": "qué cambia al terminar este módulo",
      "es_pareto": true
    }
  ],
  "bonus": [
    {
      "titulo": "Nombre del bonus",
      "descripcion": "qué incluye",
      "valor_percibido": "$97"
    }
  ],
  "resultado_final": "qué logra el alumno al completar el producto",
  "pareto_insight": "el 20% de contenido que genera el 80% de la transformación"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 5000,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: userContent },
      { role: 'assistant', content: '{' },
    ],
  })

  const raw = '{' + (message.content[0] as { type: string; text: string }).text
  return extractJson<CreadorOutput>(raw)
}
