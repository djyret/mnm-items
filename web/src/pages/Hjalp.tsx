import { Fragment, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { slotIcon } from '../lib/constants'
import type { Access } from '../lib/auth'
import { useI18n, type Key } from '../lib/i18n'
import { Icon } from '../components/Icon'

const UI = `${import.meta.env.BASE_URL}ui/`
const ICON = `${import.meta.env.BASE_URL}ikoner/`
/** Menyns ikonnamn där de skiljer sig från knappens gamla bildnamn */
const IKON: Record<string, string> = { 'alt-vy': 'alts', salda: 'forsaljning' }

/** En liten kopia av menyskylten, så man känner igen knappen. */
function Knapp({ namn, bild }: { namn: string; bild: string }) {
  const { t } = useI18n()
  return (
    <span className="menu-item menu-item--inline" role="img" aria-label={t('admin.help.buttonAlt', { name: namn })}>
      <img className="menu-item__ikon" src={`${UI}ikon-${IKON[bild] ?? bild}.webp`} alt="" />
      <span>{namn}</span>
    </span>
  )
}

/** Fetstil för en knapp eller ett fält på sidan. */
const B = ({ children }: { children: ReactNode }) => <b className="help-ui">{children}</b>
const Tangent = ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>

/**
 * Gör om en hjälptext från ordboken till JSX: <b>…</b> blir fetstil, <k>…</k> en tangent
 * och {namn} byts mot motsvarande nod i `delar` (bilder av menyknappar, länkar).
 */
function rich(text: string, delar: Record<string, ReactNode>): ReactNode {
  const out: ReactNode[] = []
  const re = /<(b|k)>(.*?)<\/\1>|\{(\w+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = out.length
    if (m[1] === 'b') out.push(<B key={key}>{m[2]}</B>)
    else if (m[1] === 'k') out.push(<Tangent key={key}>{m[2]}</Tangent>)
    else out.push(<Fragment key={key}>{delar[m[3]] ?? m[0]}</Fragment>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

interface Amne {
  id: string
  bild: string
  titel: Key
  kort: Key
  steg: Key[]
  tips?: Key
}

// id:t står i adressen (?amne=…) och hålls därför oförändrat
const AMNEN: Amne[] = [
  {
    id: 'lagg-till',
    bild: `${ICON}rulle.webp`,
    titel: 'admin.help.add.title',
    kort: 'admin.help.add.short',
    steg: [
      'admin.help.add.s1', 'admin.help.add.s2', 'admin.help.add.s3', 'admin.help.add.s4',
      'admin.help.add.s5', 'admin.help.add.s6', 'admin.help.add.s7', 'admin.help.add.s8',
    ],
    tips: 'admin.help.add.tip',
  },
  {
    id: 'hitta',
    bild: `${ICON}kista.webp`,
    titel: 'admin.help.find.title',
    kort: 'admin.help.find.short',
    steg: ['admin.help.find.s1', 'admin.help.find.s2', 'admin.help.find.s3', 'admin.help.find.s4', 'admin.help.find.s5'],
    tips: 'admin.help.find.tip',
  },
  {
    id: 'lana-ut',
    bild: `${slotIcon('HANDS')}`,
    titel: 'admin.help.lend.title',
    kort: 'admin.help.lend.short',
    steg: ['admin.help.lend.s1', 'admin.help.lend.s2', 'admin.help.lend.s3', 'admin.help.lend.s4'],
  },
  {
    id: 'flytta',
    bild: `${slotIcon('BACKPACK')}`,
    titel: 'admin.help.give.title',
    kort: 'admin.help.give.short',
    steg: ['admin.help.give.s1', 'admin.help.give.s2', 'admin.help.give.s3'],
  },
  {
    id: 'salja',
    bild: `${ICON}mynt.webp`,
    titel: 'admin.help.sell.title',
    kort: 'admin.help.sell.short',
    steg: [
      'admin.help.sell.s1', 'admin.help.sell.s2', 'admin.help.sell.s3',
      'admin.help.sell.s4', 'admin.help.sell.s5', 'admin.help.sell.s6',
    ],
    tips: 'admin.help.sell.tip',
  },
  {
    id: 'alt',
    bild: `${ICON}ryggsack.webp`,
    titel: 'admin.help.alt.title',
    kort: 'admin.help.alt.short',
    steg: [
      'admin.help.alt.s1', 'admin.help.alt.s2', 'admin.help.alt.s3', 'admin.help.alt.s4',
      'admin.help.alt.s5', 'admin.help.alt.s6', 'admin.help.alt.s7',
    ],
    tips: 'admin.help.alt.tip',
  },
  {
    id: 'karaktar',
    bild: `${ICON}hjalm.webp`,
    titel: 'admin.help.character.title',
    kort: 'admin.help.character.short',
    steg: ['admin.help.character.s1', 'admin.help.character.s2', 'admin.help.character.s3', 'admin.help.character.s4'],
  },
  {
    id: 'andra',
    bild: slotIcon('INVENTORY'),
    titel: 'admin.help.fix.title',
    kort: 'admin.help.fix.short',
    steg: ['admin.help.fix.s1', 'admin.help.fix.s2', 'admin.help.fix.s3', 'admin.help.fix.s4', 'admin.help.fix.s5'],
  },
]

const FRAGOR: [Key, Key][] = [
  ['admin.help.faq.cantEdit.q', 'admin.help.faq.cantEdit.a'],
  ['admin.help.faq.unsell.q', 'admin.help.faq.unsell.a'],
  ['admin.help.faq.stale.q', 'admin.help.faq.stale.a'],
  ['admin.help.faq.misread.q', 'admin.help.faq.misread.a'],
  ['admin.help.faq.paste.q', 'admin.help.faq.paste.a'],
  ['admin.help.faq.break.q', 'admin.help.faq.break.a'],
]

const STATUSAR = ['ledig', 'equippad', 'utlanad', 'reserverad', 'sald'] as const

const ROLLER: Access[] = ['visitor', 'reader', 'editor', 'admin']

export function Hjalp() {
  const { t } = useI18n()
  const [params, setParams] = useSearchParams()
  const amne = AMNEN.find((a) => a.id === params.get('amne'))
  const visa = (id: string | null) => {
    setParams(id ? { amne: id } : {})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const delar: Record<string, ReactNode> = {
    add: <Knapp namn={t('nav.add')} bild="lagg-till" />,
    stash: <Knapp namn={t('nav.stash')} bild="forrad" />,
    sales: <Knapp namn={t('nav.sales')} bild="salda" />,
    alts: <Knapp namn={t('nav.alts')} bild="alt-vy" />,
    characters: <Knapp namn={t('nav.characters')} bild="karaktarer" />,
    help: <Link to="/hjalp">{t('nav.help')}</Link>,
  }
  const text = (key: Key) => rich(t(key), delar)

  if (amne) {
    return (
      <div className="page help">
        <button type="button" className="btn btn--ghost" onClick={() => visa(null)}><Icon name="vanster" size={16} /> {t('admin.help.back')}</button>
        <div className="panel help-topic">
          <div className="help-topic__head">
            <img src={amne.bild} alt="" />
            <h1 className="page-title">{t(amne.titel)}</h1>
          </div>
          <ol className="help-steps">
            {amne.steg.map((s, i) => (
              <li key={s}>
                <span className="help-steps__nr">{i + 1}</span>
                <span className="help-steps__text">{text(s)}</span>
              </li>
            ))}
          </ol>
          {amne.tips && (
            <div className="help-tip">
              <b>{t('admin.help.tip')}</b> {text(amne.tips)}
            </div>
          )}
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => visa(null)}><Icon name="vanster" size={16} /> {t('admin.help.back')}</button>
      </div>
    )
  }

  return (
    <div className="page help">
      <h1 className="page-title">{t('admin.help.title')}</h1>
      <p className="help-intro">{t('admin.help.intro')}</p>
      <div className="help-tiles">
        {AMNEN.map((a) => (
          <button key={a.id} type="button" className="panel help-tile" onClick={() => visa(a.id)}>
            <img src={a.bild} alt="" />
            <span className="help-tile__title">{t(a.titel)}</span>
            <span className="help-tile__text">{t(a.kort)}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <h2 className="panel-title">{t('admin.help.account.title')}</h2>
        <p>{t('admin.help.account.intro')}</p>
        <dl className="help-faq">
          {ROLLER.map((r) => (
            <div key={r}>
              <dt>{t(`role.${r}`)}</dt>
              <dd>{t(`admin.help.account.${r}`)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel">
        <h2 className="panel-title">{t('admin.help.faq.title')}</h2>
        <dl className="help-faq">
          {FRAGOR.map(([f, s]) => (
            <div key={f}>
              <dt>{t(f)}</dt>
              <dd>{text(s)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel">
        <h2 className="panel-title">{t('admin.help.status.title')}</h2>
        <dl className="help-status">
          {STATUSAR.map((k) => (
            <div key={k}>
              <dt><span className={`badge badge--${k}`}>{t(`admin.help.status.${k}`)}</span></dt>
              <dd>{t(`admin.help.status.${k}.text`)}</dd>
            </div>
          ))}
        </dl>
        <p className="note">{text('admin.help.note')}</p>
      </div>
    </div>
  )
}
