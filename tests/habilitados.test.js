'use strict';

/**
 * Tests para POST /habilitados
 * Estos tests están escritos ANTES de implementar el endpoint (run en rojo).
 *
 * Cobertura:
 *   Req 1.1, 1.5 — cálculo correcto con aprobados = ["1INF25","1INF27","1INF49"]
 *   Req 1.2      — ningún habilitado tiene requisito fuera de aprobados
 *   Req 1.3      — ningún habilitado está en aprobados
 *   Req 1.4      — aprobados = [] → solo cursos sin requisitos
 *   Req 2.1      — aprobados no es array → 400
 *   Req 2.2      — body sin campo aprobados → 400
 *   Req 2.3      — JSON malformado / Content-Type incorrecto → 400
 *   Req 3.1      — > 100 elementos → 400
 *   Req 3.2      — 100 elementos válidos → 200
 *   Req 3.3      — 100 elementos responde en < 500 ms
 *   Req 4.1      — elemento numérico → 400
 *   Req 4.2      — elemento cadena vacía → 400
 *   Req 4.3      — elemento con caracteres inválidos → 400, body sin <script>
 *   Req 5.1      — cuerpos 4xx no exponen stack traces ni rutas internas
 *   Req 5.2      — repositorio.listar() lanza → 500 {"error":"Internal server error"}
 */

const request = require('supertest');
const app = require('../src/app');
const repositorio = require('../src/data/repositorio');

// Helpers ----------------------------------------------------------------

/** Genera n códigos de curso válidos (formato 1INFxx). */
function generarCodigos(n) {
  const codigos = [];
  for (let i = 0; i < n; i++) {
    // Formato ^[0-9][A-Z]{3}[0-9]{2}$  → "1INF00".."1INF99" (100 distintos)
    const sufijo = String(i).padStart(2, '0');
    codigos.push(`1INF${sufijo}`);
  }
  return codigos;
}

// Bloque principal -------------------------------------------------------

describe('POST /habilitados', () => {
  // ── Req 1.1 y 1.5: cálculo con aprobados conocido ──────────────────────
  describe('Req 1.1 / 1.5 — cálculo correcto', () => {
    let res;
    const aprobados = ['1INF25', '1INF27', '1INF49'];

    beforeAll(async () => {
      res = await request(app)
        .post('/habilitados')
        .send({ aprobados })
        .set('Content-Type', 'application/json');
    });

    test('responde 200', () => {
      expect(res.status).toBe(200);
    });

    test('devuelve exactamente 27 cursos', () => {
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(27);
    });

    test('incluye 1INF29', () => {
      expect(res.body.map((c) => c.id)).toContain('1INF29');
    });

    test('incluye 1INF30', () => {
      expect(res.body.map((c) => c.id)).toContain('1INF30');
    });

    test('incluye 1INF31', () => {
      expect(res.body.map((c) => c.id)).toContain('1INF31');
    });

    test('incluye 1INF32', () => {
      expect(res.body.map((c) => c.id)).toContain('1INF32');
    });
  });

  // ── Req 1.2: ningún habilitado tiene requisito fuera de aprobados ───────
  test('Req 1.2 — ningún habilitado tiene prerequisito fuera de aprobados', async () => {
    const aprobados = ['1INF25', '1INF27', '1INF49'];
    const aprobadosSet = new Set(aprobados);

    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);

    // Obtenemos el catálogo para recuperar los prerequisites reales
    const catalogo = repositorio.listar();
    const porId = new Map(catalogo.map((c) => [c.id, c]));

    for (const curso of res.body) {
      const enCatalogo = porId.get(curso.id);
      expect(enCatalogo).toBeDefined();
      for (const req of enCatalogo.prerequisites) {
        expect(aprobadosSet.has(req)).toBe(true);
      }
    }
  });

  // ── Req 1.3: ningún aprobado aparece como habilitado ───────────────────
  test('Req 1.3 — ningún curso habilitado está en aprobados', async () => {
    const aprobados = ['1INF25', '1INF27', '1INF49'];
    const aprobadosSet = new Set(aprobados);

    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);

    for (const curso of res.body) {
      expect(aprobadosSet.has(curso.id)).toBe(false);
    }
  });

  // ── Req 1.4: aprobados vacío → solo cursos sin prerequisites ───────────
  test('Req 1.4 — aprobados=[] devuelve solo cursos con prerequisites vacío', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [] })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const catalogo = repositorio.listar();
    const porId = new Map(catalogo.map((c) => [c.id, c]));

    for (const curso of res.body) {
      const enCatalogo = porId.get(curso.id);
      expect(enCatalogo).toBeDefined();
      expect(enCatalogo.prerequisites).toHaveLength(0);
    }
  });

  // ── Req 2.1: aprobados no es array → 400 ───────────────────────────────
  describe('Req 2.1 — aprobados no es array', () => {
    const casos = [
      { label: 'string', body: { aprobados: '1INF25' } },
      { label: 'number', body: { aprobados: 123 } },
      { label: 'null', body: { aprobados: null } },
      { label: 'object', body: { aprobados: {} } },
    ];

    test.each(casos)('$label → 400 con error', async ({ body }) => {
      const res = await request(app)
        .post('/habilitados')
        .send(body)
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });

  // ── Req 2.2: body sin campo aprobados → 400 ────────────────────────────
  test('Req 2.2 — body {} responde 400 con error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({})
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ── Req 2.3: JSON malformado / Content-Type incorrecto ─────────────────
  test('Req 2.3 — JSON malformado responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send('{aprobados:[}');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Req 2.3 — Content-Type: text/plain responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'text/plain')
      .send('{"aprobados":[]}');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ── Req 3.1: más de 100 elementos → 400 (o 413 para 5000) ─────────────
  test('Req 3.1 — 101 elementos responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: generarCodigos(101) })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('Req 3.1 — 5000 elementos responde 400 o 413', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: generarCodigos(100).concat(Array(4900).fill('1INF00')) })
      .set('Content-Type', 'application/json');

    expect([400, 413]).toContain(res.status);
    expect(res.body).toHaveProperty('error');
  });

  // ── Req 3.2: 100 elementos válidos → 200 ──────────────────────────────
  test('Req 3.2 — 100 elementos válidos responde 200', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: generarCodigos(100) })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // ── Req 3.3: 100 elementos responde en < 500 ms ────────────────────────
  test('Req 3.3 — 100 elementos responde en menos de 500 ms', async () => {
    const inicio = Date.now();

    await request(app)
      .post('/habilitados')
      .send({ aprobados: generarCodigos(100) })
      .set('Content-Type', 'application/json');

    expect(Date.now() - inicio).toBeLessThan(500);
  });

  // ── Req 4.1: elemento no string → 400 ─────────────────────────────────
  test('Req 4.1 — elemento numérico [123] responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [123] })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ── Req 4.2: elemento cadena vacía → 400 ──────────────────────────────
  test('Req 4.2 — elemento cadena vacía [""] responde 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: [''] })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  // ── Req 4.3: elemento con formato inválido → 400, sin echo del valor ───
  test('Req 4.3 — ["1INF30<script>"] responde 400 y el body no contiene <script>', async () => {
    const res = await request(app)
      .post('/habilitados')
      .send({ aprobados: ['1INF30<script>'] })
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toContain('<script>');
  });

  // ── Req 5.1: 4xx no exponen stack traces ni rutas internas ─────────────
  describe('Req 5.1 — respuestas 4xx sin información interna', () => {
    const casosBad = [
      { label: 'body vacío', body: {} },
      { label: 'aprobados null', body: { aprobados: null } },
      { label: 'elemento inválido', body: { aprobados: [123] } },
      { label: '101 elementos', body: { aprobados: generarCodigos(101) } },
      { label: 'elemento vacío', body: { aprobados: [''] } },
    ];

    test.each(casosBad)(
      '$label — body tiene solo clave error y no contiene at / \\ / /src/',
      async ({ body }) => {
        const res = await request(app)
          .post('/habilitados')
          .send(body)
          .set('Content-Type', 'application/json');

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(600);

        // Solo debe existir la clave "error"
        expect(Object.keys(res.body)).toEqual(['error']);

        const bodyStr = JSON.stringify(res.body);
        expect(bodyStr).not.toMatch(/\bat\b /);   // stack trace lines
        expect(bodyStr).not.toContain('\\');       // Windows paths
        expect(bodyStr).not.toContain('/src/');    // Unix internal paths
      },
    );
  });

  // ── Req 5.2: excepción en repositorio → 500 sin detalle ────────────────
  test('Req 5.2 — repositorio.listar lanza → 500 {"error":"Internal server error"}', async () => {
    const spy = jest
      .spyOn(repositorio, 'listar')
      .mockImplementation(() => {
        throw new Error('boom');
      });

    try {
      const res = await request(app)
        .post('/habilitados')
        .send({ aprobados: ['1INF25'] })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Internal server error' });
    } finally {
      spy.mockRestore();
    }
  });
});
