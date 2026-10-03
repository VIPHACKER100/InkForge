/**
 * inkfont-format.js — the HandFonted community-share format (Phase F5).
 * Pure and dependency-free so both the studio and node tests can use it.
 * A .inkfont file is the project payload wrapped with a format marker and
 * version; parseInkfont still accepts the legacy bare-project JSON.
 */

export function wrapInkfont(projectData) {
  return { format: 'inkfont', formatVersion: 1, ...projectData };
}

export function parseInkfont(text) {
  const parsed = JSON.parse(text);
  if (parsed && parsed.format === 'inkfont') {
    const { format, formatVersion, ...project } = parsed;
    return project;
  }
  return parsed; // legacy bare project JSON
}
