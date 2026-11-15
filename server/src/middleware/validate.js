/**
 * express-validator klaidų apdorojimas.
 * Dedamas po validacijos grandinių; jei yra klaidų — grąžina 400 su sąrašu.
 */
import { validationResult } from 'express-validator';

export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validacijos klaida.',
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

export default handleValidation;
