import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dataBr, dataHoje, inputDate, numeroSeguro } from "./format";

describe("dataHoje", () => {
  afterEach(() => vi.useRealTimers());

  it("usa o dia do Brasil, não o de UTC, perto da meia-noite", () => {
    // 06/09 02:30 UTC = 05/09 23:30 em São Paulo
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T02:30:00Z"));
    expect(dataHoje()).toBe("2026-09-05");
  });

  it("soma dias mantendo o fuso do Brasil", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T02:30:00Z"));
    expect(dataHoje(30)).toBe("2026-10-05");
  });
});

describe("dataBr", () => {
  it("não desloca coluna DATE para o dia anterior", () => {
    // Era o bug: new Date("2026-09-06") vira meia-noite UTC = dia 05 no Brasil
    expect(dataBr("2026-09-06")).toBe("06/09/2026");
  });

  it("formata DATETIME no fuso de São Paulo", () => {
    expect(dataBr("2026-09-06T02:30:00Z")).toBe("05/09/2026");
  });

  it("devolve travessão para valor ausente ou inválido", () => {
    expect(dataBr(null)).toBe("—");
    expect(dataBr("banana")).toBe("—");
  });
});

describe("inputDate", () => {
  it("repassa YYYY-MM-DD sem converter", () => {
    expect(inputDate("2026-09-06")).toBe("2026-09-06");
  });

  it("converte DATETIME para a data local do Brasil", () => {
    expect(inputDate("2026-09-06T02:30:00Z")).toBe("2026-09-05");
  });

  it("devolve string vazia para valor ausente", () => {
    expect(inputDate(null)).toBe("");
    expect(inputDate("banana")).toBe("");
  });
});

describe("numeroSeguro", () => {
  it("aceita vírgula, que é como o brasileiro digita", () => {
    expect(numeroSeguro("1,5")).toBe(1.5);
    expect(numeroSeguro("1.5")).toBe(1.5);
  });

  it("campo vazio vira 0 em vez de NaN", () => {
    expect(numeroSeguro("")).toBe(0);
    expect(numeroSeguro(null)).toBe(0);
  });

  it("texto inválido nunca vira NaN", () => {
    expect(numeroSeguro("abc")).toBe(0);
    expect(numeroSeguro(NaN)).toBe(0);
  });

  it("respeita o mínimo (bloqueia negativo em preço e quantidade)", () => {
    expect(numeroSeguro("-5", 0)).toBe(0);
    expect(numeroSeguro("-5")).toBe(-5);
    expect(numeroSeguro("", 1)).toBe(1);
  });
});
