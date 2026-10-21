"use server";

import { headers } from "next/headers";
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
  NEUTRAL_RESEND_MESSAGE,
  NEUTRAL_RESET_MESSAGE,
  PLAYER_NAME_CREATED_MESSAGE,
} from "@/lib/constants/auth";
import {
  GUEST_NAME,
  normalizePlayerName,
  validatePlayerName,
} from "@/lib/player-name";
import { sendWelcomeEmail } from "@/lib/email/welcome";
import { createClient } from "@/lib/supabase/server";
import { getProfile, isPlayerNameAvailable } from "@/lib/supabase/queries";

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Origen público del sitio para los enlaces de los correos y OAuth.
async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

// Destino tras un acceso: sin perfil → elegir nombre; con perfil → `next` o "/".
async function destinationAfterSignIn(
  userId: string,
  next: string | null,
): Promise<string> {
  const profile = await getProfile(userId);
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
    destination = await destinationAfterSignIn(data.user.id, next);
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await getOrigin()}/auth/callback` },
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
  const callback = new URL(`${await getOrigin()}/auth/callback`);
  if (next) callback.searchParams.set("next", next);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/auth/reset-password`,
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
    destination = await destinationAfterSignIn(auth.user.id, null);
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
    if (await getProfile(auth.user.id)) {
      return { ok: true, message: PLAYER_NAME_CREATED_MESSAGE };
    }
    if (!(await isPlayerNameAvailable(name))) {
      return { ok: false, error: "Ese nombre ya está en uso." };
    }
    const { error } = await supabase
      .from("profiles")
      .insert({ user_id: auth.user.id, player_name: name });
    if (error) {
      // 23505: otro usuario lo tomó entre la comprobación y el insert.
      return {
        ok: false,
        error:
          error.code === "23505"
            ? "Ese nombre ya está en uso."
            : GENERIC_AUTH_ERROR,
      };
    }
  } catch {
    return { ok: false, error: GENERIC_AUTH_ERROR };
  }

  // Bienvenida best effort, una sola vez: solo llega aquí quien acaba de crear
  // su perfil. `after` la envía sin bloquear ni cambiar la respuesta.
  const email = auth.user.email;
  if (email) {
    const siteUrl = await getOrigin();
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

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await getOrigin()}/auth/callback` },
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
