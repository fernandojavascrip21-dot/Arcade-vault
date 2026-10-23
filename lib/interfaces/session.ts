// Interfaces de la sesión (spec 21).

export interface SessionValue {
  user: string | null; // nombre de jugador de la cuenta, o el nombre de invitado recordado
  email: string | null; // correo de la sesión real (aunque aún no tenga perfil)
  avatarUrl: string | null; // foto de la cuenta de Google/GitHub, si la hay
  isAuthenticated: boolean; // hay sesión real de Supabase con perfil
  needsPlayerName: boolean; // hay sesión real pero aún no hay perfil
  isGuest: boolean; // true tras "jugar como invitado"
  setName: (name: string) => void; // solo invitados
  playGuest: () => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>; // relee el perfil (tras crearlo en /auth/player-name)
}

// Estado de la cuenta real. El inicial (también el del servidor) es "sin sesión".
export interface AuthState {
  userId: string | null;
  email: string | null;
  avatarUrl: string | null;
  playerName: string | null;
  profileLoaded: boolean;
}

// Avatar y chip del jugador en el navbar.
export type UserBadgeStatus = "active" | "guest" | "pending";

export interface UserBadgeProps {
  name: string | null; // nombre de jugador, o el correo si aún no tiene perfil
  status: UserBadgeStatus; // cuenta con perfil, invitado o sesión sin nombre
  avatarUrl?: string | null;
}

export interface UserAvatarProps {
  name: string | null; // su inicial es el respaldo si no hay foto
  avatarUrl?: string | null;
}
