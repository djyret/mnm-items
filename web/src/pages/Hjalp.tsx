import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { slotIcon } from '../lib/constants'

const MENU = `${import.meta.env.BASE_URL}ikoner/meny/`
const ICON = `${import.meta.env.BASE_URL}ikoner/`

/** Bild av en menyknapp, så man känner igen den. */
function Knapp({ namn, bild }: { namn: string; bild: string }) {
  return <img className="help-btnpic" src={`${MENU}${bild}.webp`} alt={`knappen ${namn}`} title={namn} />
}

/** Fetstil för en knapp eller ett fält på sidan. */
const B = ({ children }: { children: ReactNode }) => <b className="help-ui">{children}</b>
const Tangent = ({ children }: { children: ReactNode }) => <kbd>{children}</kbd>

interface Amne {
  id: string
  titel: string
  bild: string
  kort: string
  steg: ReactNode[]
  tips?: ReactNode
}

const AMNEN: Amne[] = [
  {
    id: 'lagg-till',
    titel: 'Lägga in ett nytt item',
    bild: `${ICON}rulle.webp`,
    kort: 'Ta en bild på itemet i spelet och spara det här.',
    steg: [
      <>I spelet: håll musen över itemet så att rutan med stats syns.</>,
      <>Tryck <Tangent>Windows</Tangent> + <Tangent>Shift</Tangent> + <Tangent>S</Tangent> samtidigt. Skärmen blir grå.</>,
      <>Dra med musen en ruta runt itemets stats-ruta. Släpp musknappen.</>,
      <>Gå till den här sidan och klicka på <Knapp namn="Lägg till" bild="lagg-till" /></>,
      <>Tryck <Tangent>Ctrl</Tangent> + <Tangent>V</Tangent>. Vänta några sekunder – sidan läser av bilden själv.</>,
      <>Titta på rutan till vänster. Ser namnet och siffrorna rätt ut? Om något är fel kan du ändra det i fälten till höger.</>,
      <>Längst ner vid <B>Finns på karaktär</B>: välj vilken karaktär som har itemet.</>,
      <>Klicka på den guldiga knappen <B>Spara item</B>. Klart!</>,
    ],
    tips: <>Sidan kommer ihåg vilken karaktär du valde förra gången. Lägger du in många items på samma karaktär behöver du bara kontrollera och trycka <B>Spara item</B>.</>,
  },
  {
    id: 'hitta',
    titel: 'Hitta ett item',
    bild: `${ICON}kista.webp`,
    kort: 'Sök på namn eller visa bara det du är intresserad av.',
    steg: [
      <>Klicka på <Knapp namn="Förråd" bild="forrad" /></>,
      <>Skriv en del av namnet i rutan <B>Sök</B> till vänster. Listan ändras direkt.</>,
      <>Vill du bara se till exempel hjälmar? Välj <B>HEAD</B> under <B>Slot</B>.</>,
      <>Vill du se vad en viss klass kan använda? Klicka på klassens bild under <B>Kan användas av klass</B>. Klicka igen för att ta bort.</>,
      <>Klicka på ett item för att se allt om det.</>,
    ],
    tips: <>Ser listan konstig ut efter att du filtrerat? Klicka på <B>Rensa filter</B> längst ner till vänster.</>,
  },
  {
    id: 'lana-ut',
    titel: 'Låna ut till en annan karaktär',
    bild: `${slotIcon('HANDS')}`,
    kort: 'När någon annan får använda ett item en tid.',
    steg: [
      <>Klicka på <Knapp namn="Förråd" bild="forrad" /> och sedan på itemet.</>,
      <>Till höger, vid <B>Låna ut till…</B>: välj karaktären som ska låna.</>,
      <>Klicka på <B>Låna ut</B>.</>,
      <>När itemet kommer tillbaka: öppna itemet igen och klicka på <B>Tillbaka till …</B></>,
    ],
  },
  {
    id: 'flytta',
    titel: 'Ge bort ett item för gott',
    bild: `${slotIcon('BACKPACK')}`,
    kort: 'När itemet byter ägare och inte ska tillbaka.',
    steg: [
      <>Öppna itemet (klicka på det i <Knapp namn="Förråd" bild="forrad" />).</>,
      <>Vid <B>Flytta permanent till…</B>: välj den nya ägaren.</>,
      <>Klicka på <B>Flytta</B>.</>,
    ],
  },
  {
    id: 'salja',
    titel: 'Sälja ett item',
    bild: `${ICON}mynt.webp`,
    kort: 'Skriv in vad du fick för det, så räknas allt ihop.',
    steg: [
      <>Sälj itemet i spelet som vanligt.</>,
      <>Öppna itemet här (klicka på det i <Knapp namn="Förråd" bild="forrad" />).</>,
      <>Vid <B>Såld för</B> finns fyra rutor: <B>Platinum</B>, <B>Guld</B>, <B>Silver</B> och <B>Koppar</B>. Skriv priset du fick i rätt ruta. Exempel: 75 silver – skriv <B>75</B> i silverrutan. Lämnar du rutorna tomma används riktpriset.</>,
      <>Skriv gärna vem som köpte i rutan <B>Såld till</B> (behövs inte).</>,
      <>Klicka på <B>Markera såld</B>.</>,
      <>Vill du se allt ni sålt och hur mycket det blivit? Klicka på <Knapp namn="Försäljning" bild="salda" /></>,
    ],
    tips: <>Vet du vad ett item brukar gå för? Skriv det vid <B>Riktpris</B> och tryck <B>Spara riktpris</B> – då ser alla det, och sidan varnar om någon säljer billigare. 100 koppar = 1 silver, 100 silver = 1 guld, 100 guld = 1 platinum.</>,
  },
  {
    id: 'alt',
    titel: 'Vad kan min alt använda – och låna det',
    bild: `${ICON}ryggsack.webp`,
    kort: 'Se vad som passar en karaktär och be om att få låna det.',
    steg: [
      <>Klicka på <Knapp namn="Alts" bild="alt-vy" /></>,
      <>Klicka på karaktären du vill kolla.</>,
      <>Nu visas allt som karaktären kan använda, sorterat efter var det sitter (huvud, fötter …). Bästa först.</>,
      <>Vill du låna något? Klicka i den lilla rutan uppe till höger på itemet. Rutan får en bock.</>,
      <>Längst ner på sidan finns nu ett färdigt meddelande. Klicka på <B>Kopiera allt</B>.</>,
      <>Gå till Discord och tryck <Tangent>Ctrl</Tangent> + <Tangent>V</Tangent> och skicka. Då ser alla vad de ska plocka ut ur banken åt dig.</>,
      <>Klicka gärna på <B>Markera som reserverade</B>, så vet de andra att itemen är på väg till dig.</>,
    ],
    tips: <>Karaktären måste ha en klass vald, annars visas allt. Klass väljer du under <Knapp namn="Karaktärer" bild="karaktarer" /></>,
  },
  {
    id: 'karaktar',
    titel: 'Lägga till en karaktär',
    bild: `${ICON}hjalm.webp`,
    kort: 'När någon gör en ny alt.',
    steg: [
      <>Klicka på <Knapp namn="Karaktärer" bild="karaktarer" /></>,
      <>Klicka på <B>+ Ny karaktär</B> uppe till höger.</>,
      <>Skriv namnet. Klicka på bilden för klassen. Fyll i ras och level om du vill.</>,
      <>Klicka på <B>Spara</B>.</>,
    ],
  },
  {
    id: 'andra',
    titel: 'Rätta eller ta bort ett item',
    bild: slotIcon('INVENTORY'),
    kort: 'Om något blev fel när det lades in.',
    steg: [
      <>Öppna itemet (klicka på det i <Knapp namn="Förråd" bild="forrad" />).</>,
      <>Klicka på <B>Redigera</B>.</>,
      <>Ändra det som är fel. Slot och klasser väljer du genom att klicka på bilderna.</>,
      <>Klicka på <B>Spara</B>.</>,
      <>Ska itemet bort helt? Klicka på den röda knappen <B>Ta bort</B> och svara <B>OK</B>. Det går inte att ångra.</>,
    ],
  },
]

const FRAGOR: [string, ReactNode][] = [
  ['Jag markerade fel item som sålt', <>Öppna itemet och klicka på <B>Ångra såld</B>.</>],
  ['Sidan ser gammal ut eller något saknas', <>Tryck <Tangent>Ctrl</Tangent> + <Tangent>F5</Tangent> så hämtas den senaste versionen.</>],
  ['Bilden lästes av fel', <>Ändra fälten för hand innan du sparar, eller öppna itemet senare och klicka <B>Redigera</B>.</>],
  ['Ctrl + V gör ingenting', <>Kontrollera att du tog bilden med <Tangent>Windows</Tangent> + <Tangent>Shift</Tangent> + <Tangent>S</Tangent> precis innan. Du kan också dra in en bildfil, eller klicka i den stora rutan och välja en fil.</>],
  ['Kan jag förstöra något?', <>Det enda som inte går att ångra är <B>Ta bort</B>. Allt annat går att ändra tillbaka.</>],
]

const STATUSAR: [string, string, string][] = [
  ['ledig', 'Ledig', 'Ligger hos ägaren och används inte.'],
  ['equippad', 'Equippad', 'Ägaren har den på sig.'],
  ['utlanad', 'Utlånad', 'Någon annan lånar den just nu.'],
  ['reserverad', 'Reserverad', 'Sparas åt någon.'],
  ['sald', 'Såld', 'Är såld och borta.'],
]

export function Hjalp() {
  const [params, setParams] = useSearchParams()
  const amne = AMNEN.find((a) => a.id === params.get('amne'))
  const visa = (id: string | null) => {
    setParams(id ? { amne: id } : {})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (amne) {
    return (
      <div className="page help">
        <button type="button" className="btn btn--ghost" onClick={() => visa(null)}>← Tillbaka till alla ämnen</button>
        <div className="panel help-topic">
          <div className="help-topic__head">
            <img src={amne.bild} alt="" />
            <h1 className="page-title">{amne.titel}</h1>
          </div>
          <ol className="help-steps">
            {amne.steg.map((s, i) => (
              <li key={i}>
                <span className="help-steps__nr">{i + 1}</span>
                <span className="help-steps__text">{s}</span>
              </li>
            ))}
          </ol>
          {amne.tips && (
            <div className="help-tip">
              <b>Tips:</b> {amne.tips}
            </div>
          )}
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => visa(null)}>← Tillbaka till alla ämnen</button>
      </div>
    )
  }

  return (
    <div className="page help">
      <h1 className="page-title">Hjälp – vad vill du göra?</h1>
      <p className="help-intro">Klicka på det du vill göra, så visas det steg för steg.</p>
      <div className="help-tiles">
        {AMNEN.map((a) => (
          <button key={a.id} type="button" className="panel help-tile" onClick={() => visa(a.id)}>
            <img src={a.bild} alt="" />
            <span className="help-tile__title">{a.titel}</span>
            <span className="help-tile__text">{a.kort}</span>
          </button>
        ))}
      </div>

      <div className="panel">
        <h2 className="panel-title">Om något går fel</h2>
        <dl className="help-faq">
          {FRAGOR.map(([f, s]) => (
            <div key={f}>
              <dt>{f}</dt>
              <dd>{s}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="panel">
        <h2 className="panel-title">Vad betyder orden på itemen?</h2>
        <dl className="help-status">
          {STATUSAR.map(([k, namn, text]) => (
            <div key={k}>
              <dt><span className={`badge badge--${k}`}>{namn}</span></dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
        <p className="note">
          Ser du något du inte förstår? Fråga i gruppen – och tryck på <Link to="/hjalp">Hjälp</Link> igen när du vill.
        </p>
      </div>
    </div>
  )
}
