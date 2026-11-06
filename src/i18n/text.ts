// All interface text lives here. Components never hold their own wording.
export const text = {
  app: {
    name: 'MarcOna',
    description: 'Les marcones de la MarcOna: classificació, esdeveniments i jocs.',
    loading: 'Un moment…',
  },
  units: {
    marcones: { one: 'marcona', other: 'marcones' },
  },
  login: {
    title: 'Entra',
    username: "Nom d'usuari",
    password: 'Contrasenya',
    submit: 'Entra',
    submitting: 'Entrant…',
  },
  session: {
    logout: 'Surt',
    logoutLabel: 'Tanca la sessió',
  },
  tabs: {
    label: 'Navegació principal',
    ranking: 'Classificació',
    events: 'Esdeveniments',
    roulette: 'Ruleta',
    audit: 'Auditoria',
    admin: 'Administració',
  },
  ranking: {
    title: 'Classificació',
    emptyTitle: 'La taula està buida',
    emptyBody: 'Quan hi hagi més jugadors, la classificació apareixerà aquí.',
  },
  placeholder: {
    body: 'Aquesta pantalla arribarà aviat.',
  },
  errors: {
    invalidCredentials: "El nom d'usuari o la contrasenya no són correctes.",
    missingFields: "Escriu el nom d'usuari i la contrasenya.",
    rateLimited: 'Massa intents seguits. Espera uns minuts i torna-ho a provar.',
    network: 'No hi ha connexió. Comprova la xarxa i torna-ho a provar.',
    noProfile: "No hem trobat el teu perfil. Avisa l'administrador.",
    unknown: 'Alguna cosa ha fallat. Torna-ho a provar.',
  },
} as const
