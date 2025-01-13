import { Relationships } from "./relationships";

export type Included<T extends string, A, R extends Relationships<any> | undefined = undefined> = {
  type: T;
  id: string;
  attributes: A;
  links: { self: string };
} & (R extends undefined ? {} : { relationships: R });
