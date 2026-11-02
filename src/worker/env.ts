// Bindings del Worker. El secreto META_API_KEY viene de .dev.vars (local) o `wrangler secret` (producción).
export type Bindings = {
  DB: D1Database;  META_API_KEY: string;
  META_API_BASE_URL: string;
  MODEL_AGENT: string;
  MODEL_AGENT_CONTRIBUTOR: string;
  MODEL_TRANSCRIBE: string;
  DEMO_MODE: string;
  TOPE_SESION_USD: string;
  TOPE_GLOBAL_USD: string;
  // Secreto para firmar la cookie de sesión (`wrangler secret`); obligatorio en https.
  SESION_SECRETO?: string;
  // "true" habilita POST /api/prueba (comprobación de despliegue); apagado por omisión.
  PERMITIR_PRUEBA?: string;
};
