const {
  formatearNombre,
  formatearCreditos,
  formatearCiclo,
  formatearTipo,
  resumenCurso,
  totalCreditos,
  agruparPorCiclo,
  ordenarPorCreditos,
  listaRequisitos,
} = require('../src/util/formato');

// Requisito 6.1 — Cobertura de funciones de formato

describe('formatearNombre', () => {
  test('capitaliza cada palabra', () => {
    expect(formatearNombre('cálculo diferencial')).toBe('Cálculo Diferencial');
  });

  test('maneja una sola palabra', () => {
    expect(formatearNombre('algebra')).toBe('Algebra');
  });

  test('maneja entrada ya en mayúsculas', () => {
    expect(formatearNombre('FISICA')).toBe('Fisica');
  });
});

describe('formatearCreditos', () => {
  test('formatea número entero con un decimal', () => {
    expect(formatearCreditos(3)).toBe('3.0 créditos');
  });

  test('formatea número con decimales', () => {
    expect(formatearCreditos(4.5)).toBe('4.5 créditos');
  });

  test('formatea cero', () => {
    expect(formatearCreditos(0)).toBe('0.0 créditos');
  });
});

describe('formatearCiclo', () => {
  test('devuelve "Ciclo N" para un número de ciclo', () => {
    expect(formatearCiclo(5)).toBe('Ciclo 5');
  });

  test('devuelve "Electivo" para null', () => {
    expect(formatearCiclo(null)).toBe('Electivo');
  });

  test('devuelve "Electivo" para undefined', () => {
    expect(formatearCiclo(undefined)).toBe('Electivo');
  });
});

describe('formatearTipo', () => {
  test('devuelve "Obligatorio" para tipo obligatorio', () => {
    expect(formatearTipo('obligatorio')).toBe('Obligatorio');
  });

  test('devuelve "Electivo" para tipo electivo', () => {
    expect(formatearTipo('electivo')).toBe('Electivo');
  });

  test('devuelve "Electivo" para valores desconocidos', () => {
    expect(formatearTipo('otro')).toBe('Electivo');
  });
});

describe('resumenCurso', () => {
  test('retorna el resumen con id, name y créditos', () => {
    const curso = { id: 'CS101', name: 'Introducción', credits: 3 };
    expect(resumenCurso(curso)).toBe('CS101 · Introducción · 3.0 créditos');
  });
});

describe('totalCreditos', () => {
  test('suma correctamente los créditos de varios cursos', () => {
    const cursos = [{ credits: 3 }, { credits: 4 }, { credits: 2 }];
    expect(totalCreditos(cursos)).toBe(9);
  });

  test('retorna 0 para lista vacía', () => {
    expect(totalCreditos([])).toBe(0);
  });
});

describe('agruparPorCiclo', () => {
  test('agrupa cursos por ciclo formateado', () => {
    const cursos = [
      { id: 'A', cycle: 5, credits: 3 },
      { id: 'B', cycle: 5, credits: 4 },
      { id: 'C', cycle: 6, credits: 3 },
    ];
    const result = agruparPorCiclo(cursos);
    expect(result['Ciclo 5']).toHaveLength(2);
    expect(result['Ciclo 6']).toHaveLength(1);
  });

  test('cursos con cycle null/undefined van al grupo "Electivo"', () => {
    const cursos = [
      { id: 'X', cycle: null, credits: 2 },
      { id: 'Y', cycle: undefined, credits: 2 },
    ];
    const result = agruparPorCiclo(cursos);
    expect(result['Electivo']).toHaveLength(2);
  });

  test('los cursos dentro de cada grupo están ordenados por id', () => {
    const cursos = [
      { id: 'Z', cycle: 7, credits: 3 },
      { id: 'A', cycle: 7, credits: 3 },
    ];
    const result = agruparPorCiclo(cursos);
    expect(result['Ciclo 7'][0].id).toBe('A');
    expect(result['Ciclo 7'][1].id).toBe('Z');
  });
});

describe('ordenarPorCreditos', () => {
  test('ordena cursos de mayor a menor créditos', () => {
    const cursos = [
      { id: 'A', credits: 2 },
      { id: 'B', credits: 5 },
      { id: 'C', credits: 3 },
    ];
    const result = ordenarPorCreditos(cursos);
    expect(result[0].credits).toBe(5);
    expect(result[2].credits).toBe(2);
  });

  test('desempate por id ascendente', () => {
    const cursos = [
      { id: 'Z', credits: 3 },
      { id: 'A', credits: 3 },
    ];
    const result = ordenarPorCreditos(cursos);
    expect(result[0].id).toBe('A');
    expect(result[1].id).toBe('Z');
  });

  test('lista vacía devuelve array vacío', () => {
    expect(ordenarPorCreditos([])).toEqual([]);
  });
});

describe('listaRequisitos', () => {
  test('devuelve "Sin requisitos" para array vacío', () => {
    expect(listaRequisitos([])).toBe('Sin requisitos');
  });

  test('devuelve "Sin requisitos" para null', () => {
    expect(listaRequisitos(null)).toBe('Sin requisitos');
  });

  test('devuelve los códigos ordenados y separados por coma', () => {
    expect(listaRequisitos(['CS201', 'CS101'])).toBe('CS101, CS201');
  });

  test('un solo código se devuelve directamente', () => {
    expect(listaRequisitos(['CS101'])).toBe('CS101');
  });
});
