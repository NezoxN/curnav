import { createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'brand',
  primaryShade: 6,
  fontFamily: 'Outfit, Inter, sans-serif',
  defaultRadius: 'md',
  colors: {
    brand: [
      '#FFF0EE',
      '#FFDFD3',
      '#FFC3B4',
      '#FE9E84',
      '#FD714E',
      '#FB542B',
      '#F25A38',
      '#D34827',
      '#AC361A',
      '#892711',
    ],
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113',
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Paper: {
      defaultProps: {
        p: 'xl',
        radius: 'md',
        shadow: 'sm',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
      styles: {
        root: {
          transition: 'transform 150ms ease, box-shadow 150ms ease',
          '&:hover': {
            transform: 'scale(1.01)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          },
        },
      },
    },
    NavLink: {
      defaultProps: {
        radius: 'md',
      },
      styles: {
        root: {
          borderRadius: '8px',
          margin: '4px 8px',
          width: 'calc(100% - 16px)',
          color: 'rgba(255, 255, 255, 0.7)',
          transition: 'all 0.2s ease',
          '&[dataActive]': {
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            fontWeight: 600,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            color: 'white',
          },
        },
        icon: {
          color: 'inherit',
        },
        label: {
          color: 'inherit',
        }
      },
    },
  },
});
