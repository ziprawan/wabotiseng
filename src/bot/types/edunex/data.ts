import { Relationships } from "./relationships";

export type ResponseData<N extends string, T, R extends [string, ...string[]] | undefined = undefined> = {
  type: N;
  id: string;
  attributes: T;
  links: { self: string; related?: string | null | undefined };
  relationships: R extends [string, ...string[]] ? Relationships<R> : undefined;
};
