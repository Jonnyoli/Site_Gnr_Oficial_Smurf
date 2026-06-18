export const DISCIPLINARY_CHANNEL_ID = "1326660033005486090";

export const DISCIPLINARY_ROLES = {
  FIRST_WARNING: { roleId: "1147878941684682878", label: "1.ª Repreensão Escrita", title: "1º REPREENSÃO ESCRITA" },
  SECOND_WARNING: { roleId: "1147878941684682877", label: "2.ª Repreensão Escrita", title: "2º REPREENSÃO ESCRITA" },
  SUSPENSION: { roleId: "1147878941684682875", label: "Suspensão de Serviço", title: "SUSPENSÃO DE SERVIÇO" },
};

export const DISCIPLINARY_ROLE_LIST = Object.entries(DISCIPLINARY_ROLES).map(
  ([type, data]) => ({ type, ...data })
);

export function getRoleConfigByRoleId(roleId) {
  return DISCIPLINARY_ROLE_LIST.find((item) => item.roleId === String(roleId)) || null;
}
