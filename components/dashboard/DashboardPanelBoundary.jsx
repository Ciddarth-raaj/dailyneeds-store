import React from "react";
import { Alert, AlertIcon, Button, Text } from "@chakra-ui/react";

/**
 * ONE TAB FAILING MUST NOT TAKE THE DASHBOARD WITH IT.
 *
 * Every screen already shows its own API errors and refusals; this catches
 * what those cannot - a render that throws - and contains it to its own panel.
 * The tab bar stays usable, so the other tabs still open, and "Try again"
 * remounts just this screen.
 */
export default class DashboardPanelBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error(`Dashboard tab "${this.props.label}" failed to render`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Alert status="error" fontSize="sm" borderRadius="md">
        <AlertIcon />
        <Text>The {this.props.label} view could not be displayed. The other dashboard tabs are unaffected.</Text>
        <Button size="xs" ml="auto" onClick={() => this.setState({ failed: false })}>
          Try again
        </Button>
      </Alert>
    );
  }
}
