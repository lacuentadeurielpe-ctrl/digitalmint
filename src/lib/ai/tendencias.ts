import { deepseekText } from './deepseek'

export interface IdeaTendencia {
  titulo: string
  nicho: string
  audiencia: string
  dolor: string
  porque_ahora: string
  tipo_producto: string
  precio_estimado: string
  score_dolor: number      // 1-10: urgencia/intensidad del problema
  score_pago: number       // 1-10: historial de pago en esta categoría
  score_gap: number        // 1-10: ausencia de buenas soluciones
  score_audiencia: number  // 1-10: tamaño + claridad de audiencia
  score_timing: number     // 1-10: relevancia en el momento actual
  score_total: number      // 0-100: sellability score compuesto
  idea_prompt: string      // prompt listo para enviar al generador
}

export interface TendenciasOutput {
  ideas: IdeaTendencia[]
  contexto: string[]
  generado_en: string
  categoria: string
}

function extractBlock(raw: string, tag: string): string {
  const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)\\[\\/${tag}\\]`, 'i')
  const m = raw.match(regex)
  return m ? m[1].trim() : ''
}

function extractInt(raw: string, tag: string, fallback = 5): number {
  const val = extractBlock(raw, tag)
  const n = parseInt(val.replace(/\D/g, ''), 10)
  return isNaN(n) ? fallback : Math.min(10, Math.max(1, n))
}

function parseIdeas(raw: string): IdeaTendencia[] {
  // Match all [IDEA]...[/IDEA] blocks
  const blocks: string[] = []
  const re = /\[IDEA\]([\s\S]*?)\[\/IDEA\]/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    blocks.push(m[1])
  }

  return blocks.map(block => {
    const sd = extractInt(block, 'SCORE_DOLOR')
    const sp = extractInt(block, 'SCORE_PAGO')
    const sg = extractInt(block, 'SCORE_GAP')
    const sa = extractInt(block, 'SCORE_AUDIENCIA')
    const st = extractInt(block, 'SCORE_TIMING')
    // Weighted: pago > dolor > gap > audiencia > timing
    const total = Math.round((sd * 22 + sp * 28 + sg * 20 + sa * 18 + st * 12) / 10)

    return {
      titulo:          extractBlock(block, 'TITULO')      || 'Idea sin título',
      nicho:           extractBlock(block, 'NICHO')       || 'General',
      audiencia:       extractBlock(block, 'AUDIENCIA')   || '',
      dolor:           extractBlock(block, 'DOLOR')       || '',
      porque_ahora:    extractBlock(block, 'AHORA')       || '',
      tipo_producto:   extractBlock(block, 'TIPO')        || 'curso online',
      precio_estimado: extractBlock(block, 'PRECIO')      || '47-97',
      score_dolor:     sd,
      score_pago:      sp,
      score_gap:       sg,
      score_audiencia: sa,
      score_timing:    st,
      score_total:     total,
      idea_prompt:     extractBlock(block, 'PROMPT')      || extractBlock(block, 'TITULO'),
    }
  }).sort((a, b) => b.score_total - a.score_total)
}

function parseContexto(raw: string): string[] {
  const block = extractBlock(raw, 'CONTEXTO')
  if (!block) return []
  return block.split('|').map(s => s.trim()).filter(Boolean)
}

const BASE_SYSTEM = `Eres un analista de mercado y strategist de productos digitales para el mercado hispanohablante (México, Colombia, Argentina, Perú, Chile, España, Venezuela, Ecuador).

Tu método de análisis es EMPÍRICO: no dices qué está de moda — analizas qué DUELE lo suficiente para que la gente pague HOY.

Los 5 factores que determinan si una idea es vendible:
1. DOLOR (1-10): ¿Cuánto le duele a esta persona? ¿Tiene urgencia real de resolver esto?
2. PAGO (1-10): ¿Ya existe mercado pagante para este tipo de solución? ¿La gente históricamente paga por esto?
3. GAP (1-10): ¿Las soluciones gratuitas/baratas son malas? ¿Hay una brecha de calidad que un buen producto puede llenar?
4. AUDIENCIA (1-10): ¿Qué tan clara, grande y accesible es la audiencia? ¿Sabes exactamente dónde encontrarlos?
5. TIMING (1-10): ¿Por qué este problema es especialmente urgente en Mayo 2026?

Contexto de mercado Mayo 2026 (úsalo en tu análisis):
- Economía LatAm: inflación persistente, poder adquisitivo ajustado, boom del side hustle y trabajo remoto
- Plataformas: TikTok Shop en explosión en LatAm, Instagram monetización de reels, YouTube Shorts con monetización
- IA: ChatGPT/IA ya es mainstream → "cómo usar IA para ganar dinero" es demanda real, no hype
- Empleo: crisis de confianza en el empleo tradicional, muchos profesionales buscan independencia económica
- Educación: títulos universitarios perdiendo valor relativo frente a skills específicos y verificables
- Pequeños negocios: ferreterías, boutiques, restaurantes, etc. digitalizándose a la fuerza → mercado enorme de "cómo vender online"

IMPORTANTE — Criterios de calidad de la idea:
- El título DEBE usar fórmulas vendibles: "Cómo X sin Y", "El método de N pasos para X aunque Y", "De 0 a X en N días"
- La audiencia DEBE ser una persona específica, no "todos los emprendedores"
- El dolor DEBE expresarse en palabras que el cliente usaría para describir su problema
- NO incluir ideas genéricas como "curso de marketing" o "guía de Instagram" — siempre incluye el ángulo específico

Devuelve ÚNICAMENTE el formato de etiquetas indicado, sin texto libre adicional.`

function buildUserPrompt(categoria: string): string {
  const focusPart = categoria !== 'todos'
    ? `CATEGORÍA EXCLUSIVA: Todas las ideas deben ser sobre "${categoria}". Encuentra los ángulos más vendibles y específicos dentro de esa categoría.\n\n`
    : `Cubre variedad de categorías: ingresos online, marketing digital, productividad, salud/bienestar, finanzas personales, habilidades tech sin programar, madres emprendedoras, pequeños negocios.\n\n`

  return `${focusPart}Analiza el mercado hispanohablante en Mayo 2026 y genera 8 ideas de productos digitales ordenadas por sellability.

Para cada idea usa EXACTAMENTE este formato:

[IDEA]
[TITULO]título vendible usando fórmula probada — específico, con número o resultado concreto[/TITULO]
[NICHO]categoría breve (ej: "Freelancing", "Pequeños negocios", "Salud")[/NICHO]
[AUDIENCIA]descripción exacta del comprador — quién es, qué hace, cuál es su situación[/AUDIENCIA]
[DOLOR]el dolor específico en palabras del propio cliente — cómo lo describiría él/ella[/DOLOR]
[AHORA]por qué este problema es especialmente urgente o rentable en Mayo 2026[/AHORA]
[TIPO]tipo de producto digital (ebook, mini curso, template pack, membership, masterclass, etc.)[/TIPO]
[PRECIO]rango de precio en USD (ej: 47-97)[/PRECIO]
[SCORE_DOLOR]número del 1 al 10[/SCORE_DOLOR]
[SCORE_PAGO]número del 1 al 10[/SCORE_PAGO]
[SCORE_GAP]número del 1 al 10[/SCORE_GAP]
[SCORE_AUDIENCIA]número del 1 al 10[/SCORE_AUDIENCIA]
[SCORE_TIMING]número del 1 al 10[/SCORE_TIMING]
[PROMPT]idea lista para el generador: describe el producto en 2-3 oraciones incluyendo la audiencia específica, el problema que resuelve y el resultado que promete[/PROMPT]
[/IDEA]

Al final incluye 3 insights de mercado separados por |:
[CONTEXTO]insight uno sobre el mercado actual|insight dos sobre oportunidades no obvias|insight tres sobre qué está cambiando y por qué importa[/CONTEXTO]`
}

export async function runTendencias(categoria = 'todos'): Promise<TendenciasOutput> {
  const raw = await deepseekText(BASE_SYSTEM, buildUserPrompt(categoria), 4500)

  const ideas = parseIdeas(raw)
  const contexto = parseContexto(raw)

  // Fallback ideas if parsing fails
  if (ideas.length === 0) {
    return {
      ideas: [{
        titulo: 'Cómo conseguir tus primeros 3 clientes freelance sin experiencia previa ni portafolio',
        nicho: 'Freelancing',
        audiencia: 'Profesionales con habilidades que quieren trabajar por cuenta propia',
        dolor: 'Sé que tengo habilidades para ofrecer servicios, pero no sé cómo conseguir clientes sin experiencia demostrable',
        porque_ahora: 'El mercado remoto está saturado de oferta pero la demanda de freelancers especializados crece; quien aprenda a posicionarse gana',
        tipo_producto: 'mini curso online',
        precio_estimado: '47-97',
        score_dolor: 9, score_pago: 8, score_gap: 7, score_audiencia: 9, score_timing: 8,
        score_total: 82,
        idea_prompt: 'Quiero crear un mini curso para personas con habilidades (diseño, redacción, programación, marketing) que quieren conseguir sus primeros 3 clientes freelance en 30 días sin tener portafolio ni experiencia previa demostrable.',
      }],
      contexto: ['El mercado de productos digitales en español crece 40% anual', 'La mayoría de cursos en español son de baja calidad — hay oportunidad de mercado', 'Los compradores latinoamericanos prefieren resultados rápidos y específicos sobre contenido académico'],
      generado_en: new Date().toISOString(),
      categoria,
    }
  }

  return {
    ideas,
    contexto: contexto.length > 0 ? contexto : ['Mercado hispanohablante con alta demanda de productos digitales en nichos específicos', 'Oportunidad en productos que prometen resultados concretos y medibles', 'Buyers quieren speed-to-result: cuanto más rápido el resultado prometido, más vende'],
    generado_en: new Date().toISOString(),
    categoria,
  }
}
