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
};

const activeLabelStyles = {
  transform: "scale(0.85) translateY(-24px)",
  color: "purple.500",
};

const theme = extendTheme({
  shadows: { outline: "0 0 0 2px var(--chakra-colors-purple-500)" },
  components: {
    Container,
    Button, // Add Button component configuration
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
