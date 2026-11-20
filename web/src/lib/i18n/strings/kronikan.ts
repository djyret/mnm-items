// Texter för området kronikan. Svenska är källan; engelska måste ha samma nycklar.
// Nycklar: "kronikan.<sida eller komponent>.<sak>". Variabler skrivs {namn}.

export const sv = {
} as const

export const en: { [K in keyof typeof sv]: string } = {
}
