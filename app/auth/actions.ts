"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  isValidEmail,
  safeNext,
  translateAuthError,
  validatePassword,
} from "@/lib/auth";
import type { AuthFormState } from "@/lib/interfaces/auth";
import {
  GENERIC_AUTH_ERROR,
  NAME_TAKEN_ERROR,
  NEUTRAL_RESEND_MESSAGE,
  NEUTRAL_RESET_MESSAGE,
  OAUTH_QUERY_PARAMS,
  PLAYER_NAME_CREATED_MESSAGE,
} from "@/lib/constants/auth";
import {
  GUEST_NAME,
  normalizePlayerName,
  validatePlayerName,
} from "@/lib/player-name";
import type { SupabaseServerClient } from "@/lib/interfaces/supabase";
import { getSiteUrl } from "@/lib/site-url";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isPlayerNameAvailable } from "@/lib/supabase/queries";

// Origen público fijo (spec 24); null si SITE_URL no es válida (falla cerrado).
function siteUrlOrNull(): string | null {
  try {
    return getSiteUrl();
  } catch (err) {
    console.error("[auth] SITE_URL:", err);
    return null;
  }
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Destino tras un acceso: sin perfil → elegir nombre; con perfil → `next` o "/".
async function destinationAfterSignIn(
  supabase: SupabaseServerClient,
  userId: string,
  next: string | null,
): Promise<string> {
  const profile = await getProfile(userId, supabase);
  if (!profile) return "/auth/player-name";
  return next ?? "/";
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");
  const next = safeNext(text(formData, "next"));

  if (!isValidEmail(email) || !password) {
    return { ok: false, error: "Escribe tu correo y tu contraseña." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    // Solo llega aquí con credenciales correctas: no revela si el correo existe.
    if (error?.code === "email_not_confirmed") {
      redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
    }
    return { ok: false, error: translateAuthError(error?.code) };
  }

  let destination: string;
  try {
    destination = await destinationAfterSignIn(supabase, data.user.id, next);
  } catch {
    destination = next ?? "/";
  }
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").trim().toLowerCase();
  const password = text(formData, "password");

  if (!isValidEmail(email)) {
    return { ok: false, error: "El correo no es válido." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };

  const siteUrl = siteUrlOrNull();
  if (!siteUrl) return { ok: false, error: GENERIC_AUTH_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });

  // Un correo ya registrado no devuelve error: misma respuesta que uno nuevo.
  if (error && error.code !== "user_already_exists") {
    return { ok: false, error: translateAuthError(error.code) };
  }
  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

export async function signInWithProviderAction(
  formData: FormData,
): Promise<void> {
  const provider = text(formData, "provider");
  if (provider !== "google" && provider !== "github") {
    redirect("/auth?error=oauth");
  }
  const next = safeNext(text(formData, "next"));
  const siteUrl = siteUrlOrNull();
  if (!siteUrl) redirect("/auth?error=oauth");
  const callback = new URL(`${siteUrl}/auth/callback`);
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback.toString(),
      queryParams: { ...OAUTH_QUERY_PARAMS },
    },
  });
  if (error || !data.url) redirect("/auth?error=oauth");
  redirect(data.url);
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "El correo no es válido." };
  }

  const siteUrl = siteUrlOrNull();
  if (!siteUrl) return { ok: false, error: GENERIC_AUTH_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/auth/reset-password`,
  });
  // Solo se muestran los límites de envío; el resto recibe la respuesta neutra.
  if (
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "over_request_rate_limit"
  ) {
    return { ok: false, error: translateAuthError(error.code) };
  }
  return { ok: true, message: NEUTRAL_RESET_MESSAGE };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = text(formData, "password");
  const confirm = text(formData, "confirm");

  const passwordError = validatePassword(password);
  if (passwordError) return { ok: false, error: passwordError };
  if (password !== confirm) {
    return { ok: false, error: "Las contraseñas no coinciden." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: translateAuthError("session_not_found") };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: translateAuthError(error.code) };

  let destination = "/";
  try {
    destination = await destinationAfterSignIn(supabase, auth.user.id, null);
  } catch {}
  revalidatePath("/", "layout");
  redirect(destination);
}

export async function claimPlayerNameAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { ok: false, error: translateAuthError("session_not_found") };
  }

  const name = normalizePlayerName(text(formData, "playerName"));
  const nameError = validatePlayerName(name);
  if (nameError) return { ok: false, error: nameError };
  if (name === GUEST_NAME) {
    return { ok: false, error: "Ese nombre no está disponible." };
  }

  try {
    // Si ya tiene perfil no se crea otro (ni, más adelante, se reenvía correo).
    if (await getProfile(auth.user.id, supabase)) {
      return { ok: true, message: PLAYER_NAME_CREATED_MESSAGE };
    }
    if (!(await isPlayerNameAvailable(name, supabase))) {
      return { ok: false, error: NAME_TAKEN_ERROR };
    }
    const { error } = await supabase
      .from("profiles")
      .insert({ user_id: auth.user.id, player_name: name });
    if (error) {
      // 23505: otro usuario lo tomó entre la comprobación y el insert.
      return {
        ok: false,
        error: error.code === "23505" ? NAME_TAKEN_ERROR : GENERIC_AUTH_ERROR,
      };
    }
  } catch {
    return { ok: false, error: GENERIC_AUTH_ERROR };
  }

  // Bienvenida best effort, una sola vez: solo llega aquí quien acaba de crear
  // su perfil. `after` la envía sin bloquear ni cambiar la respuesta.
  const email = auth.user.email;
  if (email) {
    const siteUrl = siteUrlOrNull();
    if (!siteUrl) return { ok: true, message: PLAYER_NAME_CREATED_MESSAGE };
    after(() => sendWelcomeEmail(email, name, siteUrl));
  }

  revalidatePath("/", "layout");
  return { ok: true, message: PLAYER_NAME_CREATED_MESSAGE };
}

export async function resendConfirmationAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return { ok: false, error: "El correo no es válido." };
  }

  const siteUrl = siteUrlOrNull();
  if (!siteUrl) return { ok: false, error: GENERIC_AUTH_ERROR };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback` },
  });
  if (
    error?.code === "over_email_send_rate_limit" ||
    error?.code === "over_request_rate_limit"
  ) {
    return { ok: false, error: translateAuthError(error.code) };
  }
  if (error) return { ok: false, error: GENERIC_AUTH_ERROR };
  return { ok: true, message: NEUTRAL_RESEND_MESSAGE };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
