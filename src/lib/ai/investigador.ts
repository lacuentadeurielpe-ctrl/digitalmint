import OpenAI from 'openai'

export interface InvestigadorOutput {
  mercado: string
  tamano_mercado: string
  dolor_principal: string
  dolores_secundarios: string[]
  audiencia: {
    descripcion: string
    edad_rango: string
    ocupacion: string
    nivel_ingresos: string
    plataformas: string[]
  }
  competidores: Array<{ nombre: string; precio: string; debilidad: string }>
  diferenciadores_posibles: string[]
  palabras_clave: string[]
  jtbd: string
}

const SYSTEM_PROMPT = `Eres un investigador de mercados senior especializado en productos digitales (cursos, ebooks, templates, herramientas).

Tu análisis se basa en:
- Jobs-to-be-done framework (Clayton Christensen)
- Psicología del dolor real: dolores funcionales, emocionales y sociales
- Dinámica competitiva: qué existe y dónde están los huecos
- Segmentación psicográfica: actitudes, valores, comportamientos

Devuelve SOLO un objeto JSON válido con exactamente esta estructura (sin markdown, sin explicaciones):
{
  "mercado": "nombre del mercado/nicho",
  "tamano_mercado": "estimación del tamaño",
  "dolor_principal": "el dolor #1 más intenso y urgente del mercado",
  "dolores_secundarios": ["dolor 2", "dolor 3", "dolor 4"],
  "audiencia": {
    "descripcion": "quién es esta persona en 2 oraciones",
    "edad_rango": "ej: 25-45 años",
    "ocupacion": "ej: freelancers, dueños de negocio",
    "nivel_ingresos": "ej: $500-2000/mes",
    "plataformas": ["Instagram", "YouTube", "LinkedIn"]
  },
  "competidores": [
    { "nombre": "nombre", "precio": "$XX", "debilidad": "qué les falta" }
  ],
  "diferenciadores_posibles": ["diferenciador 1", "diferenciador 2", "diferenciador 3"],
  "palabras_clave": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "jtbd": "Cuando [situación], quiero [motivación] para [resultado esperado]"
}`

export async function runInvestigador(idea: string): Promise<InvestigadorOutput> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analiza esta idea de producto digital para el mercado hispanohablante:\n\n"${idea}"\n\nDevuelve SOLO el JSON.`,
      },
    ],
  })

  const raw = response.choices[0].message.content ?? '{}'
  return JSON.parse(raw) as InvestigadorOutput
}
