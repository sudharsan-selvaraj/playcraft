import { createTheme, DEFAULT_THEME } from '@mantine/core';

export const designTokens = {
  color: {
    background: {
      light: '#ffffff',
      dark: '#0d1117',
    },
    border: {
      light: '#d0d7de',
      dark: '#30363d',
    },
    secondaryBg: {
      light: '#f6f8fa',
      dark: '#161b22',
    },
    text: {
      light: '#24292f',
      dark: '#c9d1d9',
    },
    icon: {
      light: '#57606a',
      dark: '#8b949e',
    },
    iconBg: {
      light: '#eaeef2',
      dark: '#21262d',
    },
    iconDisabled: {
      light: '#8c959f',
      dark: '#484f58',
    },
    primary: {
      light: '#0969da', // GitHub blue
      dark: '#58a6ff',
    },
    danger: {
      light: '#cf222e',
      dark: '#ff7b72',
    },
    success: {
      light: '#1a7f37',
      dark: '#3fb950',
    },
    warning: {
      light: '#9a6700',
      dark: '#d29922',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  radius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    pill: '9999px',
  },
  font: {
    family: 'Inter, "Segoe UI", Arial, sans-serif',
    size: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
    },
    weight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
  },
};

export const customColors = designTokens.color;

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    // You can override or extend Mantine's default palette here
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5c5f66',
      '#373A40',
      '#2C2E33',
      '#25262b',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
    light: DEFAULT_THEME.colors.gray,
  },
  primaryShade: { light: 6, dark: 7 },
  defaultRadius: 'md',
  fontFamily: designTokens.font.family,
  headings: { fontFamily: designTokens.font.family },
  // Add other theme customizations as needed
});
