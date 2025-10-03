// Hero Green Color Palette
export const heroGreen = {
  50: '#eff8ed',
  75: '#bbe0b4',
  100: '#9fd495',
  200: '#76c167',
  300: '#5ab448',
  400: '#3f7e32',
  500: '#376e2c',
} as const;

// Brave Pink Color Palette
export const bravePink = {
  50: '#fbf1f7',
  75: '#efc5dd',
  100: '#e8adce',
  200: '#df8ab9',
  300: '#d872ab',
  400: '#975078',
  500: '#844668',
} as const;

// Color palette type
export type ColorShade = keyof typeof heroGreen;

// Helper to get color with shade
export const getHeroGreen = (shade: ColorShade = 300) => heroGreen[shade];
export const getBravePink = (shade: ColorShade = 300) => bravePink[shade];
