interface Props {
  value: string       // comma-separated, e.g. "Drama, Thriller"
  onChange: (value: string) => void
  suggestions: string[]
  label?: string
}

function parseTagString(raw: string): string[] {
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
}

function buildTagString(tags: string[]): string {
  return tags.join(', ')
}

export function TagPicker({ value, onChange, suggestions, label }: Props) {
  const selected = parseTagString(value)

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter(t => t !== tag)
      : [...selected, tag]
    onChange(buildTagString(next))
  }

  return (
    <div>
      {label && <label className="text-xs text-white/40 mb-2 block">{label}</label>}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map(tag => {
          const active = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors active:scale-95 ${
                active
                  ? 'bg-accent/20 text-accent border border-accent/40'
                  : 'bg-surface-200/60 text-white/50 border border-white/8 active:text-white/80'
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}
