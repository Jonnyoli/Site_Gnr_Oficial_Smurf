export type ProfessionalUnitKey =
  | "GNR"
  | "COMANDO"
  | "NIC"
  | "GIOE"
  | "GSA"
  | "UNT"
  | "USHE"
  | "DI"
  | "ESCOLA";

const RULES: Array<{
  key: ProfessionalUnitKey;
  keywords: string[];
}> = [
  {
    key: "COMANDO",
    keywords: [
      "comando",
      "command",
      "general",
      "imperial",
      "direção",
      "direcao",
    ],
  },
  {
    key: "NIC",
    keywords: [
      "nic",
      "investig",
      "criminal",
      "classified",
      "intelligence",
      "detetive",
      "detective",
      "prova",
    ],
  },
  {
    key: "GIOE",
    keywords: [
      "gioe",
      "operações especiais",
      "operacoes especiais",
      "tático",
      "tatico",
      "breach",
      "blackout",
      "redline",
    ],
  },
  {
    key: "GSA",
    keywords: [
      "gsa",
      "aéreo",
      "aereo",
      "helicóptero",
      "helicoptero",
      "flight",
      "aviation",
      "hangar",
      "sky",
    ],
  },
  {
    key: "UNT",
    keywords: [
      "unt",
      "trânsito",
      "transito",
      "rodovi",
      "fiscaliza",
      "highway",
      "radar",
    ],
  },
  {
    key: "USHE",
    keywords: [
      "ushe",
      "honra",
      "honras",
      "cerimonial",
      "cerimónia",
      "cerimonia",
      "royal",
      "protocolo",
    ],
  },
  {
    key: "ESCOLA",
    keywords: [
      "escola",
      "academia",
      "formador",
      "formação",
      "formacao",
      "instrutor",
      "academic",
      "school",
    ],
  },
  {
    key: "DI",
    keywords: [
      "destacamento de intervenção",
      "disciplina",
      "inspeção",
      "inspecao",
      "controlo",
    ],
  },
];

export function inferProfessionalUnitKey(
  product: any,
): ProfessionalUnitKey {
  const explicit =
    String(
      product?.unitKey ||
      product?.metadata?.unitKey ||
      "",
    ).toUpperCase();

  if (
    [
      "GNR",
      "COMANDO",
      "NIC",
      "GIOE",
      "GSA",
      "UNT",
      "USHE",
      "DI",
      "ESCOLA",
    ].includes(
      explicit,
    )
  ) {
    return explicit as ProfessionalUnitKey;
  }

  const text = [
    product?.id,
    product?.name,
    product?.description,
    product?.collection,
    ...(Array.isArray(
      product?.requiredRoleKeys,
    )
      ? product.requiredRoleKeys
      : []),
    ...(Array.isArray(
      product?.tags,
    )
      ? product.tags
      : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    RULES.find(
      (
        rule,
      ) =>
        rule.keywords.some(
          (
            keyword,
          ) =>
            text.includes(
              keyword,
            ),
        ),
    )?.key ||
    "GNR"
  );
}

export function inferProfessionalEquipSlot(
  product: any,
) {
  if (
    product?.equipSlot
  ) {
    return product.equipSlot;
  }

  const category =
    String(
      product?.category ||
      "",
    ).toUpperCase();

  const slots:
    Record<
      string,
      string | null
    > = {
      MOLDURAS:
        "frame",
      EMBLEMAS:
        "badges",
      FUNDOS:
        "background",
      TITULOS:
        "title",
      TEMAS:
        "theme",
      COLECOES:
        null,
      SOCIAL:
        null,
      EXCLUSIVOS:
        null,
    };

  return (
    slots[
      category
    ] ??
    null
  );
}

export function normalizeProfessionalProduct(
  product: any,
) {
  const unitKey =
    inferProfessionalUnitKey(
      product,
    );

  const equipSlot =
    inferProfessionalEquipSlot(
      product,
    );

  const tags = [
    ...(Array.isArray(
      product?.tags,
    )
      ? product.tags
      : []),
    unitKey,
    String(
      product?.category ||
      "",
    ),
    String(
      product?.rarity ||
      "COMUM",
    ),
  ]
    .map(
      (
        value,
      ) =>
        String(
          value,
        ).trim(),
    )
    .filter(Boolean);

  return {
    ...product,
    unitKey,
    equipSlot,
    tags: [
      ...new Set(
        tags,
      ),
    ],
    metadata: {
      ...(product?.metadata ||
        {}),
      unitKey,
      professionalCatalog:
        true,
      normalizedAt:
        new Date(),
    },
  };
}
