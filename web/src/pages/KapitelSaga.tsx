import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChapterTabs } from '../components/ChapterTabs'
import { Icon } from '../components/Icon'
import { formatDay, missingTables, sagaBlocks, weekday } from '../lib/kronikan'
import { supabase } from '../lib/supabase'
import type { Chapter } from '../lib/types'
import { MissingSetup } from './Kronikan'

/** Kvällen som saga: en lång pergamentsida att läsa i lugn och ro, utan väggen bredvid. */
export function KapitelSaga() {
  const { id } = useParams()
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    supabase.from('chronicle_chapters').select('*').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message)
      else setChapter(data as Chapter | null)
      setLoading(false)
    })
  }, [id])

  const blocks = useMemo(() => sagaBlocks(chapter?.saga ?? null), [chapter?.saga])

  if (missingTables(error ?? undefined)) return <div className="page"><h1 className="page-title">Krönikan</h1><MissingSetup /></div>
  if (!chapter || !id) {
    return (
      <div className="page">
        <div className="panel empty">{loading ? 'Laddar…' : <>Kapitlet finns inte. <Link to="/kronikan">Till krönikan</Link></>}</div>
      </div>
    )
  }

  return (
    <div className="page kr-read">
      <div className="kr-read__top">
        <Link to="/kronikan" className="back"><Icon name="vanster" size={14} /> Krönikan</Link>
        <span className="kr-read__actions"><ChapterTabs id={id} /></span>
      </div>

      <div className="kr-wood">
        <header className="kr-plaque kr-plaque--title">
          <h1>{chapter.title}</h1>
          <span className="kr-plaque__meta">
            {[[chapter.zone, chapter.subzone].filter(Boolean).join(' · '), `${weekday(chapter.played_on)} ${formatDay(chapter.played_on)}`].filter(Boolean).join(' — ')}
          </span>
        </header>

        <article className="kr-saga">
          {blocks.length ? (
            blocks.map((b, i) =>
              b.type === 'rubrik'
                ? <h2 key={i} className="kr-saga__rubrik">{b.text}</h2>
                : <p key={i} className={`kr-saga__p${i === 0 || blocks[i - 1].type === 'rubrik' ? ' kr-saga__p--forsta' : ''}`}>{b.text}</p>,
            )
          ) : (
            <div className="kr-scroll__empty">
              <p>Sagan om den här kvällen är inte skriven än.</p>
              <p>Låt krönikören skriva den i <Link to={`/kronikan/${id}/verkstad`}>verkstaden</Link> – knappen <b>Skriv sagan</b>.</p>
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
