// Interfaces de la sesión (spec 21).

export interface SessionValue {
  user: string | null; // nombre de jugador de la cuenta, o el nombre de invitado recordado
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
  playerName: string | null;
  profileLoaded: boolean;
}
