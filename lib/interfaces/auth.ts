// Interfaces de autenticación (spec 21).

export interface AuthFormState {
  ok: boolean;
  error?: string;
  message?: string;
}

export interface AuthCardProps {
  title?: string;
  children: React.ReactNode;
}

export interface AuthFieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface FormMessageProps {
  error?: string;
  message?: string;
}

export interface ResendFormProps {
  email?: string; // si se conoce, va oculto; si no, se pide en un campo
  startCooling?: boolean; // arranca ya con la espera (recién enviado el correo)
}

export interface AuthFormProps {
  notice: string | null; // aviso por ?error= (enlace vencido, OAuth)
  offerResend: boolean; // ofrecer pedir un nuevo enlace de confirmación
  next: string | null; // ruta interna a la que volver tras el acceso
}

// Resultado de comprobar la disponibilidad de un nombre de jugador.
export interface NameAvailability {
  name: string;
  available: boolean;
}

export interface PlayerNameFormProps {
  next: string; // ruta a la que ir tras crear el perfil
  email: string | null; // correo de la cuenta con la que se inició sesión
}

// Nombres libres propuestos cuando el elegido (`name`) ya está en uso.
export interface NameSuggestions {
  name: string;
  options: string[];
}
