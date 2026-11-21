// Texter för startsidan: karaktärsbladet för ens main och väggen med de senaste kvällarna.

export const sv = {
  'start.mainTitle': 'Din main',
  'start.openArmory': 'Öppna Armory',
  'start.changeMain': 'Byt main',
  'start.pickTitle': 'Välj din main',
  'start.pickIntro': 'Välj karaktären du spelar mest, så står den här varje gång du kommer in.',
  'start.pickLabel': 'Karaktär',
  'start.pickNone': 'Välj karaktär …',
  'start.pickSave': 'Spara',
  'start.pickError': 'Det gick inte att spara din main. Ladda om sidan och försök igen. Hjälper inte det: be en admin kolla att ditt konto är godkänt.',
  'start.noChars': 'Inga karaktärer än. Lägg till dem under Karaktärer.',
  'start.wallTitle': 'Senast på väggen',
  'start.wallEmpty': 'Inga kvällar uppspikade än.',
  'start.allEvenings': 'Alla kvällar',
  'start.readEvening': 'Läs kvällen',
} as const

export const en: { [K in keyof typeof sv]: string } = {
  'start.mainTitle': 'Your main',
  'start.openArmory': 'Open Armory',
  'start.changeMain': 'Change main',
  'start.pickTitle': 'Choose your main',
  'start.pickIntro': 'Pick the character you play the most, and it will be waiting here every time you come in.',
  'start.pickLabel': 'Character',
  'start.pickNone': 'Choose a character …',
  'start.pickSave': 'Save',
  'start.pickError': 'Your main could not be saved. Reload the page and try again. If that does not help, ask an admin to check that your account is approved.',
  'start.noChars': 'No characters yet. Add them under Characters.',
  'start.wallTitle': 'Latest on the wall',
  'start.wallEmpty': 'No evenings nailed up yet.',
  'start.allEvenings': 'All evenings',
  'start.readEvening': 'Read the evening',
}
