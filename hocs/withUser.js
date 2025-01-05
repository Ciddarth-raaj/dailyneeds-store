import React from "react";
import { useUser } from "../contexts/UserContext";

export function withUser(Component) {
  return function WrappedComponent(props) {
    const userContext = useUser();
    return <Component {...props} userContext={userContext} />;
  };
}
