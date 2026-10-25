// Keep the 60pt control area ABOVE the system navigation / home indicator.
export function getTabBarLayout(insets = {}) {
  const bottom = Math.max(8, Number.isFinite(insets.bottom) ? insets.bottom : 0);
  return { height: 60 + bottom, paddingTop: 8, paddingBottom: bottom };
}
