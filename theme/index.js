import { extendTheme } from "@chakra-ui/react";

// Add fonts configuration
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
    fontSize: "14px", // Smaller font size for all buttons
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
};

const Table = {
  variants: {
    striped: (props) => ({
      table: {
        border: "1px solid",
        borderColor: "purple.100",
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
        bg: "purple.50",
        th: {
          color: "purple.600",
          fontSize: "10px",
          padding: "15px",
          "&:first-of-type": {
            borderTopLeftRadius: "12px",
          },
          "&:last-of-type": {
            borderTopRightRadius: "12px",
          },
        },
      }
    }),
  },
}

const activeLabelStyles = {
  transform: "scale(0.85) translateY(-24px)",
  color: "purple.500",
};

const defaultFocusColor = "purple.500";

const theme = extendTheme({
  styles: {
    global: {
      // styles for the `body`
      input: {
        focusBorderColor: "cyan.500",
      },
    },
  },
  shadows: { outline: "0 0 0 2px var(--chakra-colors-purple-500)" },
  components: {
    Container,
    Button, // Add Button component configuration
    Table,
    Input: { defaultProps: { focusBorderColor: defaultFocusColor } },
    Select: { defaultProps: { focusBorderColor: defaultFocusColor } },
    Textarea: { defaultProps: { focusBorderColor: defaultFocusColor } },
    NumberInput: { defaultProps: { focusBorderColor: defaultFocusColor } },
    Form: {
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
            "input:not(:placeholder-shown), textarea:not(:placeholder-shown)": {
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
  },
  fonts,
});

export default theme;
