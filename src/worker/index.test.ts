import { describe, expect, it } from "vitest";
import app from "./index";
import type { Bindings } from "./env";

describe("GET /api/salud", () => {
  it("responde ok y refleja el modo demostración", async () => {
    const res = await app.request("/api/salud", {}, { DEMO_MODE: "true" } as Bindings);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, nombre: "indagora", demo: true });
  });

  it("demo es false cuando DEMO_MODE no es 'true'", async () => {
    const res = await app.request("/api/salud", {}, { DEMO_MODE: "false" } as Bindings);
    expect(await res.json()).toMatchObject({ demo: false });
  });
});
