"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";

import type { UserAvatarProps, UserBadgeProps } from "@/lib/interfaces/session";

// Círculo con la foto de la cuenta; sin foto (o si no carga) muestra la inicial.
export function UserAvatar({ name, avatarUrl }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(avatarUrl) && failedUrl !== avatarUrl;

  return (
    <span
      aria-hidden
      className="grid h-[34px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-full border border-amarillo font-display text-[11px] text-amarillo [box-shadow:0_0_14px_rgba(245,255,0,.4)]"
    >
      {showPhoto ? (
        // Foto externa del proveedor (Google/GitHub): <img> evita configurar dominios.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(avatarUrl!)}
          className="h-full w-full object-cover"
        />
      ) : name ? (
        name.charAt(0).toUpperCase()
      ) : (
        "?"
      )}
    </span>
  );
}

const BADGE_LABELS = {
  active: "SESIÓN ACTIVA",
  guest: "INVITADO",
  pending: "SIN NOMBRE",
} as const;

// Chip de escritorio: avatar, nombre y estado de la sesión.
export function UserBadge({ name, status, avatarUrl }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-2.5 border border-cian/40 bg-cian/5 py-1.5 pl-1.5 pr-3">
      <UserAvatar name={name} avatarUrl={avatarUrl} />
      <span className="grid leading-tight">
        <span className="max-w-[150px] truncate text-[13px] tracking-wider">
          {name}
        </span>
        <span
          className={`flex items-center gap-1.5 text-[9px] tracking-[2px] ${
            status === "active" ? "text-cian" : "text-amarillo"
          }`}
        >
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"
          />
          {BADGE_LABELS[status]}
        </span>
      </span>
    </div>
  );
}

export function LogoutButton({
  onClick,
  fullWidth = false,
}: {
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar sesión"
      className={`flex items-center justify-center gap-2 whitespace-nowrap border border-magenta/70 px-3 py-2.5 font-display text-[9px] text-magenta transition-colors hover:bg-magenta/15 active:scale-95 ${
        fullWidth ? "w-full py-3.5" : ""
      }`}
    >
      <LogOut size={14} aria-hidden />
      SALIR
    </button>
  );
}
