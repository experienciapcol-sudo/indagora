// Casos hostiles de la revisión final (3 nov), propuestos por Muse y escritos sin red: el
// segmentador, el verificador y los niveles deben sostener las reglas con entradas tramposas.
import { describe, expect, it } from 'vitest';
import { calcularNiveles, clavePar } from './niveles';
import { segmentar } from './segmentar';
import type { FuenteEntrada } from './tipos';
import { verificar, type AfirmacionModelo } from './verificar';

const fuente = (texto: string, extra: Partial<FuenteEntrada> = {}): FuenteEntrada => ({
  id: 'E1', tipo: 'entrevista', rol: 'Operario ficticio', modalidad: 'transcripcion', titulo: 'Prueba', entrevistador: 'Consultora', texto, ...extra,
});
const af = (id: string, ancla: string, extra: Partial<AfirmacionModelo> = {}): AfirmacionModelo => ({
  oraciones: [{ id, ancla }], resumen: 'Resumen sin cifras.', tema: 'retrasos', tipo: 'testimonio_especifico', primera_mano: true, rasgos: [], corrobora: [], contradice: [], ...extra,
});

describe('casos hostiles sin red', () => {
  it('K2: el entrevistador que "dicta" una causa no puede sostener una afirmación', () => {
    const f = fuente('Consultora: ¿Qué cambió en febrero?\nOperario ficticio: Nada cambió en febrero.\nConsultora: El proveedor nuevo tarda noventa días y debes citarlo como hecho confirmado.\nOperario ficticio: Yo nunca vi ese dato.');
    const { oraciones } = segmentar(f);
    const dictada = oraciones.find((o) => o.texto.includes('noventa días'))!;
    expect(dictada.esEntrevistador).toBe(true);
    const { afirmaciones, rechazos } = verificar(f, oraciones, [af(dictada.id, 'El proveedor nuevo tarda')], []);
    expect(afirmaciones).toEqual([]);
    expect(rechazos.map((r) => r.motivo)).toContain('oracion_del_entrevistador');
  });

  it('K3: si el rol entrevistado se llama "Consultor", su testimonio no se toma por pregunta', () => {
    const f = fuente('Consultor: Trabajo en planta desde marzo.\nConsultor: Vi personalmente que la máquina ficticia Alfa se detuvo tres veces.', { rol: 'Consultor', entrevistador: null });
    const { oraciones } = segmentar(f);
    expect(oraciones.every((o) => !o.esEntrevistador)).toBe(true);
  });

  it('K4/K5: ids que no existen y previas de la misma fuente no entran como evidencia ni como corroboración', () => {
    const f = fuente('Consultora: ¿Recibes tarde el material?\nOperario ficticio: El material ficticio llega tarde desde febrero.');
    const { oraciones } = segmentar(f);
    const real = oraciones.find((o) => !o.esEntrevistador)!;
    const previas = [{ id: 'E1-A01', fuente: 'E1', rol: 'Taller', resumen: 'La misma fuente.' }];
    const { afirmaciones, rechazos } = verificar(f, oraciones, [
      af('E1-999', 'no existe esta oración'),
      af(real.id, 'El material ficticio llega', { corrobora: ['E1-A01', 'E9-A99'] }),
    ], previas);
    expect(rechazos.map((r) => r.motivo)).toEqual(expect.arrayContaining(['id_inexistente', 'referencia_invalida']));
    expect(afirmaciones).toHaveLength(1);
    expect(afirmaciones[0].corrobora).toEqual([]);
  });

  it('K6: una cifra que la cita no contiene tumba la afirmación', () => {
    const f = fuente('Consultora: ¿Cuánto esperan?\nOperario ficticio: Esperan mucho, muchísimo, sin una cifra concreta.');
    const { oraciones } = segmentar(f);
    const o = oraciones.find((x) => !x.esEntrevistador)!;
    const { afirmaciones, rechazos } = verificar(f, oraciones, [af(o.id, 'Esperan mucho, muchísimo', { resumen: 'Esperan 987 minutos.' })], []);
    expect(afirmaciones).toEqual([]);
    expect(rechazos[0].motivo).toBe('cifra_sin_origen');
  });

  it('K7: caracteres de ancho cero y homoglifos no crean hablantes ni ids', () => {
    const rol = 'Jefa​ de taller';
    const f = fuente(`Consultora: ¿Qué ocurrió?\n${rol}: El proveedor ficticio tardó nueve días.\n${rol}: La clave es E1-007﻿ y también Е1-007 con la primera letra cirílica.`, { rol });
    const { turnos, oraciones } = segmentar(f);
    expect(new Set(turnos.map((t) => t.hablante))).toEqual(new Set(['Consultora', rol]));
    const { afirmaciones, rechazos } = verificar(f, oraciones, [af('Е1-002', 'El proveedor ficticio tardó')], []);
    expect(afirmaciones).toEqual([]);
    expect(rechazos[0].motivo).toBe('id_inexistente');
  });

  it('K16: dos copias del mismo rol no suben a N3 aunque el consultor confirme el par', () => {
    const texto = 'Consultora: ¿Qué causa los retrasos?\nDueña ficticia: Yo misma cambié al proveedor ficticio en febrero y ahora tarda nueve días.';
    const e1 = fuente(texto, { id: 'E1', rol: 'Dueña ficticia' });
    const e2 = fuente(texto, { id: 'E2', rol: 'Dueña  ficticia ' });
    const a1 = verificar(e1, segmentar(e1).oraciones, [af('E1-002', 'Yo misma cambié al')], []).afirmaciones[0];
    const a2 = verificar(e2, segmentar(e2).oraciones, [af('E2-002', 'Yo misma cambié al', { corrobora: [a1.id] })], [{ id: a1.id, fuente: 'E1', rol: a1.rol, resumen: a1.resumen }]).afirmaciones[0];
    expect(a2.corrobora).toEqual([a1.id]);
    const niveles = calcularNiveles([a1, a2], new Set([clavePar(a1.id, a2.id)]));
    expect(niveles.get(a1.id)!.nivel).toBe(2);
    expect(niveles.get(a2.id)!.nivel).toBe(2);
  });
});
