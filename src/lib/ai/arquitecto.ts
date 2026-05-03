import { deepseekJSON } from './deepseek'
import type { InvestigadorOutput } from './investigador'
import type { EstrategaOutput } from './estratega'

export interface SeccionBrief {
  orden: number
  tipo_seccion: 'intro' | 'capitulo' | 'modulo' | 'leccion' | 'seccion' | 'plantilla' | 'bonus' | 'conclusion'
  titulo: string
  brief: string
  palabras_objetivo: number
  puntos_clave: string[]
  es_pareto: boolean
}

export interface ArquitectoOutput {
  tipo_producto: string
  estructura_descripcion: string
  secciones: SeccionBrief[]
  bible: string
  total_palabras_estimado: number
}

const SYSTEM_PROMPT = `Eres el arquitecto jefe de productos digitales de alta conversion.

Tu trabajo es:
1. Disenar la estructura perfecta para el producto (modulos, capitulos, secciones)
2. Escribir la BIBLIA del producto — un documento de contexto compartido de 1500-2000 palabras que todos los escritores leeran para mantener coherencia
3. Escribir briefs detallados para cada seccion (150-200 palabras por brief)

TIPOS DE PRODUCTO y su estructura tipica:
- "ebook": 8-12 capitulos de 1500-2500 palabras c/u
- "curso online": 5-8 modulos, cada modulo con 2-4 lecciones de 1500-2000 palabras c/u
- "guia practica": 6-10 secciones de 1200-2000 palabras c/u
- "template pack": 4-8 plantillas con guias de uso de 800-1500 palabras c/u
- "workshop": 4-6 sesiones de 2000-3000 palabras c/u
- "membresia": contenido mensual organizado en modulos

LA BIBLIA debe contener:
- Nombre del producto y proposito central
- La gran promesa (transformacion antes/despues)
- El perfil detallado del avatar (quien es, que siente, que quiere)
- El marco metodologico central (el sistema/metodo propio del producto)
- Vocabulario clave y terminologia a usar consistentemente
- Tono y estilo: como hablar al lector
- Lo que el lector lograra al terminar
- Las 3-5 verdades fundamentales del producto

Devuelve JSON valido. Los strings no deben tener comillas dobles internas — usa comillas simples o reformula.`

export async function runArquitecto(
  idea: string,
  investigador: InvestigadorOutput,
  estratega: EstrategaOutput
): Promise<ArquitectoOutput> {
  const userContent = `IDEA ORIGINAL: "${idea}"

PRODUCTO:
- Nombre: ${estratega.nombre_producto}
- Subtitulo: ${estratega.subtitulo}
- Tipo: ${estratega.tipo_producto}
- Posicionamiento: ${estratega.posicionamiento}

TRANSFORMACION:
- Antes: ${estratega.promesa_before}
- Despues: ${estratega.promesa_after}
- Resultado visible: ${estratega.transformacion_visible}

AVATAR:
- ${estratega.avatar.nombre_ficticio}, ${estratega.avatar.edad}, ${estratega.avatar.ocupacion}
- Dolores: ${estratega.avatar.dolores.join(', ')}
- Deseos: ${estratega.avatar.deseos.join(', ')}
- Objeciones: ${estratega.avatar.objeciones.join(', ')}
- Frase: ${estratega.avatar.cita_directa}

MERCADO:
- Dolor principal: ${investigador.dolor_principal}
- JTBD: ${investigador.jtbd}
- Diferenciadores: ${investigador.diferenciadores_posibles.join(', ')}

Diseña la estructura completa y escribe la Biblia del producto. Cada seccion debe tener un brief detallado de 150-200 palabras.

Devuelve este JSON:
{
  "tipo_producto": "${estratega.tipo_producto}",
  "estructura_descripcion": "descripcion de 2 oraciones de la estructura",
  "bible": "LA BIBLIA COMPLETA DE 1500-2000 PALABRAS aqui — el documento de contexto compartido",
  "total_palabras_estimado": 20000,
  "secciones": [
    {
      "orden": 1,
      "tipo_seccion": "intro",
      "titulo": "Introduccion: [titulo evocador]",
      "brief": "Brief detallado de 150-200 palabras sobre que debe contener esta seccion, que transformacion produce, que puntos cubrir, como conectar con el lector",
      "palabras_objetivo": 1500,
      "puntos_clave": ["punto 1", "punto 2", "punto 3"],
      "es_pareto": false
    }
  ]
}`

  return deepseekJSON<ArquitectoOutput>(SYSTEM_PROMPT, userContent, 6000)
}
