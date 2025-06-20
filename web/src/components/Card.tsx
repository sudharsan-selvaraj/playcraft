import { Card as RadixCard } from "@radix-ui/themes";
import type { ComponentProps } from "react";

type CardProps = ComponentProps<typeof RadixCard>;

export const Card = (props: CardProps) => {
  return <RadixCard {...props} />;
};
