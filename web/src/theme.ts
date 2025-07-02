import { createTheme, DEFAULT_THEME } from '@mantine/core';

export const designTokens = {
  color: {
    background: {
      light: '#ffffff',
      dark: '#0d1117',
    },
    border: {
      light: '#d0d7de',
      dark: '#686666',
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

export const customColors = {
  background: {
    dark: '#181A1B',
    light: '#f5f5f7', // modern light background
  },
  secondaryBg: {
    dark: '#23272e',
    light: '#e5e7eb', // modern light secondary background
  },
  tabBar: {
    dark: '#2c2c32',
    light: '#f3f3f3', // VSCode-like tab bar
  },
  border: {
    dark: '#383838',
    light: '#d1d5db', // soft gray border
  },
  text: {
    dark: '#fff',
    light: '#222', // primary text
  },
  textSecondary: {
    dark: '#bbb',
    light: '#888', // secondary text
  },
  icon: {
    dark: '#d3cccc',
    light: '#555',
  },
  iconBg: {
    dark: 'rgba(255,255,255,0.08)',
    light: 'rgba(0,0,0,0.06)',
  },
  accent: {
    blue: {
      dark: '#3b82f6',
      light: '#2563eb',
    },
    green: {
      dark: '#44BA4A',
      light: '#44BA4A',
    },
    red: {
      dark: '#c63e14',
      light: '#ff0000',
    },
  },
  iconDisabled: {
    dark: '#666',
    light: '#aaa',
  },
  primary: {
    dark: '#58a6ff',
    light: '#2563eb',
  },
  danger: {
    dark: '#c63e14',
    light: '#ff0000',
  },
  success: {
    dark: '#44BA4A',
    light: '#44BA4A',
  },
  warning: {
    dark: '#d29922',
    light: '#eab308',
  },
};

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