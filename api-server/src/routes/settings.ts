import { Router, type Request, type Response } from "express";
import SystemSettings from "../models/SystemSettings.js";
import { AuditLog } from "../models";

const router = Router();

const COMMAND_GENERAL_ROLE_ID = "1147878942099906672";
const DEV_USER_ID = "713719718091030599";

const DEFAULT_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Indicadores e visão geral da Central.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "guards",
    label: "Efetivo",
    description: "Listagem e perfis dos militares.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "hours",
    label: "Horas de Serviço",
    description: "Consulta e gestão das horas de serviço.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "patrols",
    label: "Patrulhas",
    description: "Consulta e gestão de patrulhas.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "disciplinary",
    label: "Avisos Disciplinares",
    description: "Processos disciplinares e respetivo histórico.",
    enabled: true,
    viewRoleIds: [
      COMMAND_GENERAL_ROLE_ID,
      "1147878941974077478",
      "1147878942066364488",
    ],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "audit",
    label: "Auditoria",
    description: "Registo de acessos e ações sensíveis.",
    enabled: true,
    viewRoleIds: [COMMAND_GENERAL_ROLE_ID],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "reports",
    label: "Relatórios",
    description: "Relatórios administrativos e operacionais.",
    enabled: true,
    viewRoleIds: [COMMAND_GENERAL_ROLE_ID],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "units",
    label: "Unidades",
    description: "Todas as páginas de unidades.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "store",
    label: "Loja da Guarda",
    description: "Loja, créditos e cosméticos.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "settings",
    label: "Definições",
    description:
      "Preferências e configuração da Central. A gestão de permissões é exclusiva do Comando-Geral.",
    enabled: true,
    viewRoleIds: [],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "discord",
    label: "Discord",
    description: "Configuração das integrações Discord.",
    enabled: true,
    viewRoleIds: [COMMAND_GENERAL_ROLE_ID],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
  {
    key: "backup",
    label: "Backup",
    description: "Cópias de segurança da plataforma.",
    enabled: true,
    viewRoleIds: [COMMAND_GENERAL_ROLE_ID],
    manageRoleIds: [COMMAND_GENERAL_ROLE_ID],
    deleteRoleIds: [COMMAND_GENERAL_ROLE_ID],
  },
];

function getSessionUser(req: Request) {
  return req.session?.user || null;
}

function getUserId(req: Request) {
  return String(getSessionUser(req)?.id || "");
}

function getUserName(req: Request) {
  const user = getSessionUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    "Utilizador da Central"
  );
}

function getUserRoles(req: Request): string[] {
  const roles = getSessionUser(req)?.roles;

  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.map(String);
}

function isCommandGeneral(req: Request) {
  const userId = getUserId(req);
  const roles = getUserRoles(req);

  return (
    userId === DEV_USER_ID ||
    roles.includes(COMMAND_GENERAL_ROLE_ID)
  );
}

function requireAuthentication(
  req: Request,
  res: Response,
  next: () => void,
) {
  if (!getSessionUser(req)) {
    res.status(401).json({
      error: "É necessário iniciar sessão.",
    });
    return;
  }

  next();
}

function requireCommandGeneral(
  req: Request,
  res: Response,
  next: () => void,
) {
  if (!isCommandGeneral(req)) {
    res.status(403).json({
      error:
        "Apenas o Comando-Geral pode alterar as definições da Central.",
    });
    return;
  }

  next();
}

function normalizeRoleIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .map((roleId) => String(roleId).trim())
        .filter(Boolean),
    ),
  ];
}

function normalizeModules(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_MODULES;
  }

  return value
    .filter(
      (module) =>
        module &&
        typeof module === "object" &&
        "key" in module &&
        "label" in module,
    )
    .map((module: any) => ({
      key: String(module.key).trim(),
      label: String(module.label).trim(),
      description: String(module.description || "").trim(),
      enabled: module.enabled !== false,
      viewRoleIds: normalizeRoleIds(module.viewRoleIds),
      manageRoleIds: normalizeRoleIds(module.manageRoleIds),
      deleteRoleIds: normalizeRoleIds(module.deleteRoleIds),
    }));
}


function clonePlain(value: any) {
  return JSON.parse(
    JSON.stringify(value),
  );
}

function modulePermissionsSnapshot(
  modules: any[],
) {
  return (modules || []).map(
    (module: any) => ({
      key:
        String(
          module.key || "",
        ),
      label:
        String(
          module.label || "",
        ),
      enabled:
        module.enabled !==
        false,
      viewRoleIds:
        normalizeRoleIds(
          module.viewRoleIds,
        ),
      manageRoleIds:
        normalizeRoleIds(
          module.manageRoleIds,
        ),
      deleteRoleIds:
        normalizeRoleIds(
          module.deleteRoleIds,
        ),
    }),
  );
}

function permissionChanges(
  previous: any[],
  next: any[],
) {
  const previousMap =
    new Map(
      previous.map(
        (module) => [
          module.key,
          module,
        ],
      ),
    );

  return next
    .map((module) => {
      const before =
        previousMap.get(
          module.key,
        ) || null;

      if (
        JSON.stringify(before) ===
        JSON.stringify(module)
      ) {
        return null;
      }

      return {
        moduleKey:
          module.key,
        moduleLabel:
          module.label,
        previous:
          before,
        next:
          module,
      };
    })
    .filter(Boolean);
}

async function createSettingsAudit(
  req: Request,
  data: {
    action: string;
    severity?:
      | "info"
      | "success"
      | "warning"
      | "critical";
    description: string;
    metadata?: Record<string, any>;
  },
) {
  try {
    await AuditLog.create({
      actorId:
        getUserId(req),
      actorName:
        getUserName(req),
      actorRank:
        "Comando-Geral",
      action:
        data.action,
      module:
        "Definições",
      severity:
        data.severity ||
        "warning",
      description:
        data.description,
      targetId:
        "global",
      targetName:
        "Definições da Central",
      metadata:
        data.metadata ||
        {},
      ip:
        req.ip ||
        req.socket
          ?.remoteAddress ||
        null,
      userAgent:
        req.get(
          "user-agent",
        ) ||
        null,
    });
  } catch (error) {
    console.error(
      "[settings][audit] Erro ao registar auditoria:",
      error,
    );
  }
}

async function getOrCreateSettings() {
  let settings =
    await SystemSettings.findOne({
      key: "global",
    });

  if (!settings) {
    settings =
      await SystemSettings.create({
        key: "global",
        modules:
          DEFAULT_MODULES,
      });
  }

  const currentModules =
    Array.isArray(
      settings.modules,
    )
      ? settings.modules.map(
          (module: any) =>
            module.toObject
              ? module.toObject()
              : module,
        )
      : [];

  const currentMap =
    new Map(
      currentModules.map(
        (module: any) => [
          String(
            module.key,
          ),
          module,
        ],
      ),
    );

  let changed =
    currentModules.length ===
    0;

  const mergedModules =
    DEFAULT_MODULES.map(
      (defaultModule) => {
        const stored =
          currentMap.get(
            defaultModule.key,
          );

        if (!stored) {
          changed = true;
          return defaultModule;
        }

        const merged = {
          ...defaultModule,
          ...stored,
          viewRoleIds:
            normalizeRoleIds(
              stored.viewRoleIds,
            ),
          manageRoleIds:
            normalizeRoleIds(
              stored.manageRoleIds,
            ),
          deleteRoleIds:
            normalizeRoleIds(
              stored.deleteRoleIds,
            ),
        };

        /*
         * Todos podem abrir Definições.
         * Apenas o Comando-Geral consegue alterar as permissões.
         */
        if (
          defaultModule.key ===
          "settings"
        ) {
          if (
            merged.viewRoleIds
              .length >
            0
          ) {
            changed = true;
          }

          merged.viewRoleIds =
            [];
          merged.enabled =
            true;
          merged.manageRoleIds = [
            COMMAND_GENERAL_ROLE_ID,
          ];
          merged.deleteRoleIds = [
            COMMAND_GENERAL_ROLE_ID,
          ];
        }

        return merged;
      },
    );

  for (
    const stored
    of currentModules
  ) {
    if (
      !DEFAULT_MODULES.some(
        (module) =>
          module.key ===
          stored.key,
      )
    ) {
      mergedModules.push(
        stored,
      );
    }
  }

  if (
    changed ||
    JSON.stringify(
      modulePermissionsSnapshot(
        currentModules,
      ),
    ) !==
      JSON.stringify(
        modulePermissionsSnapshot(
          mergedModules,
        ),
      )
  ) {
    settings.modules =
      mergedModules;

    await settings.save();
  }

  return settings;
}

/**
 * Dados das definições e permissões efetivas do utilizador.
 */
router.get(
  "/",
  requireAuthentication,
  async (req: Request, res: Response) => {
    try {
      const settings = await getOrCreateSettings();
      const roles = getUserRoles(req);
      const commandGeneral = isCommandGeneral(req);

      const modules = settings.modules.map((module: any) => {
        const viewRoleIds = module.viewRoleIds || [];
        const manageRoleIds = module.manageRoleIds || [];
        const deleteRoleIds = module.deleteRoleIds || [];

        const unrestrictedView = viewRoleIds.length === 0;

        return {
          ...module.toObject(),
          permissions: {
            view:
              commandGeneral ||
              (module.enabled &&
                (unrestrictedView ||
                  viewRoleIds.some((roleId: string) =>
                    roles.includes(roleId),
                  ))),

            manage:
              commandGeneral ||
              manageRoleIds.some((roleId: string) =>
                roles.includes(roleId),
              ),

            delete:
              commandGeneral ||
              deleteRoleIds.some((roleId: string) =>
                roles.includes(roleId),
              ),
          },
        };
      });

      res.json({
        general: settings.general,
        modules,
        canManageSettings: commandGeneral,
        updatedAt: settings.updatedAt,
        updatedByName: settings.updatedByName,
      });
    } catch (error) {
      console.error("[settings] Erro ao carregar definições:", error);

      res.status(500).json({
        error: "Não foi possível carregar as definições.",
      });
    }
  },
);

/**
 * Atualização global das definições.
 * Exclusivo ao Comando-Geral.
 */
router.patch(
  "/",
  requireAuthentication,
  requireCommandGeneral,
  async (req: Request, res: Response) => {
    try {
      const settings = await getOrCreateSettings();

      const previousGeneral =
        clonePlain(
          settings.general,
        );

      const previousModules =
        modulePermissionsSnapshot(
          settings.modules.map(
            (module: any) =>
              module.toObject
                ? module.toObject()
                : module,
          ),
        );

      if (req.body.general) {
        const general = req.body.general;

        settings.general.excessoHoras =
          general.excessoHoras !== false;

        settings.general.novosDocumentos =
          general.novosDocumentos !== false;

        settings.general.resumoDiario =
          general.resumoDiario === true;

        settings.general.alertasPatrulhas =
          general.alertasPatrulhas !== false;

        settings.general.auditoriaAcessos =
          general.auditoriaAcessos !== false;

        settings.general.mfaObrigatoria =
          general.mfaObrigatoria !== false;

        settings.general.bloquearSessaoInativa =
          general.bloquearSessaoInativa !== false;

        settings.general.modoManutencao =
          general.modoManutencao === true;

        settings.general.timeoutMinutos = Math.min(
          Math.max(Number(general.timeoutMinutos) || 15, 5),
          120,
        );

        settings.general.limiteHorasSemanais = Math.min(
          Math.max(Number(general.limiteHorasSemanais) || 40, 1),
          168,
        );

        settings.general.horaResumo =
          String(general.horaResumo || "00:00");
      }

      if (req.body.modules) {
        settings.modules =
          normalizeModules(
            req.body.modules,
          ).map(
            (module) =>
              module.key ===
              "settings"
                ? {
                    ...module,
                    enabled:
                      true,
                    viewRoleIds:
                      [],
                    manageRoleIds: [
                      COMMAND_GENERAL_ROLE_ID,
                    ],
                    deleteRoleIds: [
                      COMMAND_GENERAL_ROLE_ID,
                    ],
                  }
                : module,
          );
      }

      settings.updatedByDiscordId = getUserId(req);
      settings.updatedByName = getUserName(req);

      await settings.save();

      const nextGeneral =
        clonePlain(
          settings.general,
        );

      const nextModules =
        modulePermissionsSnapshot(
          settings.modules.map(
            (module: any) =>
              module.toObject
                ? module.toObject()
                : module,
          ),
        );

      const changedPermissions =
        permissionChanges(
          previousModules,
          nextModules,
        );

      const generalChanged =
        JSON.stringify(
          previousGeneral,
        ) !==
        JSON.stringify(
          nextGeneral,
        );

      await createSettingsAudit(
        req,
        {
          action:
            changedPermissions.length >
            0
              ? "SETTINGS_PERMISSIONS_UPDATED"
              : "SETTINGS_UPDATED",
          severity:
            changedPermissions.length >
            0
              ? "warning"
              : "info",
          description:
            changedPermissions.length >
            0
              ? `${getUserName(req)} alterou as permissões das áreas da Central.`
              : `${getUserName(req)} atualizou as definições gerais da Central.`,
          metadata: {
            generalChanged,
            previousGeneral:
              generalChanged
                ? previousGeneral
                : undefined,
            nextGeneral:
              generalChanged
                ? nextGeneral
                : undefined,
            permissionChanges:
              changedPermissions,
          },
        },
      );

      res.json({
        ok: true,
        message: "Definições atualizadas com sucesso.",
        general: settings.general,
        modules: settings.modules,
        updatedAt: settings.updatedAt,
        updatedByName: settings.updatedByName,
      });
    } catch (error) {
      console.error("[settings] Erro ao guardar definições:", error);

      res.status(500).json({
        error: "Não foi possível guardar as definições.",
      });
    }
  },
);

export default router;