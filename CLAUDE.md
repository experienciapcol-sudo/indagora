# Indagora · diagnóstico organizacional basado en evidencia

En inglés: *Indagora · the organizational diagnosis agent that investigates before it prescribes.*

Agente de diagnóstico organizacional para consultores en administración. Recibe entrevistas (texto o audio) y un objetivo, investiga por su cuenta con un método de análisis de problemas reconocido, y entrega un diagnóstico y un plan de intervención en el que cada conclusión apunta a la oración que la sostiene. El código revisa cada movimiento del agente antes de que ocurra.

Si existe `CLAUDE.local.md`, léelo primero: contiene las reglas privadas del proyecto y el orden de lectura.

## Reglas técnicas

- Toda la IA del producto pasa por la Meta Model API. Ninguna llamada a otro proveedor dentro del producto.
- Los nombres de modelo viven solo en `src/config/models.ts` y en variables de entorno. Se confirman con `GET /models`.
- El esfuerzo de razonamiento se fija en cada llamada.
- Salida estructurada con JSON Schema estricto, definida una sola vez con Zod.
- El modelo nunca escribe citas: señala identificadores de oraciones reales (enum) y el servidor reconstruye el texto. El código verifica hablante, turno y texto.
- Los niveles de evidencia (N0 sin explorar, N1 opinión, N2 testimonio específico, N3 corroborado entre roles, N4 documentado) los calcula el código. Con una sola fuente nada pasa de N2. Nunca rotular como "verificado" lo que dijo una sola persona ni prometer "cero alucinaciones".
- Una causa con nivel N0 o N1 solo admite acciones de verificación. Solo N3 o N4 admite intervención.
- El flujo lo dirige un bucle con objetivo; el código aprueba o rechaza cada acción. Cada agente o llamada al modelo se gana su lugar con una métrica medida contra un solo prompt.
- Solo datos ficticios. Nunca versionar claves, `.env`, `.dev.vars`, `CLAUDE.local.md` ni la carpeta `interno/`.
- Todo endpoint público tiene tope de gasto por sesión y global, y modo de demostración sin costo.
- Pruebas antes de dar una fase por terminada. Commits pequeños y frecuentes con mensajes claros.
- Sistema operativo Windows: comandos para PowerShell.
