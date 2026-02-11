import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'

interface Props {
  left: ReactNode
  right: ReactNode
  storageKey: string
  className?: string
  leftClassName?: string
  rightClassName?: string
  defaultRatio?: number
  minRatio?: number
  maxRatio?: number
  separatorTitle?: string
}

const clampRatio = (value: number, minRatio: number, maxRatio: number) =>
  Math.min(maxRatio, Math.max(minRatio, value))

const readRatio = (
  storageKey: string,
  defaultRatio: number,
  minRatio: number,
  maxRatio: number
) => {
  if (typeof window === 'undefined') return defaultRatio
  const raw = window.localStorage.getItem(storageKey)
  const parsed = raw ? Number(raw) : Number.NaN
  if (!Number.isFinite(parsed)) return defaultRatio
  return clampRatio(parsed, minRatio, maxRatio)
}

const ResizableHorizontalSplit: FC<Props> = ({
  left,
  right,
  storageKey,
  className,
  leftClassName,
  rightClassName,
  defaultRatio = 0.5,
  minRatio = 0.25,
  maxRatio = 0.75,
  separatorTitle = 'Arrastra para ajustar',
}) => {
  const [splitRatio, setSplitRatio] = useState(() =>
    readRatio(storageKey, defaultRatio, minRatio, maxRatio)
  )
  const [isResizing, setIsResizing] = useState(false)
  const [isWide, setIsWide] = useState(false)
  const layoutRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(min-width: 1280px)')
    const sync = () => setIsWide(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, String(splitRatio))
  }, [storageKey, splitRatio])

  useEffect(() => {
    if (!isResizing) return
    const handleMove = (event: PointerEvent) => {
      if (!layoutRef.current) return
      const rect = layoutRef.current.getBoundingClientRect()
      if (!rect.width) return
      const ratio = (event.clientX - rect.left) / rect.width
      setSplitRatio(clampRatio(ratio, minRatio, maxRatio))
    }
    const handleUp = () => setIsResizing(false)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [isResizing, minRatio, maxRatio])

  const gridTemplateColumns = `${Math.round(splitRatio * 100)}% 12px ${Math.round(
    (1 - splitRatio) * 100
  )}%`

  return (
    <div
      ref={layoutRef}
      className={`grid gap-4 xl:gap-0 ${className ?? ''}`}
      style={isWide ? { gridTemplateColumns } : undefined}
    >
      <div className={`min-w-0 ${leftClassName ?? ''}`}>{left}</div>
      <div
        role='separator'
        aria-orientation='vertical'
        className={`hidden xl:flex items-center justify-center ${
          isResizing ? 'bg-prBlue/10' : 'bg-transparent'
        }`}
      >
        <button
          type='button'
          onPointerDown={() => setIsResizing(true)}
          className='h-24 w-2 cursor-col-resize rounded-full bg-slate-200 transition-colors hover:bg-prBlue/40'
          title={separatorTitle}
          aria-label={separatorTitle}
        />
      </div>
      <div className={`min-w-0 ${rightClassName ?? ''}`}>{right}</div>
    </div>
  )
}

export default ResizableHorizontalSplit
