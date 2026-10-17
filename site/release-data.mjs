// Shared by the build refresh and browser refresh. Only this repository's public releases qualify.
export const releaseRepository =
  "https://github.com/jamesb123450/azuria-releases";
export const latestReleaseAPI =
  "https://api.github.com/repos/jamesb123450/azuria-releases/releases/latest";
export const legacyRepository =
  "https://github.com/jamesb123450/azuria-launcher";
export function parseRelease(value, host = releaseRepository) {
  if (![releaseRepository, legacyRepository].includes(host)) return null;
  if (
    !value ||
    value.draft ||
    value.prerelease ||
    !/^v\d+\.\d+\.\d+$/.test(value.tag_name || "")
  )
    return null;
  if (
    value.html_url !== `${host}/releases/tag/${value.tag_name}` ||
    !Number.isFinite(Date.parse(value.published_at))
  )
    return null;
  const asset = (Array.isArray(value.assets) ? value.assets : []).find(
    (item) =>
      item &&
      item.name ===
        `Azuria-Launcher_${value.tag_name.slice(1)}_x64-setup.exe` &&
      item.browser_download_url ===
        `${host}/releases/download/${value.tag_name}/${item.name}`,
  );
  return {
    tag: value.tag_name,
    version: value.tag_name.slice(1),
    url: value.html_url,
    published: value.published_at,
    notes: typeof value.body === "string" ? value.body : "",
    installer: asset?.browser_download_url || null,
    size: Number.isFinite(asset?.size) ? asset.size : null,
  };
}
export function releaseSummary(notes) {
  return (
    notes
      .split(/\r?\n/)
      .find((line) => line.startsWith("- "))
      ?.slice(2) || "Read the published release notes on GitHub."
  );
}
