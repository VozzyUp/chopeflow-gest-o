import { defineConfig } from "vitest/config";

// Config própria: a do app monta o pipeline inteiro do TanStack Start,
// que os testes de unidade não precisam.
//
// O fuso é fixado em São Paulo de propósito: os bugs de data que estes testes
// cobrem só aparecem em fuso negativo. Rodando em UTC (o padrão de CI) eles
// passariam mesmo com o código quebrado.
process.env["TZ"] = "America/Sao_Paulo";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
