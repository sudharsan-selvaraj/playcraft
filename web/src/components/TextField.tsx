import { TextField as RadixTextField } from "@radix-ui/themes";
import type { ComponentProps } from "react";

type TextFieldProps = ComponentProps<typeof RadixTextField.Root>;

export const TextField = (props: TextFieldProps) => {
  return <RadixTextField.Root {...props} />;
};
