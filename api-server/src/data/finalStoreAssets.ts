export const FINAL_STORE_ASSETS = [
  {
    "name": "Posto da Serra",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/posto-da-serra.png",
    "aliases": [
      "posto da serra"
    ]
  },
  {
    "name": "Patrulha na Autoestrada",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/patrulha-na-autoestrada.png",
    "aliases": [
      "patrulha na autoestrada"
    ]
  },
  {
    "name": "Vigilância Costeira",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/vigilancia-costeira.png",
    "aliases": [
      "vigilância costeira",
      "vigilancia costeira"
    ]
  },
  {
    "name": "Gabinete Classificado",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/gabinete-classificado.png",
    "aliases": [
      "gabinete classificado"
    ]
  },
  {
    "name": "Base Florestal",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/base-florestal.png",
    "aliases": [
      "base florestal"
    ]
  },
  {
    "name": "Hangar Operacional",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/hangar-operacional.png",
    "aliases": [
      "hangar operacional"
    ]
  },
  {
    "name": "Comando ao Amanhecer",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/comando-ao-amanhecer.png",
    "aliases": [
      "comando ao amanhecer"
    ]
  },
  {
    "name": "Cerimónia Militar de Honra",
    "category": "FUNDOS",
    "equipSlot": "background",
    "image": "/Store/final-premium/cerimonia-militar-de-honra.png",
    "aliases": [
      "cerimónia militar de honra",
      "cerimonia militar de honra"
    ]
  },
  {
    "name": "Emblema GIOE",
    "category": "EMBLEMAS",
    "equipSlot": "badges",
    "image": "/Store/final-premium/emblema-gioe.png",
    "aliases": [
      "emblema gioe"
    ]
  },
  {
    "name": "Emblema NIC",
    "category": "EMBLEMAS",
    "equipSlot": "badges",
    "image": "/Store/final-premium/emblema-nic.png",
    "aliases": [
      "emblema nic"
    ]
  }
] as const;

export function normalizeStoreAssetText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findFinalStoreAsset(item: any) {
  const haystack = normalizeStoreAssetText([item?.id, item?.name, item?.collection].filter(Boolean).join(" "));
  return FINAL_STORE_ASSETS.find((asset) =>
    [asset.name, ...asset.aliases].some((alias) => haystack.includes(normalizeStoreAssetText(alias))),
  ) || null;
}
