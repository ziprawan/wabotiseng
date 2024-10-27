import { Me } from "@/types/edunex/me";
import { buildAPIURI, Params } from "./uri";

export class EdunexAPI {
  constructor(private token: string) {}

  async fetch(path: { pathname: string; params?: Params }, init?: RequestInit) {
    const { headers, ...newInit } = init ?? {};

    return await fetch(buildAPIURI(path.pathname, path.params), {
      headers: { Authorization: `Bearer ${this.token}`, ...headers },
      ...newInit,
    });
  }

  async getMe(): Promise<Me | string> {
    const resp = await this.fetch({ pathname: "/login/me" });

    if (resp.status === 200) {
      return await resp.json();
    } else {
      return await resp.text();
    }
  }
}
