import { useState, useRef } from 'react'
import { useRoute } from '../hooks/useRoute'
import { useT } from '../hooks/useT'

export function ImportButton() {
  const { importGpx } = useRoute()
  const [imported, setImported] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const t = useT()

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await importGpx(file)
      setImported(true)
      setTimeout(() => setImported(false), 2000)
    } catch (err) {
      // El error ya se maneja en useRoute.importGpx
      console.error('Error importing GPX:', err)
    }

    // Resetear el input para permitir importar el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,application/gpx+xml"
        onChange={handleImport}
        className="hidden"
        aria-label={t.importGpx}
      />
      <button
        onClick={handleClick}
        className="flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl
          bg-white text-trail-600 text-sm font-semibold border-2 border-trail-600
          active:scale-95 transition-all min-h-[44px]
          shadow-sm"
      >
        {imported ? (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {t.imported}
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round"/>
            </svg>
            {t.importGpx}
          </>
        )}
      </button>
    </>
  )
}
