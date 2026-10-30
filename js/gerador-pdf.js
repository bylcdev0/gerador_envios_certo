/* =========================================================
   js/gerador-pdf.js
   Geração VETORIAL dos documentos em PDF (texto editável),
   usando jsPDF (cópia local em vendor/).
   Layout em mm, A4 retrato, fiéis às imagens de referência.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Dados fixos do remetente ---------- */
  const REMETENTE = (function () {
    const padrao = {
      nome: "RRPM CURSOS PREPARATORIOS LTDA",
      nomeFormatado: "RRPM CURSOS PREPARATÓRIOS LTDA",
      endereco: "Avenida Raja Gabaglia, 2720",
      enderecoDecl: "AV RAJA GABAGLIA 2720 ESTORIL",
      bairro: "Estoril",
      cidade: "Belo Horizonte",
      uf: "MG",
      cep: "30494-170",
      cepDecl: "30494170",
      cnpj: "03.515.918/0004-04",
    };
    const m = window.DocumentoModelos;
    // completa campos ausentes, se a origem for o módulo dos modelos
    return Object.assign({}, padrao, (m && m.REMETENTE) || {});
  })();

  const URL_CORREIOS =
    "https://www.correios.com.br/enviar/proibicoes-e-restricoes/proibicoes-e-restricoes";

  const TX_DECLARACAO_1 =
    "Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e a quem de direito, por informações inverídicas.";

  const TX_DECLARACAO_2 =
    "Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador de combustão espontânea, tóxico, corrosivo, gás ou qualquer outro conteúdo que conste na lista de proibições e restrições disponível no site dos Correios:";

  const TX_OBSERVACAO =
    "Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição social e qualquer acessório (Lei 8.137/90 Art. 1º, V).";

  /* ---------- Constantes de traço ---------- */
  const GROSSO = 0.65, MEDIO = 0.33, FINO = 0.22;
  const CINZA = [203, 203, 203];
  const AZUL_LINK = [17, 85, 204];
  const PRETO = [0, 0, 0];

  /* =========================================================
     Utilitários de desenho
     ========================================================= */
  function larguraTexto(pdf, texto) {
    return pdf.getTextWidth(String(texto));
  }

  /** Texto que reduz levemente de corpo até caber no espaço disponível. */
  function textoAjustado(pdf, texto, x, y, larguraMax, alinhamento) {
    const tamanhoOriginal = pdf.getFontSize();
    let tamanho = tamanhoOriginal;
    pdf.setFontSize(tamanho);
    while (larguraTexto(pdf, texto) > larguraMax && tamanho > 4.5) {
      tamanho -= 0.25;
      pdf.setFontSize(tamanho);
    }
    if (larguraTexto(pdf, texto) > larguraMax) {
      while (String(texto).length > 1 && larguraTexto(pdf, texto + "…") > larguraMax) {
        texto = String(texto).slice(0, -1);
      }
      texto += "…";
    }
    const alinh = alinhamento || "left";
    if (alinh === "center") {
      pdf.text(texto, x + larguraMax / 2, y, { align: "center" });
    } else if (alinh === "right") {
      pdf.text(texto, x + larguraMax, y, { align: "right" });
    } else {
      pdf.text(texto, x, y);
    }
    pdf.setFontSize(tamanhoOriginal);
  }

  /**
   * Parágrafo com quebra automática e justificação (última linha à esquerda).
   * segmentos: [{ texto, cor?, sublinhado? }]
   * Retorna a baseline da linha seguinte.
   */
  function paragrafo(pdf, segmentos, x, yBase, largura, opts) {
    const conf = opts || {};
    const corpo = conf.fontSize || 7.5;
    const entrelinha = conf.lineHeight || 2.85;

    pdf.setFont("helvetica", conf.style || "normal");
    pdf.setFontSize(corpo);
    pdf.setTextColor(PRETO[0], PRETO[1], PRETO[2]);

    // monta tokens medíveis
    const tokens = [];
    (Array.isArray(segmentos) ? segmentos : [segmentos]).forEach((seg, si) => {
      const ehTexto = typeof seg === "string";
      const partes = (ehTexto ? seg : seg.texto).split(/\s+/).filter(Boolean);
      partes.forEach((p, pi) => {
        tokens.push({
          texto: p,
          cor: ehTexto ? null : seg.cor || null,
          sub: ehTexto ? false : !!seg.sublinhado,
          separadorNaFrente: pi > 0 || si > 0,
        });
      });
    });

    // quebra de linhas
    const linhas = [];
    let linha = [];
    let larguraComEspacos = 0;
    tokens.forEach((tok) => {
      pdf.setFont("helvetica", conf.style || "normal");
      pdf.setFontSize(corpo);
      const wt = larguraTexto(pdf, tok.texto);
      const larguraTeste = larguraComEspacos + (linha.length ? larguraTexto(pdf, " ") : 0) + wt;
      if (linha.length && larguraTeste > largura) {
        linhas.push({ tokens: linha, largura: larguraComEspacos });
        linha = [tok];
        larguraComEspacos = wt;
      } else {
        linha.push(tok);
        larguraComEspacos = larguraTeste;
      }
    });
    if (linha.length) linhas.push({ tokens: linha, largura: larguraComEspacos });

    let y = yBase;
    linhas.forEach((l, idx) => {
      const ehUltima = idx === linhas.length - 1;
      let xCursor = x;
      if (!ehUltima) {
        const espacos = l.tokens.length - 1;
        const extra = espacos > 0 ? (largura - l.largura) / espacos : 0;
        l.tokens.forEach((tok, ti) => {
          pdf.setFont("helvetica", conf.style || "normal");
          pdf.setFontSize(corpo);
          const wp = larguraTexto(pdf, tok.texto);
          if (tok.cor) pdf.setTextColor(tok.cor[0], tok.cor[1], tok.cor[2]);
          pdf.text(tok.texto, xCursor, y);
          if (tok.sub) {
            pdf.setLineWidth(0.15);
            pdf.setDrawColor(tok.cor ? tok.cor[0] : 0, tok.cor ? tok.cor[1] : 0, tok.cor ? tok.cor[2] : 0);
            pdf.line(xCursor, y + 0.5, xCursor + wp, y + 0.5);
          }
          if (tok.cor) pdf.setTextColor(0, 0, 0);
          xCursor += wp + (ti < l.tokens.length - 1 ? larguraTexto(pdf, " ") + extra : 0);
        });
        y += entrelinha;
      } else {
        // última linha: espaçamento normal
        l.tokens.forEach((tok, ti) => {
          pdf.setFont("helvetica", conf.style || "normal");
          pdf.setFontSize(corpo);
          const wp = larguraTexto(pdf, tok.texto);
          if (tok.cor) pdf.setTextColor(tok.cor[0], tok.cor[1], tok.cor[2]);
          pdf.text(tok.texto, xCursor, y);
          if (tok.sub) {
            pdf.setLineWidth(0.15);
            pdf.setDrawColor(tok.cor ? tok.cor[0] : 0, tok.cor ? tok.cor[1] : 0, tok.cor ? tok.cor[2] : 0);
            pdf.line(xCursor, y + 0.5, xCursor + wp, y + 0.5);
          }
          if (tok.cor) pdf.setTextColor(0, 0, 0);
          if (ti < l.tokens.length - 1) xCursor += wp + larguraTexto(pdf, " ");
        });
        y += entrelinha;
      }
    });
    return y;
  }

  /* =========================================================
     BLOCOS — DECLARAÇÃO DE CONTEÚDO (uma "via")
     Recria fielmente o modelo padrão da empresa.
     ========================================================= */
  function mudarFonte(pdf, corpo, peso) {
    pdf.setFont("helvetica", peso || "normal");
    pdf.setFontSize(corpo);
  }

  function bloqueioPessoa(pdf, x, y, w, titulo, dados) {
    const hCab = 5.6;
    const hLinha = 4.9;
    const hTotal = hCab + hLinha * 5;

    // retângulo externo
    pdf.setLineWidth(GROSSO);
    pdf.setDrawColor(PRETO[0], PRETO[1], PRETO[2]);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, hTotal, "FD");

    // título do bloco (com espaçamento, como no modelo)
    mudarFonte(pdf, 8.6, "bold");
    pdf.text(String(titulo).split("").join("  "), x + w / 2, y + 3.9, { align: "center" });

    // separador do cabeçalho
    pdf.setLineWidth(MEDIO);
    pdf.line(x, y + hCab, x + w, y + hCab);

    let yLinha = y + hCab;
    const desenhaLinhaSimples = (rotulo, valor, bordaBaixo) => {
      mudarFonte(pdf, 7, "bold");
      textoAjustado(pdf, rotulo + String(valor == null ? "" : valor), x + 1.6, yLinha + hLinha - 1.55, w - 3.2, "left");
      pdf.setLineWidth(FINO);
      if (bordaBaixo) pdf.line(x, yLinha + hLinha, x + w, yLinha + hLinha);
      yLinha += hLinha;
    };

    desenhaLinhaSimples("NOME: ", dados.nome, true);
    desenhaLinhaSimples("ENDEREÇO: ", dados.endereco, true);
    desenhaLinhaSimples(dados.bairroVisivel ? "BAIRRO: " : "", dados.bairroVisivel ? dados.bairro : "", true);

    // linha CIDADE | UF
    const wCidade = w - 27;
    mudarFonte(pdf, 7, "bold");
    textoAjustado(pdf, "CIDADE: " + dados.cidade, x + 1.6, yLinha + hLinha - 1.55, wCidade - 3.2, "left");
    textoAjustado(pdf, "UF: " + dados.uf, x + wCidade + 1.6, yLinha + hLinha - 1.55, 27 - 3.2, "left");
    pdf.setLineWidth(FINO);
    pdf.line(x + wCidade, yLinha, x + wCidade, yLinha + hLinha);
    pdf.line(x, yLinha + hLinha, x + w, yLinha + hLinha);
    yLinha += hLinha;

    // linha CEP | CPF/CNPJ/DOC.ESTRANGEIRO
    const wCep = 31;
    mudarFonte(pdf, 7, "bold");
    textoAjustado(pdf, "CEP: " + dados.cep, x + 1.6, yLinha + hLinha - 1.55, wCep - 3.2, "left");
    textoAjustado(pdf, "CPF/CNPJ/DOC.ESTRANGEIRO: " + (dados.documento || ""), x + wCep + 1.6, yLinha + hLinha - 1.55, w - wCep - 3.2, "left");
    pdf.setLineWidth(FINO);
    pdf.line(x + wCep, yLinha, x + wCep, yLinha + hLinha);

    return hTotal;
  }

  function blocoBens(pdf, x, y, w, envio) {
    const esp = envio.equipamentos;
    const t = Calculos.calcularTotaisEExtentos(esp);
    const hTitulo = 6;
    const hCabCol = 4.8;
    const hLinha = 4.6;
    const colunas = [
      x,                    // ITEM
      x + 19.8,             // CONTEÚDO
      x + 134.6,            // QUANT.
      x + 168.3,            // VALOR
      x + w,                // fim
    ];
    const hTotal = hTitulo + hCabCol + hLinha * 4 + hLinha * 2;

    pdf.setLineWidth(GROSSO);
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, hTotal, "FD");

    // título com espaçamento
    mudarFonte(pdf, 8.6, "bold");
    const tituloEspacado = "I D E N T I F I C A Ç Ã O   D O S   B E N S";
    pdf.text(tituloEspacado, x + w / 2, y + 4.1, { align: "center" });
    pdf.setLineWidth(MEDIO);
    pdf.line(x, y + hTitulo, x + w, y + hTitulo);

    // cabeçalho das colunas
    const yCabTexto = y + hTitulo + hCabCol - 1.5;
    mudarFonte(pdf, 7.5, "bold");
    pdf.text("ITEM", (colunas[0] + colunas[1]) / 2, yCabTexto, { align: "center" });
    pdf.text("CONTEÚDO", (colunas[1] + colunas[3]) / 2, yCabTexto, { align: "center" });
    pdf.text("QUANT.", (colunas[2] + colunas[3]) / 2, yCabTexto, { align: "center" });
    pdf.text("VALOR", (colunas[3] + colunas[4]) / 2, yCabTexto, { align: "center" });
    pdf.setLineWidth(FINO);
    pdf.line(x, y + hTitulo + hCabCol, x + w, y + hTitulo + hCabCol);
    // separadores verticais do cabeçalho
    pdf.line(colunas[1], y + hTitulo, colunas[1], y + hTitulo + hCabCol);
    pdf.line(colunas[2], y + hTitulo, colunas[2], y + hTitulo + hCabCol);
    pdf.line(colunas[3], y + hTitulo, colunas[3], y + hTitulo + hCabCol);

    // zerar separadores verticais nas células conforme o modelo (full-height entre header e totais)
    let yTopoLinhas = y + hTitulo + hCabCol;

    // linhas de conteúdo (4)
    let yCursor = yTopoLinhas;
    for (let i = 0; i < 4; i++) {
      const item = esp[i];
      const yTexto = yCursor + hLinha - 1.45;
      mudarFonte(pdf, 7.5, "normal");
      if (item) {
        pdf.text(String(i + 1), (colunas[0] + colunas[1]) / 2, yTexto, { align: "center" });
        textoAjustado(pdf, item.descricao, colunas[1] + 1.6, yTexto, colunas[2] - colunas[1] - 3.2, "left");
        pdf.text(String(item.quantidade), (colunas[2] + colunas[3]) / 2, yTexto, { align: "center" });
        mudarFonte(pdf, 7.5, "normal");
        pdf.text(Calculos.formatarMoeda(Calculos.valorTotalItemCents(item)), (colunas[3] + colunas[4]) / 2, yTexto, { align: "center" });
      }
      pdf.setLineWidth(FINO);
      pdf.line(x, yCursor + hLinha, x + w, yCursor + hLinha);
      yCursor += hLinha;
    }

    // TOTAIS (rótulo cinza sobre ITEM+CONTEÚDO)
    pdf.setFillColor(CINZA[0], CINZA[1], CINZA[2]);
    pdf.rect(x, yCursor, colunas[2] - x, hLinha, "F");
    mudarFonte(pdf, 7, "bold");
    pdf.text("TOTAIS", colunas[2] - 1.6, yCursor + hLinha - 1.45, { align: "right" });
    mudarFonte(pdf, 7.5, "bold");
    pdf.text(String(t.quantidadeTotal), (colunas[2] + colunas[3]) / 2, yCursor + hLinha - 1.45, { align: "center" });
    pdf.text(t.valorTotalFormatado, (colunas[3] + colunas[4]) / 2, yCursor + hLinha - 1.45, { align: "center" });
    pdf.setLineWidth(FINO);
    pdf.line(x, yCursor + hLinha, x + w, yCursor + hLinha);
    yCursor += hLinha;

    // PESO TOTAL (kg)
    pdf.setFillColor(CINZA[0], CINZA[1], CINZA[2]);
    pdf.rect(x, yCursor, colunas[2] - x, hLinha, "F");
    mudarFonte(pdf, 7, "bold");
    pdf.text("PESO TOTAL (kg)", colunas[2] - 1.6, yCursor + hLinha - 1.45, { align: "right" });
    mudarFonte(pdf, 7.5, "bold");
    pdf.text(t.pesoTotalFormatado, (colunas[2] + colunas[4]) / 2, yCursor + hLinha - 1.45, { align: "center" });
    yCursor += hLinha;

    // separadores verticais completos (do fim do título até o fim da tabela)
    pdf.setLineWidth(FINO);
    pdf.line(colunas[1], yTopoLinhas, colunas[1], yCursor);
    pdf.line(colunas[2], yTopoLinhas, colunas[2], yCursor);
    pdf.line(colunas[3], yTopoLinhas, colunas[3], yCursor);

    return hTotal;
  }

  function blocoDeclaracao(pdf, x, y, w) {
    const hTitulo = 5.8;
    const hTotal = 44.6;

    pdf.setLineWidth(GROSSO);
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, hTotal, "FD");

    mudarFonte(pdf, 8.6, "bold");
    pdf.text("D E C L A R A Ç Ã O", x + w / 2, y + 4.1, { align: "center" });
    pdf.setLineWidth(FINO);
    pdf.line(x, y + hTitulo, x + w, y + hTitulo);

    const yBase1 = y + hTitulo + 3.5;
    const fimP1 = paragrafo(pdf, TX_DECLARACAO_1, x + 2.4, yBase1, w - 5, { fontSize: 7.5, lineHeight: 2.85 });

    // p2 normal + link em azul sublinhado
    paragrafo(
      pdf,
      [
        { texto: TX_DECLARACAO_2 },
        { texto: URL_CORREIOS, cor: AZUL_LINK, sublinhado: true },
        { texto: "." },
      ],
      x + 2.4,
      fimP1 + 1.6,
      w - 5,
      { fontSize: 7.5, lineHeight: 2.85 }
    );

    // linha de local/data e assinatura
    const lacTopo = y + hTotal - 10.5;
    mudarFonte(pdf, 7.5, "normal");
    const yData = lacTopo + 2.6;
    let xd = x + 1.6;
    pdf.line(xd, yData + 0.9, xd + 13, yData + 0.9); // tracinho sob BH
    pdf.text("BH", xd + 6.5, yData + 0.2, { align: "center" });
    xd += 13 + 1.6;
    pdf.text(",", xd, yData);
    xd += 3.4;
    // dia
    const data = Calculos.dataExtenso().split(" de ");
    const lacuna = (larg, textoLac, pula) => {
      pdf.line(xd, yData + 0.9, xd + larg, yData + 0.9);
      if (textoLac) pdf.text(textoLac, xd + larg / 2, yData, { align: "center" });
      xd += larg + (pula || 2);
    };
    lacuna(9, data[0]);
    pdf.text("de", xd, yData); xd += larguraTexto(pdf, "de") + 2;
    lacuna(40, data[1]);
    pdf.text("de", xd, yData); xd += larguraTexto(pdf, "de") + 2;
    lacuna(15, data[2]);

    // espaço de assinatura (em branco) à direita
    const largAssin = 62;
    const xAssin = x + w - largAssin - 4;
    pdf.setLineWidth(FINO);
    pdf.line(xAssin, lacTopo + 3.1, x + w - 4, lacTopo + 3.1);
    mudarFonte(pdf, 6.5, "normal");
    pdf.text("Assinatura do Declarante/Remetente", x + w - 4, lacTopo + 7.4, { align: "right" });

    return hTotal;
  }

  function blocoObservacao(pdf, x, y, w) {
    const hTotal = 10.4;
    pdf.setLineWidth(GROSSO);
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x, y, w, hTotal, "FD");
    mudarFonte(pdf, 7.5, "bold");
    pdf.text("OBSERVAÇÃO:", x + 2, y + 4.1);
    mudarFonte(pdf, 7, "normal");
    pdf.text(TX_OBSERVACAO, x + 2, y + 8.2);
    return hTotal;
  }

  function viaDeclaracao(pdf, envio, yTop) {
    const xL = 6;
    const W = 198;
    const d = envio.destinatario;

    // Título principal
    pdf.setLineWidth(GROSSO);
    pdf.setDrawColor(0, 0, 0);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(xL, yTop, W, 9, "FD");
    mudarFonte(pdf, 14, "bold");
    pdf.text("DECLARAÇÃO DE CONTEÚDO", xL + W / 2, yTop + 6.3, { align: "center" });

    // Pessoas
    const gap = 5;
    const wPessoa = (W - gap) / 2;
    const yPessoas = yTop + 11;
    const dadosRemetente = {
      nome: REMETENTE.nome,
      endereco: REMETENTE.enderecoDecl,
      bairroVisivel: false,
      cidade: REMETENTE.cidade.toUpperCase(),
      uf: REMETENTE.uf,
      cep: REMETENTE.cepDecl,
      documento: "",
    };
    const dadosDestinatario = {
      nome: d.nome,
      endereco: d.endereco,
      bairroVisivel: true,
      bairro: d.bairro,
      cidade: d.cidade,
      uf: d.uf,
      cep: String(d.cep || "").replace(/\D/g, ""),
      documento: d.documento || "",
    };
    const hP1 = bloqueioPessoa(pdf, xL, yPessoas, wPessoa, "REMETENTE", dadosRemetente);
    bloqueioPessoa(pdf, xL + wPessoa + gap, yPessoas, wPessoa, "DESTINATÁRIO", dadosDestinatario);

    // Identificação dos bens
    const yBens = yPessoas + hP1 + 2;
    const hBens = blocoBens(pdf, xL, yBens, W, envio);

    // Declaração
    const yDecl = yBens + hBens + 2;
    const hDecl = blocoDeclaracao(pdf, xL, yDecl, W);

    // Observação
    const yObs = yDecl + hDecl + 2;
    blocoObservacao(pdf, xL, yObs, W);
  }

  /* =========================================================
     DOCUMENTO 1 — Declaração de Conteúdo (duas vias por página)
     ========================================================= */
  function gerarDeclaracao(envio) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    viaDeclaracao(pdf, envio, 5);
    viaDeclaracao(pdf, envio, 154);
    return pdf;
  }

  /* =========================================================
     DOCUMENTO 2 — Remetente dos Correios
     ========================================================= */
  function gerarRemetente(envio) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const d = envio.destinatario;
    const x = 15.5;
    const entrelinha = 14.1;

    pdf.setDrawColor(0, 0, 0);
    pdf.setTextColor(0, 0, 0);

    let y = 28; // baseline do primeiro título
    mudarFonte(pdf, 20.5, "bold");
    pdf.text("REMETENTE:", x, y);
    y += entrelinha;
    mudarFonte(pdf, 19.5, "normal");
    const linhasRemet = [
      REMETENTE.nomeFormatado,
      "ENDEREÇO: AVENIDA RAJA GABAGLIA, Nº 2720",
      "BAIRRO: " + REMETENTE.bairro.toUpperCase(),
      "CIDADE: " + REMETENTE.cidade.toUpperCase() + "-" + REMETENTE.uf,
      "CEP: " + REMETENTE.cep,
      "CNPJ: " + REMETENTE.cnpj,
    ];
    linhasRemet.forEach((l) => {
      pdf.text(l, x, y);
      y += entrelinha;
    });

    y += 7.5; // respiro entre blocos
    mudarFonte(pdf, 20.5, "bold");
    pdf.text("DESTINATÁRIO:", x, y);
    y += entrelinha;
    mudarFonte(pdf, 19.5, "normal");
    [
      d.nome,
      "ENDEREÇO: " + d.endereco,
      "BAIRRO: " + d.bairro,
      "CIDADE: " + d.cidade + "-" + d.uf,
      "CEP: " + d.cep,
    ].forEach((l) => {
      textoAjustado(pdf, l, x, y, 179, "left");
      y += entrelinha;
    });
    return pdf;
  }

  /* =========================================================
     API principal
     ========================================================= */
  async function gerarDocumentosPDF(envio, opcoes) {
    if (typeof window.jspdf === "undefined") {
      throw new Error("Biblioteca jsPDF não encontrada em vendor/. Verifique o arquivo jspdf.umd.min.js.");
    }
    const op = opcoes || {};
    const pdfDecl = gerarDeclaracao(envio);
    if (op.aoCapturar) op.aoCapturar(1);
    const pdfRem = gerarRemetente(envio);
    if (op.aoCapturar) op.aoCapturar(2);

    const blobDecl = pdfDecl.output("blob");
    const blobRem = pdfRem.output("blob");

    return {
      declaracao: {
        blob: blobDecl,
        bytes: blobDecl.size,
        paginas: pdfDecl.getNumberOfPages(),
        nomeArquivo: "Declaracao_de_Conteudo.pdf",
      },
      remetente: {
        blob: blobRem,
        bytes: blobRem.size,
        paginas: pdfRem.getNumberOfPages(),
        nomeArquivo: "Remetente_Correios.pdf",
      },
    };
  }

  function baixarBlob(blob, nomeArquivo) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function baixarZip(documentos) {
    if (typeof JSZip !== "function") {
      throw new Error("Biblioteca JSZip não encontrada em vendor/.");
    }
    const zip = new JSZip();
    zip.file(documentos.declaracao.nomeArquivo, documentos.declaracao.blob);
    zip.file(documentos.remetente.nomeArquivo, documentos.remetente.blob);
    const blobZip = await zip.generateAsync({ type: "blob" });
    baixarBlob(blobZip, "documentos_envio.zip");
  }

  window.GeradorPDF = { gerarDocumentosPDF, baixarBlob, baixarZip };
})();
