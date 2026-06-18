const API =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";

export async function schoolRequest(
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(
    `${API}/api/school${path}`,
    {
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
      ...init,
    },
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Erro ${response.status}`,
    );
  }

  return data;
}
