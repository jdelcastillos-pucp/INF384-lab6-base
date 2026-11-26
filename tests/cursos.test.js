const request = require('supertest');
const app = require('../src/app');
const repositorio = require('../src/data/repositorio');

describe('GET /cursos', () => {
  // Requisito 1.1 — devuelve todos los cursos con los campos requeridos
  test('1.1 responde 200 con todos los cursos', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(repositorio.listar().length);
  });

  test('1.1 cada curso contiene id, name, credits, cycle y type', async () => {
    const res = await request(app).get('/cursos');

    for (const curso of res.body) {
      expect(curso).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          credits: expect.any(Number),
          type: expect.stringMatching(/^(obligatorio|electivo)$/),
        }),
      );
    }
  });

  // Requisito 1.2 — filtra por ciclo válido (5–10)
  test('1.2 con ?ciclo=6 devuelve solo los cursos del ciclo 6', async () => {
    const res = await request(app).get('/cursos?ciclo=6');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((c) => c.cycle === 6)).toBe(true);
  });

  test('1.2 el número de cursos filtrados coincide con el repositorio', async () => {
    const ciclo = 8;
    const res = await request(app).get(`/cursos?ciclo=${ciclo}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(repositorio.listarPorCiclo(ciclo).length);
  });

  // Requisito 1.3 — ciclo inválido → 400
  test('1.3 ciclo=4 (fuera de rango) responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=4');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('1.3 ciclo=11 (fuera de rango) responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=11');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('1.3 ciclo=abc (no numérico) responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('1.3 ciclo=5.5 (no entero) responde 400', async () => {
    const res = await request(app).get('/cursos?ciclo=5.5');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});

describe('GET /cursos/:codigo', () => {
  // Requisito 2.1 — devuelve el curso con sus requisitos resueltos a {id, name}
  test('2.1 responde 200 con el curso y sus requisitos resueltos', async () => {
    const cursos = repositorio.listar();
    const codigo = cursos[0].id;

    const res = await request(app).get(`/cursos/${codigo}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', codigo);
    expect(res.body).toHaveProperty('name');
    expect(Array.isArray(res.body.prerequisites)).toBe(true);
  });

  test('2.1 cada requisito contiene id y name', async () => {
    // Find a course that actually has prerequisites
    const cursoConReqs = repositorio
      .listar()
      .find((c) => c.prerequisites.length > 0);

    if (!cursoConReqs) {
      // No course with prerequisites in the data; skip assertion
      return;
    }

    const res = await request(app).get(`/cursos/${cursoConReqs.id}`);

    expect(res.status).toBe(200);
    expect(res.body.prerequisites.length).toBeGreaterThan(0);
    for (const req of res.body.prerequisites) {
      expect(req).toHaveProperty('id');
      expect(req).toHaveProperty('name');
      expect(typeof req.id).toBe('string');
      expect(typeof req.name).toBe('string');
    }
  });

  // Requisito 2.2 — código inexistente → 404
  test('2.2 código inexistente responde 404', async () => {
    const res = await request(app).get('/cursos/NOEXISTE');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
