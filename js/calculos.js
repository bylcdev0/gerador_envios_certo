/* =========================================================
   js/calculos.js
   Regras de cálculo e formatação do Gerador de Envios.
   Biblioteca global (window.Calculos) — sem dependências.
   ========================================================= */
(function () {
  "use strict";

  const MAX_ITENS = 4; // A Declaração de Conteúdo comporta no máximo 4 tipos de equipamento

  let contadorId = 1;
  function proximoId() {
    return contadorId++;
  }

  /**
   * Converte texto digitado (ex.: "5.200,00", "5200,50", "2,5") em centavos (int).
   * Convenção: vírgula é separador decimal; ponto pode ser milhar ou decimal,
   * conforme o padrão reconhecido.
   */
  function parseParaCentavos(texto) {
    if (typeof texto === "number") {
      texto = String(texto);
    }
    if (typeof texto !== "string") {
      return null;
    }
    const limpo = texto.trim().replace(/[R$\s]/gi, "");
    if (limpo === "" || !/^[\d.,]+$/.test(limpo)) {
      return null; // não numérico
    }
    let norm = limpo;
    if (limpo.includes(",") && limpo.includes(".")) {
      norm = limpo.replace(/\./g, "").replace(",", ".");
    } else if (limpo.includes(",") && !limpo.includes(".")) {
      norm = limpo.replace(/\./g, "").replace(",", ".");
    } else if (limpo.includes(".")) {
      // somente ponto: milhar se grupos de 3 (ex.: 5.200 ou 1.234.567), decimal caso contrário
      if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
        norm = limpo.replace(/\./g, "");
      }
    }
    const numero = Number(norm);
    if (!isFinite(numero)) {
      return null;
    }
    // Evita erros de arredondamento de ponto flutuante: arredonda a centavos
    return Math.round(numero * 100);
  }

  /** Converte texto de peso (kg, ex.: "2,5") em gramas (int). */
  function parseParaGramas(texto) {
    if (typeof texto === "number") texto = String(texto);
    if (typeof texto !== "string") return null;
    let limpo = texto.trim().replace(/[kKgG\s]/g, "");
    if (limpo === "" || !/^[\d.,]+$/.test(limpo)) return null;
    limpo = limpo.replace(/,/g, ".");
    const numero = Number(limpo);
    if (!isFinite(numero) || numero < 0) return null;
    return Math.round(numero * 1000);
  }

  function formatarMoeda(centavos) {
    const valor = (centavos || 0) / 100;
    return "R$ " + valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function formatarPeso(gramas) {
    const kg = (gramas || 0) / 1000;
    return kg.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 3,
    }) + " kg";
  }

  /** Valor total do item = quantidade x valor unitário (em centavos, exato). */
  function valorTotalItemCents(item) {
    const q = Math.max(0, Math.round(item.quantidade || 0));
    return q * (item.valorUnitarioCentavos || 0);
  }

  /** Peso total do item = quantidade x peso unitário (em gramas). */
  function pesoTotalItemGramas(item) {
    const q = Math.max(0, Math.round(item.quantidade || 0));
    return q * (item.pesoUnitarioGramas || 0);
  }

  /** Soma das quantidades de todos os itens. */
  function quantidadeTotal(equipamentos) {
    return (equipamentos || []).reduce((acc, it) => acc + Math.max(0, Math.round(it.quantidade || 0)), 0);
  }

  /** Valor total do envio em centavos. */
  function valorTotalCents(equipamentos) {
    return (equipamentos || []).reduce((acc, it) => acc + valorTotalItemCents(it), 0);
  }

  /** Peso total do envio em gramas. */
  function pesoTotalGramas(equipamentos) {
    return (equipamentos || []).reduce((acc, it) => acc + pesoTotalItemGramas(it), 0);
  }

  /** Mês em português, maiúsculo, ex.: "OUTUBRO". */
  const MESES_PT = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
  ];

  /**
   * Data de emissão no formato "24 de OUTUBRO de 2026".
   * dataBase: Date opcional (padrão: agora).
   */
  function dataExtenso(dataBase) {
    const d = dataBase || new Date();
    return String(d.getDate()) + " de " + MESES_PT[d.getMonth()] + " de " + String(d.getFullYear());
  }

  function calcularTotaisEExtentos(equipamentos) {
    return {
      quantidadeTotal: quantidadeTotal(equipamentos),
      valorTotalCentavos: valorTotalCents(equipamentos),
      valorTotalFormatado: formatarMoeda(valorTotalCents(equipamentos)),
      pesoTotalGramas: pesoTotalGramas(equipamentos),
      pesoTotalFormatado: formatarPeso(pesoTotalGramas(equipamentos)),
    };
  }

  window.Calculos = {
    MAX_ITENS,
    proximoId,
    parseParaCentavos,
    parseParaGramas,
    formatarMoeda,
    formatarPeso,
    valorTotalItemCents,
    pesoTotalItemGramas,
    quantidadeTotal,
    valorTotalCents,
    pesoTotalGramas,
    dataExtenso,
    calcularTotaisEExtentos,
  };
})();
