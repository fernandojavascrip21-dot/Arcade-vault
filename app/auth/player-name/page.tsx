import { redirect } from "next/navigation";

import { safeNext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/supabase/queries";

import { PlayerNameForm } from "./player-name-form";

export default async function PlayerNamePage({
  searchParams,
}: PageProps<"/auth/player-name">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth");

  // Con perfil ya creado no hay nada que elegir (y no se reenvía la bienvenida).
  if (await getProfile(data.user.id)) redirect("/");

  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);

  return <PlayerNameForm next={next ?? "/"} />;
}
