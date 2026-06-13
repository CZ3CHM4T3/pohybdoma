// Předspouštěcí (preview) režim webu.
// Když je zapnutý: registrace je vypnutá a nepřihlášení návštěvníci vidí
// přepínač "Prohlížíš jako" (demo úrovně členství).
// Vypnutí při ostrém spuštění: ve Vercelu nastav NEXT_PUBLIC_PREVIEW_MODE=off
export const PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW_MODE !== "off";
