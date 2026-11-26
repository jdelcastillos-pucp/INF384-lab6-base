const express = require('express');
const repositorio = require('../data/repositorio');

const router = express.Router();

// GET /cursos  o  GET /cursos?ciclo=N
router.get('/', (req, res) => {
  const { ciclo } = req.query;

  if (ciclo !== undefined) {
    const n = Number(ciclo);

    // ciclo debe ser un entero entre 5 y 10
    if (!Number.isInteger(n) || n < 5 || n > 10) {
      return res
        .status(400)
        .json({ error: 'ciclo debe ser un entero entre 5 y 10' });
    }

    return res.json(repositorio.listarPorCiclo(n));
  }

  return res.json(repositorio.listar());
});

// GET /cursos/:codigo
router.get('/:codigo', (req, res) => {
  const curso = repositorio.obtener(req.params.codigo);

  if (!curso) {
    return res.status(404).json({ error: 'Curso no encontrado' });
  }

  const prerequisitesResueltos = curso.prerequisites
    .map((id) => {
      const req2 = repositorio.obtener(id);
      return req2 ? { id: req2.id, name: req2.name } : null;
    })
    .filter(Boolean);

  return res.json({ ...curso, prerequisites: prerequisitesResueltos });
});

module.exports = router;
