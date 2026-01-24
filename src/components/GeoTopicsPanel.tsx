import type { FC } from 'react'

interface TopicItem {
  name: string
  count: number
}

interface Props {
  title: string
  subtitle?: string
  topics: TopicItem[]
}

const fullFormatter = new Intl.NumberFormat('es-PR')

const GeoTopicsPanel: FC<Props> = ({ title, subtitle, topics }) => (
  <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm min-w-0'>
    <p className='text-xs font-semibold text-slate-600 uppercase tracking-[0.16em]'>{title}</p>
    {subtitle ? <p className='text-[11px] text-slate-500 mt-1'>{subtitle}</p> : null}
    <div className='mt-3 space-y-2'>
      {topics.map((topic) => (
        <div key={topic.name} className='flex items-center justify-between text-xs text-slate-600'>
          <span className='font-semibold text-slate-700'>{topic.name}</span>
          <span>{fullFormatter.format(topic.count)}</span>
        </div>
      ))}
      {!topics.length ? (
        <p className='text-xs text-slate-500'>Sin temas dominantes.</p>
      ) : null}
    </div>
  </div>
)

export default GeoTopicsPanel
