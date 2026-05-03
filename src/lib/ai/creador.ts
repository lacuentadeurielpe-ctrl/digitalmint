import Anthropic from '@anthropic-ai/sdk'
import type { InvestigadorOutput } from './investigador'
import type { EstrategaOutput } from './estratega'

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

const SYSTEM_PROMPT = `Eres un arquitecto de productos digitales de alta conversión. Tu especialidad es aplicar el Principio de Pareto al diseño de contenido:

EL 20% DEL CONTENIDO PRODUCE EL 80% DE LA TRANSFORMACIÓN
→ Identificar ese 20% y hacerlo el núcleo del producto
→ El resto amplifica, complementa y da confianza

PRINCIPIOS DE DISEÑO:
1. Cada módulo tiene UNA transformación clara y prometible
2. La secuencia lógica: CONCIENCIA → DECISIÓN → ACCIÓN → RESULTADO
3. Las primeras 2 lecciones de cada módulo son las más críticas (Pareto)
4. El bonus debe valer más de lo que parece (high perceived value)
5. El resultado final debe ser medible y visible

TIPOS DE PRODUCTO Y SU ESTRUCTURA:
- curso online: módulos con lecciones (3-6 módulos, 3-7 lecciones c/u)
- ebook: capítulos con secciones (5-8 capítulos)
- template pack: conjunto de plantillas con instrucciones
- workshop: sesiones con ejercicios
- membresía: pilares de contenido mensuales

Devuelve SOLO JSON con esta estructura:
{
  "tipo_estructura": "descripción del tipo (ej: Curso online en video + workbook descargable)",
  "descripcion_general": "qué es el producto en 2-3 oraciones",
  "duracion_estimada": "tiempo de consumo del alumno (ej: 6-8 horas de contenido)",
  "modulos": [
    {
      "numero": 1,
      "titulo": "Título del módulo",
      "descripcion": "qué aprende en este módulo (2 oraciones)",
      "lecciones": ["Lección 1", "Lección 2", "Lección 3"],
      "transformacion": "qué cambia en el alumno al terminar este módulo",
      "es_pareto": true
    }
  ],
  "bonus": [
    {
      "titulo": "Nombre del bonus",
      "descripcion": "qué incluye",
      "valor_percibido": "valor en dólares que percibe el cliente (ej: $97)"
    }
  ],
  "resultado_final": "qué tiene/logra el alumno al completar el producto",
  "pareto_insight": "cuál es el 20% de contenido que genera el 80% de la transformación"
}`

export async function runCreador(
  idea: string,
  investigador: InvestigadorOutput,
  estratega: EstrategaOutput
): Promise<CreadorOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    temperature: 0.6,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Idea original: "${idea}"

Producto: ${estratega.nombre_producto} — ${estratega.subtitulo}
Tipo: ${estratega.tipo_producto}
Transformación: ${estratega.promesa_before} → ${estratega.promesa_after}
Avatar: ${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}, ${estratega.avatar.ocupacion}
Dolor principal: ${investigador.dolor_principal}

Diseña la estructura completa del producto. Devuelve SOLO el JSON, sin markdown.`,
      },
    ],
  })

  const raw = (message.content[0] as { type: string; text: string }).text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  return JSON.parse(jsonMatch ? jsonMatch[0] : raw) as CreadorOutput
}
