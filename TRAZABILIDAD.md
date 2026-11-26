# Trazabilidad

## Decisiones de diseño — ajustes al borrador inicial

| Documento | Límite original propuesto | Límite adoptado | Razón |
|---|---|---|---|
| requirements.md | Límite de 500 elementos | Límite de 100 + respuesta < 500 ms | El catálogo tiene 87 cursos; 500 no corta un abuso realista y no había tiempo medible |
| requirements.md | Caracteres [A-Za-z0-9] | Formato exacto `^[0-9][A-Z]{3}[0-9]{2}$` sin eco del valor | El charset aceptaba "abc"; el formato exacto rechaza `1INF30<script>` y evita XSS reflejado |

## Requisitos no funcionales → gate → evidencia

| Requisito | Gate o test | Bloquea / Avisa | Etapa | Link run fallido | Link run corregido |
|---|---|---|---|---|---|
| **3.1** Input validation — tamaño máximo | Test `3.1: 101 elementos → 400` en `tests/habilitados.test.js` | **Bloquea** (test falla si no se valida) | Push / PR | [Run fallido — commit `af7d6e8`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `af7d6e8`) | [Run corregido — commit `2c74421`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `2c74421`) |
| **3.3** Respuesta < 500 ms con 100 elementos | Test `3.3: 100 elementos responde en < 500 ms` en `tests/habilitados.test.js` | **Bloquea** (test falla si supera el umbral) | Push / PR | [Run fallido — commit `af7d6e8`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `af7d6e8`) | [Run corregido — commit `2c74421`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `2c74421`) |
| **4.3** Formato de elemento y no eco del valor | Test `4.3: ["1INF30<script>"] → 400 y body sin <script>` en `tests/habilitados.test.js` | **Bloquea** (test falla si se expone el valor) | Push / PR | [Run fallido — commit `af7d6e8`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `af7d6e8`) | [Run corregido — commit `2c74421`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `2c74421`) |
| **5.1** Sin detalle interno en 4xx/5xx | Test `5.1: body solo contiene error, sin at / \\ / /src/` en `tests/habilitados.test.js` | **Bloquea** (test falla si aparece stack trace o ruta) | Push / PR | [Run fallido — commit `af7d6e8`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `af7d6e8`) | [Run corregido — commit `2c74421`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `2c74421`) |
| **5.2** 500 sin detalle ante excepción no controlada | Test `5.2: mock repositorio.listar lanza → 500 {"error":"Internal server error"}` en `tests/habilitados.test.js` | **Bloquea** (test falla si se expone mensaje interno) | Push / PR | [Run fallido — commit `af7d6e8`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `af7d6e8`) | [Run corregido — commit `2c74421`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `2c74421`) |
| **6.1** Cobertura de líneas ≥ 80 % | Job `test`: `jest --coverage` con `coverageThreshold.global.lines = 80` en `jest.config.js` | **Bloquea** | Push a `main` y PR | No fue necesario un run en rojo: la cobertura quedó exactamente en 80 % al agregar el gate (commit `c1c10bf`) — el job pasó directo | [Run corregido — commit de task 6](https://github.com/ezeAst/INF384-lab6-base/actions) (cobertura subió a 100 % con `tests/formato.test.js`) |
| **7.1** Sin dependencias high/critical (SCA) | Job `sca`: `npm audit --audit-level=high` | **Bloquea** | Push a `main` y PR | [Run fallido — commit `c1c10bf`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `c1c10bf`, lodash 4.17.20 vulnerabilidad alta) | [Run corregido — commit `5726e43`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `5726e43`, lodash actualizado a 4.17.21) |
| **8.1** Sin secretos en el historial (gitleaks) | Job `secrets`: `gitleaks/gitleaks-action@v2` con `fetch-depth: 0` | **Bloquea** | Push a `main` y PR | [Run fallido — commit `c1c10bf`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `c1c10bf`, clave expuesta en `config/ejemplo.env`) | [Run corregido — commit `774bd42`](https://github.com/ezeAst/INF384-lab6-base/actions) (run triggered by commit `774bd42`, clave rotada y fingerprint en `.gitleaksignore`) |

## Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué se cambió | Por qué |
|---|---|---|---|
| `requirements.md` | Límite de 500 elementos en `aprobados` para evitar DoS | Límite reducido a 100 elementos | El catálogo solo tiene 87 cursos; 500 no frena un abuso real. 100 da margen razonable y es más fácil de justificar ante auditoría. |
| `requirements.md` | Validación de elemento: solo caracteres `[A-Za-z0-9]` | Regex estricto `^[0-9][A-Z]{3}[0-9]{2}$` sin eco del valor en la respuesta | El charset original aceptaba strings como `"abc"` o `"1INF30<script>"`. El regex refleja exactamente el formato del catálogo y el requisito de no echar el valor inválido evita XSS reflejado. |
| `design.md` | Dependencia `fast-check` para property-based testing | No se agregó; se usan tests de ejemplo con supertest | Cada dependencia nueva amplía la superficie auditada por el gate de SCA y requiere justificación en `tech.md`. Los tests de ejemplo cubren todos los criterios de aceptación sin dependencias extra. |
| `.github/workflows/ci.yml` | SAST (CodeQL) bloqueante | SAST con `continue-on-error: true` (avisa, no bloquea) | CodeQL es una herramienta nueva en el equipo; sus falsos positivos no están calibrados. Se pasa a bloquear severidad `high` una vez que se establezca una línea base. |
