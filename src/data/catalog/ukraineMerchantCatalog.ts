import type { MerchantCatalogEntry } from "@/domain/catalog/MerchantCatalog";

export const UKRAINE_MERCHANT_CATALOG_VERSION = 1;

export const ukraineMerchantCatalog: readonly MerchantCatalogEntry[] = [
  {
    aliases: ["Сільпо", "Silpo", "Сильпо"],
    category: "Groceries",
    defaultBackgroundColor: "#7A3E9D",
    id: "silpo",
    name: "Сільпо"
  },
  {
    aliases: ["АТБ", "ATB", "АТБ-Маркет", "АТБ Маркет"],
    category: "Groceries",
    defaultBackgroundColor: "#C92A2A",
    id: "atb",
    name: "АТБ"
  },
  {
    aliases: ["NOVUS", "Новус"],
    category: "Groceries",
    defaultBackgroundColor: "#2B8A3E",
    id: "novus",
    name: "NOVUS"
  },
  {
    aliases: ["VARUS", "Варус"],
    category: "Groceries",
    defaultBackgroundColor: "#E67700",
    id: "varus",
    name: "VARUS"
  },
  {
    aliases: ["Епіцентр", "Epicentr", "Эпицентр", "Епіцентр К"],
    category: "Home",
    defaultBackgroundColor: "#F08C00",
    id: "epicentr",
    name: "Епіцентр"
  },
  {
    aliases: ["Фора", "Fora"],
    category: "Groceries",
    defaultBackgroundColor: "#2F9E44",
    id: "fora",
    name: "Фора"
  },
  {
    aliases: ["Аптека АНЦ", "АНЦ", "ANC"],
    category: "Pharmacy",
    defaultBackgroundColor: "#1971C2",
    id: "anc",
    name: "Аптека АНЦ"
  },
  {
    aliases: ["WOG", "ВОГ"],
    category: "Fuel",
    defaultBackgroundColor: "#087F5B",
    id: "wog",
    name: "WOG"
  },
  {
    aliases: ["OKKO", "ОККО"],
    category: "Fuel",
    defaultBackgroundColor: "#5F3DC4",
    id: "okko",
    name: "OKKO"
  },
  {
    aliases: ["Watsons", "Ватсонс"],
    category: "Health & Beauty",
    defaultBackgroundColor: "#C2255C",
    id: "watsons",
    name: "Watsons"
  }
];
