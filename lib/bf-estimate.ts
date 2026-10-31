// Deurenberg, Weststrate and Seidell, 1991. Body mass index as a measure of
// body fatness: age- and sex-specific prediction formulas. British Journal of
// Nutrition. Sex is 1 for male and 0 for female.
// BF% = 1.20 x BMI + 0.23 x age - 10.8 x sex - 5.4
// A population estimate from height, weight, age and sex. Not a measurement.

export type BodyStats = {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number;
};

export function parseStats(input: {
  sex?: unknown;
  age?: unknown;
  heightCm?: unknown;
  weightKg?: unknown;
}): BodyStats | null {
  const sex = input.sex === "female" ? "female" : input.sex === "male" ? "male" : "";
  const age = typeof input.age === "number" ? input.age : Number(input.age);
  const heightCm = typeof input.heightCm === "number" ? input.heightCm : Number(input.heightCm);
  const weightKg = typeof input.weightKg === "number" ? input.weightKg : Number(input.weightKg);
  if (sex !== "male" && sex !== "female") return null;
  if (!Number.isFinite(age) || age < 18 || age > 90) return null;
  if (!Number.isFinite(heightCm) || heightCm < 120 || heightCm > 230) return null;
  if (!Number.isFinite(weightKg) || weightKg < 40 || weightKg > 250) return null;
  return { sex, age, heightCm, weightKg };
}

export function deurenberg(stats: BodyStats): number | null {
  if (stats.age < 18 || stats.age > 90) return null;
  if (stats.heightCm < 120 || stats.heightCm > 230) return null;
  if (stats.weightKg < 40 || stats.weightKg > 250) return null;
  const heightM = stats.heightCm / 100;
  const bmi = stats.weightKg / (heightM * heightM);
  const sex = stats.sex === "male" ? 1 : 0;
  const bf = 1.2 * bmi + 0.23 * stats.age - 10.8 * sex - 5.4;
  if (!Number.isFinite(bf) || bf < 3 || bf > 60) return null;
  return Math.round(bf * 10) / 10;
}

export const FORMULA_NOTE =
  "The photo could not be read, so this is not a reading of the photo. It is the Deurenberg formula from 1991, using the age, height, weight and sex already in the calculator. It estimates body fat for a population, not a measurement of you. The tape method on this page is the more repeatable check.";

export function imageFromDataUrl(dataUrl: unknown): { mediaType: string; bytes: Uint8Array } | null {
  if (typeof dataUrl !== "string" || dataUrl.length < 80 || dataUrl.length > 1_800_000) return null;
  const match = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return null;
  const b64 = match[2].replace(/\s/g, "");
  if (b64.length < 40) return null;
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length < 40 || bytes.length > 1_200_000) return null;
  const kind = match[1] === "jpg" ? "jpeg" : match[1];
  return { mediaType: `image/${kind}`, bytes };
}
