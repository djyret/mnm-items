// Samlar alla områdens ordböcker. Lägg till ett nytt område: skapa ./<område>.ts med `sv` och `en`
// (samma mönster som common.ts), importera det här och lägg det i båda objekten.
import * as common from './common'
import * as forradet from './forradet'
import * as kronikan from './kronikan'
import * as admin from './admin'
import * as armory from './armory'
import * as start from './start'

export const strings = {
  sv: { ...common.sv, ...forradet.sv, ...kronikan.sv, ...admin.sv, ...armory.sv, ...start.sv },
  en: { ...common.en, ...forradet.en, ...kronikan.en, ...admin.en, ...armory.en, ...start.en },
}

export type Key = keyof typeof strings.sv
