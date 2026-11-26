const express = require('express');
const repositorio = require('../data/repositorio');
const { validarAprobados } = require('../middleware/validarAprobados');

const router = express.Router();

// POST /habilitados
router.post('/', validarAprobados, (req, res) => {
  const aprobados = new Set(req.body.aprobados);

  const habilitados = repositorio
    .listar()
    .filter(
      (c) => !aprobados.has(c.id) && c.prerequisites.every((p) => aprobados.has(p))
    )
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(({ id, name, credits, cycle, type }) => ({ id, name, credits, cycle, type }));

  return res.status(200).json(habilitados);
});

module.exports = router;
