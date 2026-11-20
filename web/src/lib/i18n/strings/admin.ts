// Texter för området admin. Svenska är källan; engelska måste ha samma nycklar.
// Nycklar: "admin.<sida eller komponent>.<sak>". Variabler skrivs {namn}.

export const sv = {
} as const

export const en: { [K in keyof typeof sv]: string } = {
}
