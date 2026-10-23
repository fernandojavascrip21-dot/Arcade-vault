import type { AuthFieldProps } from "@/lib/interfaces/auth";

export const inputCls =
  "w-full border border-cian/30 bg-cian/5 px-3.5 py-3.5 text-[15px] text-foreground placeholder:text-texto-debil focus:border-cian focus:shadow-[0_0_20px_rgba(0,245,255,.4)]";
export const labelCls =
  "grid gap-2 text-xs uppercase tracking-[2px] text-texto-tenue";

export function AuthField({
  label,
  name,
  type = "text",
  ...rest
}: AuthFieldProps) {
  return (
    <label className={labelCls}>
      {label}
      <input name={name} type={type} className={inputCls} {...rest} />
    </label>
  );
}
