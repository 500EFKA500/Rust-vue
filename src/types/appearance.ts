export interface Appearance {
  theme: "dark" | "light" | "system";
  accent: "blue" | "purple" | "green" | "orange" | "pink";
  fontSize: number;
  background: "plain" | "dots" | "gradient";
  compact: boolean;
}
export const defaultAppearance: Appearance = {
  theme: "dark",
  accent: "blue",
  fontSize: 14,
  background: "plain",
  compact: false,
};
