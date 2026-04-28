function getTokenPayload(): Record<string, unknown> | null {
  const token = localStorage.getItem("taskflow_token");
  if (!token) return null;
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function getTokenEmail(): string | null {
  const payload = getTokenPayload();
  return (payload?.email as string | undefined) ?? null;
}

export function getTokenUserId(): string | null {
  const payload = getTokenPayload();
  return (payload?.sub as string | undefined) ?? null;
}

export function emailInitial(email: string | null): string {
  return email ? email.charAt(0).toUpperCase() : "?";
}
