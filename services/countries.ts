export type CountryOption = {
  code: string;
  name: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "AR", name: "Argentina" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "DO", name: "Republica Dominicana" },
  { code: "EC", name: "Ecuador" },
  { code: "SV", name: "El Salvador" },
  { code: "ES", name: "Espana" },
  { code: "US", name: "Estados Unidos" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "MX", name: "Mexico" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panama" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PR", name: "Puerto Rico" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "IT", name: "Italia" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "GB", name: "Reino Unido" },
  { code: "NL", name: "Paises Bajos" },
  { code: "BE", name: "Belgica" },
  { code: "PT", name: "Portugal" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "Nueva Zelanda" },
  { code: "JP", name: "Japon" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "AE", name: "Emiratos Arabes Unidos" },
  { code: "QA", name: "Catar" },
  { code: "BH", name: "Barein" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Suiza" },
  { code: "SE", name: "Suecia" },
  { code: "NO", name: "Noruega" },
  { code: "DK", name: "Dinamarca" },
  { code: "FI", name: "Finlandia" },
  { code: "IE", name: "Irlanda" },
];

const COUNTRY_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country]));

export const getCountryNameByCode = (countryCode?: string | null): string | null => {
  if (!countryCode) return null;
  return COUNTRY_BY_CODE.get(countryCode.toUpperCase())?.name ?? null;
};

export const countryCodeToFlagEmoji = (countryCode?: string | null): string => {
  if (!countryCode || countryCode.length !== 2) return "";
  const upper = countryCode.toUpperCase();
  const first = upper.codePointAt(0);
  const second = upper.codePointAt(1);
  if (!first || !second) return "";
  if (first < 65 || first > 90 || second < 65 || second > 90) return "";
  return String.fromCodePoint(127397 + first, 127397 + second);
};
