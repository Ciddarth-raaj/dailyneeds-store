import { extendTheme } from "@chakra-ui/react";

const fonts = {
  heading: `"Poppins", serif`,
  body: `"Poppins", serif`,
};

const Container = {
  baseStyle: {
    maxWidth: "unset",
  },
};

const Button = {
  baseStyle: {
    fontSize: "14px",
  },
  sizes: {
    sm: {
      fontSize: "12px",
    },
    md: {
      fontSize: "14px",
    },
    lg: {
      fontSize: "16px",
    },
  },
  variants: {
    "new-outline": (props) => {
      const { colorScheme: c } = props;

      return {
        fontWeight: 500,
        bg: `white`,
        border: `1px solid transparent`,
        borderColor: `${c}.100`,
        color: `${c}.500`,
        _hover: {
          bg: `${c}.100`,
        },
      };
    },
  },
  defaultProps: {
    colorScheme: "purple",
  },
};

/**
 * Application Chakra theme for a given semantic palette (e.g. `purple`, `teal`).
 * Use {@link createAppTheme} from `GstModuleWrapper` so GST routes use the module accent.
 */
export function createAppTheme(colorScheme = "purple") {
  const cs = colorScheme;

  const moduleButtonDefaults = { colorScheme: cs };

  const Table = {
    variants: {
      striped: (props) => ({
        table: {
          border: "1px solid",
          borderColor: `${cs}.100`,
          borderRadius: "12px",
          borderCollapse: "separate",
          borderSpacing: 0,
        },
        tbody: {
          tr: {
            "&:nth-of-type(odd)": {
              td: {
                bg: props.colorMode === "dark" ? "gray.700" : "gray.50",
              },
            },
          },
        },
        thead: {
          bg: `${cs}.50`,
          th: {
            color: `${cs}.600`,
            fontSize: "10px",
            padding: "15px",
            "&:first-of-type": {
              borderTopLeftRadius: "12px",
            },
            "&:last-of-type": {
              borderTopRightRadius: "12px",
            },
          },
        },
      }),
    },
  };

  const activeLabelStyles = {
    transform: "scale(0.85) translateY(-24px)",
    color: `${cs}.500`,
  };

  const defaultFocusColor = `${cs}.500`;

  const moduleAccentVars = [50, 100, 200, 400, 500, 600, 700, 900].reduce(
    (acc, shade) => {
      acc[`--module-accent-${shade}`] = `var(--chakra-colors-${cs}-${shade})`;
      return acc;
    },
    {}
  );

  return extendTheme({
    styles: {
      global: {
        ":root": moduleAccentVars,
        input: {
          focusBorderColor: `${cs}.500`,
        },
        // Text selection follows module accent.
        "::selection": {
          background: `var(--module-accent-200)`,
          color: `var(--module-accent-900, var(--chakra-colors-${cs}-900))`,
        },
        "::-moz-selection": {
          background: `var(--module-accent-200)`,
          color: `var(--module-accent-900, var(--chakra-colors-${cs}-900))`,
        },
      },
    },
    shadows: {
      outline: `0 0 0 2px var(--chakra-colors-${cs}-500)`,
    },
    components: {
      Container,
      Button: {
        ...Button,
        defaultProps: moduleButtonDefaults,
      },
      IconButton: { defaultProps: moduleButtonDefaults },
      Table,
      Tabs: { defaultProps: { size: "sm", colorScheme: cs } },
      Tab: {
        baseStyle: {
          fontSize: "sm",
          _focus: {
            boxShadow: "none",
            outline: "none",
          },
        },
      },
      Switch: { defaultProps: moduleButtonDefaults },
      Checkbox: { defaultProps: moduleButtonDefaults },
      Radio: { defaultProps: moduleButtonDefaults },
      Tag: { defaultProps: moduleButtonDefaults },
      FormLabel: {
        baseStyle: {
          fontSize: "sm",
          fontWeight: 600,
          color: "gray.600",
          letterSpacing: "0.01em",
          mb: 1.5,
        },
      },
      FormControl: {
        baseStyle: {
          _focusWithin: {
            label: {
              color: defaultFocusColor,
            },
          },
        },
      },
      Form: {
        baseStyle: {
          container: {
            _focusWithin: {
              label: {
                color: defaultFocusColor,
              },
            },
          },
        },
        variants: {
          floating: {
            container: {
              _focusWithin: {
                label: {
                  ...activeLabelStyles,
                },
                "input, textarea": {
                  color: "gray.900",
                },
              },
              "input:not(:placeholder-shown) ~ label, textarea:not(:placeholder-shown) ~ label":
                {
                  ...activeLabelStyles,
                },
              "input:not(:placeholder-shown), textarea:not(:placeholder-shown)":
                {
                  color: "gray.900",
                },
              "input, textarea": {
                color: "gray.400",
              },
              label: {
                top: "0",
                left: "0",
                zIndex: 2,
                position: "absolute",
                backgroundColor: "white",
                pointerEvents: "none",
                mx: 3,
                px: 1,
                my: 2,
                transformOrigin: "left top",
                transition: "all 0.2s ease-out",
                color: "gray.500",
              },
            },
          },
        },
      },
      Input: { defaultProps: { focusBorderColor: defaultFocusColor } },
      Select: { defaultProps: { focusBorderColor: defaultFocusColor } },
      Textarea: { defaultProps: { focusBorderColor: defaultFocusColor } },
      NumberInput: { defaultProps: { focusBorderColor: defaultFocusColor } },
    },
    fonts,
  });
}

/** Default app theme (non-GST modules). */
export default createAppTheme("purple");
