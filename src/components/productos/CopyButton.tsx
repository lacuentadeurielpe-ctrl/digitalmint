'use client'

interface Props {
  text: string
  label: string
  small?: boolean
}

export default function CopyButton({ text, label, small }: Props) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text)}
      className={`${small ? 'text-xs px-2 py-1' : 'text-sm px-3 py-1.5'} rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition`}
    >
      {label}
    </button>
  )
}
