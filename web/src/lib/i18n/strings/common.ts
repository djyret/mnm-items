// Delade texter: meny, konto, roller, allmänna knappar. Svenska är källan; engelska måste ha samma nycklar.
// Nycklar: "<område>.<sak>". Variabler skrivs {namn} och ersätts av t(key, { namn }).

export const sv = {
  'app.name': 'Loot & Lore',
  'app.tagline': 'Monsters & Memories',
  'app.homeLabel': 'Loot & Lore – till startsidan',
  'app.headline': 'Loot & Lore – Monsters & Memories. Gängets förråd och krönika',
  'app.footer': 'Delad loot för framtida äventyr',
  'app.dbError': 'Kunde inte nå databasen: {error}',
  'app.skipToContent': 'Hoppa till innehållet',

  'nav.label': 'Huvudmeny',
  'nav.home': 'Hem',
  'nav.stash': 'Förråd',
  'nav.add': 'Lägg till',
  'nav.characters': 'Karaktärer',
  'nav.alts': 'Alts',
  'nav.sales': 'Försäljning',
  'nav.chronicle': 'Krönikan',
  'nav.help': 'Hjälp',

  'account.signIn': 'Logga in med Discord',
  'account.signOut': 'Logga ut',
  'account.admin': 'Admin',
  'account.signedIn': 'Inloggad',
  'account.pending': 'väntar på godkännande',
  'account.suspended': 'spärrad',
  'account.language': 'Språk',

  'role.visitor': 'Besökare',
  'role.reader': 'Läsare',
  'role.editor': 'Redaktör',
  'role.admin': 'Admin',

  'common.save': 'Spara',
  'common.cancel': 'Avbryt',
  'common.edit': 'Redigera',
  'common.delete': 'Ta bort',
  'common.loading': 'Laddar…',
  'common.back': 'Tillbaka',
} as const

export const en: { [K in keyof typeof sv]: string } = {
  'app.name': 'Loot & Lore',
  'app.tagline': 'Monsters & Memories',
  'app.homeLabel': 'Loot & Lore – to the start page',
  'app.headline': 'Loot & Lore – Monsters & Memories. The gang’s stash and chronicle',
  'app.footer': 'Shared loot for adventures to come',
  'app.dbError': 'Could not reach the database: {error}',
  'app.skipToContent': 'Skip to content',

  'nav.label': 'Main menu',
  'nav.home': 'Home',
  'nav.stash': 'Stash',
  'nav.add': 'Add item',
  'nav.characters': 'Characters',
  'nav.alts': 'Alts',
  'nav.sales': 'Sales',
  'nav.chronicle': 'Chronicle',
  'nav.help': 'Help',

  'account.signIn': 'Sign in with Discord',
  'account.signOut': 'Sign out',
  'account.admin': 'Admin',
  'account.signedIn': 'Signed in',
  'account.pending': 'awaiting approval',
  'account.suspended': 'suspended',
  'account.language': 'Language',

  'role.visitor': 'Visitor',
  'role.reader': 'Reader',
  'role.editor': 'Editor',
  'role.admin': 'Admin',

  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.edit': 'Edit',
  'common.delete': 'Delete',
  'common.loading': 'Loading…',
  'common.back': 'Back',
}
