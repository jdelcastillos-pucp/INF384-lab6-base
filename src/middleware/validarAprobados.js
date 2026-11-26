'use strict';

const CODIGO_REGEX = /^[0-9][A-Z]{3}[0-9]{2}$/;
const MAX_APROBADOS = 100;

/**
 * Middleware que valida el campo `aprobados` del body antes de procesar
 * la solicitud POST /habilitados.
 *
 * Responde 400 { "error": "<mensaje>" } en cada falla sin reflejar
 * el valor recibido (req. 4.3).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validarAprobados(req, res, next) {
  // 1. req.body debe ser objeto y contener el campo `aprobados` (req. 2.1, 2.2)
  if (!req.body || typeof req.body !== 'object' || !Object.prototype.hasOwnProperty.call(req.body, 'aprobados')) {
    return res.status(400).json({ error: 'aprobados debe ser un arreglo de códigos' });
  }

  const { aprobados } = req.body;

  // 2. `aprobados` debe ser un Array (req. 2.1)
  if (!Array.isArray(aprobados)) {
    return res.status(400).json({ error: 'aprobados debe ser un arreglo de códigos' });
  }

  // 3. No más de 100 elementos (req. 3.1)
  if (aprobados.length > MAX_APROBADOS) {
    return res.status(400).json({ error: 'aprobados admite como máximo 100 códigos' });
  }

  // 4. Cada elemento: string no vacío que cumple el patrón (req. 4.1, 4.2, 4.3)
  for (const elemento of aprobados) {
    if (typeof elemento !== 'string' || elemento.length === 0 || !CODIGO_REGEX.test(elemento)) {
      return res.status(400).json({ error: 'código de curso inválido' });
    }
  }

  next();
}

module.exports = { validarAprobados };
