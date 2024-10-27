type APIResponse<M = any, D = any> =
  | {
      ok: true;
      message: M;
    }
  | {
      ok: false;
      description: D;
    };

export default APIResponse;
