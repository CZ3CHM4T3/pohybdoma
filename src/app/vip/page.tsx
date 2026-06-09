import { redirect } from "next/navigation";

// Stará stránka /vip je nahrazená sekcí Členství + VIP+ Klubem.
export default function VipPage() {
  redirect("/clenstvi");
}
