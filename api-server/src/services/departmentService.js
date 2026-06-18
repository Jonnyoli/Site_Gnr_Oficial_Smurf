import DepartmentRecord from "../models/DepartmentRecord.js";

export const DEPARTMENT_ROLES = {
  CEG: "1417907622270599189",
  CSO: "1417908597949595681",
  DRH: "1147878941885988926",
  COMMAND: "1147878942099906672",
};

export const DEPARTMENT_CONFIG = {
  CEG: {
    name: "Conselho de Elite da Guarda",
    shortName: "CEG",
    roleId: DEPARTMENT_ROLES.CEG,
  },
  CSO: {
    name: "Conselho Superior de Oficiais",
    shortName: "CSO",
    roleId: DEPARTMENT_ROLES.CSO,
  },
  DRH: {
    name: "Departamento de Recursos Humanos",
    shortName: "DRH",
    roleId: DEPARTMENT_ROLES.DRH,
  },
};

export function normalizeRoles(user) {
  return Array.isArray(user?.roles)
    ? user.roles.map(String)
    : [];
}

export function hasRole(user, roleId) {
  return normalizeRoles(user).includes(String(roleId));
}

export function isCommand(user) {
  return (
    String(user?.id || "") === "713719718091030599" ||
    hasRole(user, DEPARTMENT_ROLES.COMMAND)
  );
}

export function canAccessDepartment(user, department) {
  const config = DEPARTMENT_CONFIG[department];

  if (!config) return false;

  return isCommand(user) || hasRole(user, config.roleId);
}

export function canManageDepartment(user, department) {
  return canAccessDepartment(user, department);
}

export function calculateClearanceAmount(incidents = 0) {
  const safeIncidents = Math.max(0, Number(incidents) || 0);
  return Math.min(500000, 150000 + safeIncidents * 50000);
}

export async function nextReferenceNumber(department, type) {
  const year = new Date().getFullYear();
  const prefix = `${department}-${type}-${year}`;

  const count = await DepartmentRecord.countDocuments({
    referenceNumber: new RegExp(`^${prefix}-`),
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
