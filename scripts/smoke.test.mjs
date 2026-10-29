// Pruebas sin red del smoke test: corpus ficticio, esquema y evaluador.
// Uso: node --test scripts/smoke.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearTranscripcion, esquemaAnalista, evaluarAnalista } from './smoke.mjs';

test('la transcripción tiene n oraciones únicas con 3 claves y 2 opiniones', () => {
  for (const n of [120, 400, 950]) {
    const oraciones = crearTranscripcion(n);
    assert.equal(oraciones.length, n);
    assert.equal(new Set(oraciones.map((o) => o.id)).size, n);
    assert.equal(new Set(oraciones.map((o) => o.texto)).size, n);
    assert.equal(oraciones.filter((o) => o.tipo === 'clave').length, 3);
    assert.equal(oraciones.filter((o) => o.tipo === 'opinion').length, 2);
  }
});

test('el esquema cumple el subconjunto estricto: objetos cerrados y todo requerido', () => {
  const revisar = (nodo) => {
    if (nodo?.type === 'object') {
      assert.equal(nodo.additionalProperties, false);
      assert.deepEqual([...nodo.required].sort(), Object.keys(nodo.properties).sort());
      Object.values(nodo.properties).forEach(revisar);
    }
    if (nodo?.type === 'array') revisar(nodo.items);
  };
  revisar(esquemaAnalista(['s001', 's002']));
});

test('el evaluador cuenta claves, ids inválidos y opiniones rotuladas', () => {
  const oraciones = crearTranscripcion(120);
  const clave = oraciones.find((o) => o.tipo === 'clave');
  const opinion = oraciones.find((o) => o.tipo === 'opinion');
  const salida = {
    hallazgos: [
      { oracion_id: clave.id, tipo: 'hecho', resumen: 'x' },
      { oracion_id: opinion.id, tipo: 'hecho', resumen: 'y' },
      { oracion_id: 's999', tipo: 'cifra', resumen: 'z' },
    ],
    causa_probable: 'c',
  };
  const r = evaluarAnalista(JSON.stringify(salida), oraciones);
  assert.equal(r.clavesEncontradas, '1/3');
  assert.equal(r.idsInvalidos, 1);
  assert.equal(r.opinionesRotuladas, '0/1');
  assert.equal(evaluarAnalista('no es json', oraciones).jsonValido, false);
  assert.equal(evaluarAnalista('null', oraciones).jsonValido, false);
});

test('importar el módulo no lanza la corrida contra la API', async () => {
  // Si la guarda de ejecución directa fallara, este archivo haría llamadas reales al importarlo.
  const mod = await import('./smoke.mjs');
  assert.equal(typeof mod.crearTranscripcion, 'function');
});
