// Fakturační identita živnostníka (jediný zdroj pravdy pro QR, e-mail i veřejnou fakturu).
// Údaje jsou veřejné (jsou na každé faktuře). Když se něco změní, uprav zde.
export const BUSINESS = {
  name: "Mgr. Jan Schröffel",
  address: "Chovatelů 159, Hradištko, 252 09",
  ico: "04531817",
  iban: "CZ4130300000003470043017",
  account: "3470043017/3030",
  vatNote: "Nejsem plátce DPH.",
  email: "schroffelh@seznam.cz",
} as const;
