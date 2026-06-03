import { redirect } from "next/navigation";

// Stránka osobních lekcí byla sloučena do nové Rezervace.
export default function OsobniLekcePage() {
  redirect("/rezervace");
}
