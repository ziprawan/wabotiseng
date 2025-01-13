export const EDUNEX_API_ENDPOINT = new URL("https://api-edunex.cognisia.id");

export type Params = {
  [key: string]: any | any[] | Params;
};

export function buildParamKey(key: string, value: any | any[] | Params, parent?: string): [string, string][] {
  if (Array.isArray(value)) {
    return [[parent ? `${parent}[${key}]` : key, value.join(",")]];
  } else if (typeof value !== "object") {
    return [[parent ? `${parent}[${key}]` : key, String(value)]];
  } else {
    const res: [string, string][] = [];
    const toParent = parent ? `${parent}[${key}]` : key;

    Object.entries(value).forEach(([key, value]) => {
      res.push(...buildParamKey(key, value, toParent));
    });

    return res;
  }
}

export function buildAPIURI(pathname: string, params?: Params) {
  const url = new URL(EDUNEX_API_ENDPOINT);
  url.pathname = pathname;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      buildParamKey(key, value).forEach((r) => url.searchParams.set(r[0], r[1]));
    });
  }

  return url.href;
}
