import { Heading as RadixHeading } from "@radix-ui/themes";
import type { ComponentProps } from "react";

type HeadingProps = ComponentProps<typeof RadixHeading>;

export const Heading = (props: HeadingProps) => {
  return <RadixHeading {...props} />;
};
