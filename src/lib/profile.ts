import type { CommunityMember } from "./data";
export const MAX_AVATAR_BYTES = 192 * 1024;
export const normalizePlace = (value: string) =>
  value.normalize("NFKC").trim().toLocaleLowerCase();
export function parseRegions(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(/[,、\n]/)
    .map((s) => s.trim())
    .filter((s) => {
      const key = normalizePlace(s);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
export function matchesMember(
  person: CommunityMember,
  query: string,
  nationality: string,
  region: string,
  theme: string,
) {
  const search = normalizePlace(query);
  return (
    (!search ||
      normalizePlace(
        [
          person.name,
          person.bio,
          person.nationality,
          person.city,
          ...person.interestedRegions,
          ...person.interests,
        ].join(" "),
      ).includes(search)) &&
    (!nationality ||
      normalizePlace(person.nationality) === normalizePlace(nationality)) &&
    (!region ||
      person.interestedRegions.some(
        (r) => normalizePlace(r) === normalizePlace(region),
      )) &&
    (theme === "すべて" || person.interests.includes(theme))
  );
}
