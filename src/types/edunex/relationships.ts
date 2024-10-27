// AFAIK, field name uses data.type value

/**
 * @example
 * const relationships: Relationships<["lecturer", "user"]> = {
 *   lecturer: { links: { ... }, data: { type: "lecturer", id: "..." } },
 *   user: { links: { ... }, data: { type: "user", id: "..." } },
 * }
 */
export type Relationships<
  Type extends [string, ...string[]],
  DataType extends [string, ...string[]] = Type,
> = Type["length"] extends DataType["length"]
  ? {
      [K in keyof Type[number]]: {
        links: { self: string; related: string };
        data: { type: DataType[K & keyof DataType]; id: string };
      };
    }[number] extends infer R
    ? {
        [P in Type[number]]: Extract<R, { data: { type: DataType[Extract<P, keyof Type> & keyof DataType] } }>;
      }
    : never
  : never;
