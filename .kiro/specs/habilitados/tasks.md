# Implementation Plan: habilitados

## Overview

Implementa `POST /habilitados` con su validación, endurece el manejo de errores, agrega los gates de cobertura, SCA, secretos y SAST al pipeline, y corrige lo que esos gates detectan. Cada tarea termina con commit y push para dejar un run en GitHub Actions como evidencia. El orden deja primero un run en rojo (tests o gate) y luego el run corregido, para `TRAZABILIDAD.md`.

## Tasks

- [x] 1. Escribir los tests de `POST /habilitados` antes de implementar (run en rojo)
  - Crear `tests/habilitados.test.js` con supertest sobre `src/app.js`:
    - 1.1/1.5: `["1INF25","1INF27","1INF49"]` → 200, 27 cursos, incluye 1INF29, 1INF30, 1INF31, 1INF32.
    - 1.2: ningún curso devuelto tiene un requisito fuera de `aprobados`.
    - 1.3: ningún curso devuelto está en `aprobados`.
    - 1.4: `[]` → 200 y todos los cursos devueltos tienen `prerequisites` vacío en el catálogo.
    - 2.1: `aprobados` = `"1INF25"`, `123`, `null`, `{}` → 400 con `error`.
    - 2.2: body `{}` → 400 con `error`.
    - 2.3: JSON malformado → 400; `Content-Type: text/plain` → 400.
    - 3.1: 101 elementos → 400; 5 000 elementos → 400 o 413.
    - 3.2: 100 elementos válidos → 200.
    - 3.3: 100 elementos responde en < 500 ms.
    - 4.1: `[123]` → 400.
    - 4.2: `[""]` → 400.
    - 4.3: `["1INF30<script>"]` → 400 y el body no contiene `<script>`.
    - 5.1: en todos los 4xx el body tiene solo la clave `error` y no contiene `at `, `\\` ni `/src/`.
    - 5.2: `jest.spyOn(repositorio, 'listar')` lanza error → 500 `{"error":"Internal server error"}`.
  - Commit `test: tests de habilitados (rojo)` y push. Guardar el link del run fallido.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 2. Crear el middleware `src/middleware/validarAprobados.js`
  - Exportar `validarAprobados(req, res, next)` con esta cadena, respondiendo 400 `{ "error": "<mensaje>" }` en cada falla y sin repetir el valor recibido:
    1. `req.body` es objeto y tiene `aprobados` → si no: `"aprobados debe ser un arreglo de códigos"`.
    2. `aprobados` es `Array` → mismo mensaje.
    3. `aprobados.length <= 100` → si no: `"aprobados admite como máximo 100 códigos"`.
    4. Cada elemento es `string` no vacío y cumple `/^[0-9][A-Z]{3}[0-9]{2}$/` → si no: `"código de curso inválido"`.
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3_

- [x] 3. Crear la ruta `src/routes/habilitados.js`
  - Router con `POST /` que aplica `validarAprobados` y luego:
    1. `const aprobados = new Set(req.body.aprobados)`.
    2. Filtra `repositorio.listar()` con `!aprobados.has(c.id) && c.prerequisites.every(p => aprobados.has(p))`.
    3. Ordena por `id` ascendente y proyecta a `{ id, name, credits, cycle, type }`.
    4. Responde 200.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.3_

- [x] 4. Actualizar `src/app.js`
  - `app.use(express.json({ limit: '10kb' }))`.
  - `app.use('/habilitados', require('./routes/habilitados'))` después de `/cursos`.
  - Middleware de errores final: `entity.parse.failed` → 400 `JSON inválido`; `entity.too.large` → 413 `solicitud demasiado grande`; cualquier otro → 500 `Internal server error`. Nunca incluir `err.message` ni `err.stack`.
  - Ejecutar `npm test`: todos los tests de la tarea 1 en verde. Commit y push; guardar el link del run corregido.
  - _Requirements: 2.3, 3.1, 5.1, 5.2_

- [x] 5. Agregar el gate de cobertura
  - En `jest.config.js` agregar `coverageThreshold: { global: { lines: 80 } }`.
  - En `package.json` cambiar `"test": "jest"` por `"test": "jest --coverage"`.
  - Si la cobertura queda bajo 80 %, hacer commit y push igual para dejar el run en rojo como evidencia.
  - _Requirements: 6.1, 6.2_

- [x] 6. Subir la cobertura sobre 80 %
  - Crear `tests/formato.test.js` con al menos un test por función exportada de `src/util/formato.js`, incluidos los casos `null`/vacío.
  - `npm test` en verde con líneas ≥ 80 %. Commit y push; guardar el link del run corregido.
  - _Requirements: 6.1, 6.2_

- [x] 7. Agregar los gates de SCA, secretos y SAST en `.github/workflows/ci.yml`
  - Jobs independientes (sin `needs`) para que cada gate corra aunque otro falle:
    - `test`: `npm ci` + `npm test` (incluye cobertura).
    - `sca`: `npm ci` + `npm audit --audit-level=high`.
    - `secrets`: `actions/checkout@v4` con `fetch-depth: 0` + `gitleaks/gitleaks-action@v2` con `GITHUB_TOKEN`.
    - `sast`: `permissions: security-events: write`, `github/codeql-action/init@v3` (`languages: javascript`) + `github/codeql-action/analyze@v3` con `continue-on-error: true` (avisa, no bloquea).
  - Disparadores: `pull_request` y `push` a `main`.
  - Commit y push. Se espera `sca` en rojo (lodash 4.17.20) y `secrets` en rojo (clave en `config/ejemplo.env`). Guardar ambos links.
  - _Requirements: 7.1, 7.2, 8.1, 8.2_

- [x] 8. Corregir el hallazgo de SCA
  - `npm install lodash@^4.17.21` y verificar `npm audit --audit-level=high` sin hallazgos high/critical.
  - Commit `fix: actualiza lodash por vulnerabilidad alta` y push; guardar el link del run con `sca` en verde.
  - _Requirements: 7.1, 7.2_

- [x] 9. Corregir el hallazgo de secretos
  - Reemplazar el valor de `CATALOGO_API_KEY` en `config/ejemplo.env` por `CATALOGO_API_KEY=<reemplazar-localmente>`.
  - Registrar la clave como rotada: la clave original sigue en el historial, así que se agrega su fingerprint (tal como lo reporta gitleaks en el run fallido) a `.gitleaksignore` con un comentario de la razón: `# clave de ejemplo rotada el 2026-11-26; el valor del historial ya no es válido`.
  - Commit `fix: elimina y rota clave expuesta` y push; guardar el link del run con `secrets` en verde.
  - _Requirements: 8.1, 8.2_

- [x] 10. Completar `TRAZABILIDAD.md`
  - Una fila por requisito no funcional (3, 4, 5, 6, 7, 8): gate o test, bloquea/avisa, etapa, link al run fallido y link al run corregido (o nombre del test que falló antes de la corrección).
  - Tabla de cambios a la propuesta de Kiro con qué propuso, qué se cambió y por qué.
  - Verificar que el último run de `main` está en verde.
  - _Requirements: 3.1, 3.3, 4.3, 5.1, 5.2, 6.1, 7.1, 8.1_

## Notes

- Ningún test es opcional: cada criterio de aceptación tiene al menos un test (regla de `tech.md`).
- No se agregan dependencias nuevas; solo se actualiza `lodash`.
- Commit y push después de cada tarea (regla del lab).