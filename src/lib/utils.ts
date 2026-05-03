import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(new Date(date))
}

export const AGENT_LABELS = ['Investigador', 'Estratega', 'Creador', 'Vendedor'] as const
export const AGENT_DESCRIPTIONS = [
  'Analizando mercado y competencia',
  'Definiendo posicionamiento y precio',
  'Construyendo estructura del producto',
  'Escribiendo la página de ventas',
] as const
