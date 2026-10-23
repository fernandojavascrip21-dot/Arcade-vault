import { safeNext } from "@/lib/auth";
import { AUTH_PAGE_NOTICES } from "@/lib/constants/auth";

import { AuthForm } from "./auth-form";

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const params = await searchParams;
  const errorParam = typeof params.error === "string" ? params.error : "";
  const nextParam = typeof params.next === "string" ? params.next : "";

  return (
    <AuthForm
      notice={AUTH_PAGE_NOTICES[errorParam] ?? null}
      offerResend={errorParam === "link-invalid"}
      next={safeNext(nextParam)}
    />
  );
}
