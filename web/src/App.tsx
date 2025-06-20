import { useState } from "react";
import { Theme, Flex, Text } from "@radix-ui/themes";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { Heading } from "./components/Heading";
import { TextField } from "./components/TextField";

function App() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");

  const toggleAppearance = () => {
    setAppearance((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <Theme accentColor="indigo" grayColor="slate" appearance={appearance}>
      <Flex direction="column" gap="4" align="center" justify="center" style={{ height: "100vh" }}>
        <Button onClick={toggleAppearance} style={{ position: "absolute", top: 20, right: 20 }}>
          Toggle Theme
        </Button>
        <Card style={{ width: 400, padding: "2rem" }}>
          <Flex direction="column" gap="4">
            <Heading>Create Account</Heading>
            <Flex direction="column" gap="2">
              <Text as="label" htmlFor="email">
                Email Address
              </Text>
              <TextField placeholder="Enter your email" id="email" />
            </Flex>
            <Flex direction="column" gap="2">
              <Text as="label" htmlFor="password">
                Password
              </Text>
              <TextField placeholder="Enter your password" type="password" id="password" />
            </Flex>
            <Button>Sign Up</Button>
          </Flex>
        </Card>
      </Flex>
    </Theme>
  );
}

export default App;
