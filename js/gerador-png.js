/* =========================================================
   js/gerador-png.js
   Modelos HTML dos dois documentos + geração de PNG (html2canvas,
   carregado localmente de vendor/) + ZIP (vendor/jszip).
   Os layouts reproduzem as imagens de referência da empresa.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Dados fixos do REMETENTE ---------- */
  const REMETENTE = {
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

  function esc(texto) {
    // Escapa caracteres especiais para uso seguro em HTML gerado dinamicamente
    return String(texto == null ? "" : texto)
      .split("&").join("&" + "amp;")
      .split("<").join("&" + "lt;")
      .split(">").join("&" + "gt;")
      .split('"').join("&" + "quot;");
  }

  /* =========================================================
     TEMPLATE 1 — DECLARAÇÃO DE CONTEÚDO (duas vias na página)
     ========================================================= */
  function blocoPessoa(titulo, dados) {
    const linhas = [];
    linhas.push(`<tr><th colspan="2">${titulo}</th></tr>`);
    linhas.push(`<tr><td colspan="2">NOME: ${esc(dados.nome)}</td></tr>`);
    linhas.push(`<tr><td colspan="2">ENDEREÇO: ${esc(dados.endereco)}</td></tr>`);
    linhas.push(`<tr><td colspan="2" class="${dados.bairroVisivel ? "" : "dec-linha-extra"}">${dados.bairroVisivel ? "BAIRRO: " + esc(dados.bairro) : ""}</td></tr>`);
    linhas.push(
      `<tr>
        <td class="dec-cel-cidade">CIDADE: ${esc(dados.cidade)}</td>
        <td class="dec-cel-uf">UF: ${esc(dados.uf)}</td>
      </tr>`
    );
    linhas.push(
      `<tr>
        <td class="dec-cel-cep">CEP: ${esc(dados.cep)}</td>
        <td class="dec-cel-docto">CPF/CNPJ/DOC.ESTRANGEIRO: ${esc(dados.documento)}</td>
      </tr>`
    );
    return `<div class="dec-pessoa"><table>${linhas.join("")}</table></div>`;
  }

  function linhasBens(equipamentos) {
    const totalLinhas = 4; // máximo de 4 tipos no modelo
    const celulas = [];
    for (let i = 0; i < totalLinhas; i++) {
      const it = equipamentos[i];
      if (it) {
        celulas.push(
          `<tr>
            <td class="dec-col-item">${i + 1}</td>
            <td class="dec-col-conteudo">${esc(it.descricao)}</td>
            <td class="dec-col-quant">${String(it.quantidade)}</td>
            <td class="dec-col-valor">${Calculos.formatarMoeda(Calculos.valorTotalItemCents(it))}</td>
          </tr>`
        );
      } else {
        celulas.push(`<tr><td></td><td></td><td></td><td></td></tr>`);
      }
    }
    return celulas.join("");
  }

  function viaDeclaracao(envio) {
    const d = envio.destinatario;
    const t = Calculos.calcularTotaisEExtentos(envio.equipamentos);
    const data = Calculos.dataExtenso().split(" de "); // [dia, MES, ano]

    const remetenteDoc = {
      nome: REMETENTE.nome,
      endereco: REMETENTE.enderecoDecl,
      bairro: "",
      bairroVisivel: false,
      cidade: REMETENTE.cidade.toUpperCase(),
      uf: REMETENTE.uf,
      cep: REMETENTE.cepDecl,
      documento: "",
    };

    const destinatarioDoc = {
      nome: d.nome,
      endereco: d.endereco,
      bairro: d.bairro,
      bairroVisivel: true,
      cidade: d.cidade,
      uf: d.uf,
      cep: String(d.cep || "").replace(/\D/g, ""), // CEP sem hífen, conforme o modelo
      documento: d.documento,
    };

    return `
      <div class="dec-via">
        <div class="dec-titulo">DECLARAÇÃO DE CONTEÚDO</div>
        <div class="dec-pessoas">
          ${blocoPessoa("REMETENTE", remetenteDoc)}
          ${blocoPessoa("DESTINATÁRIO", destinatarioDoc)}
        </div>
        <div class="dec-bens">
          <div class="dec-bens-title">IDENTIFICAÇÃO DOS BENS</div>
          <table>
            <thead>
              <tr>
                <th>ITEM</th>
                <th>CONTEÚDO</th>
                <th>QUANT.</th>
                <th>VALOR</th>
              </tr>
            </thead>
            <tbody>
              ${linhasBens(envio.equipamentos)}
              <tr class="dec-linha-totais">
                <td class="dec-totais-label" colspan="2">TOTAIS</td>
                <td class="dec-col-quant">${t.quantidadeTotal}</td>
                <td class="dec-col-valor">${t.valorTotalFormatado}</td>
              </tr>
              <tr class="dec-linha-peso">
                <td class="dec-totais-label sem-borda-baixo" colspan="2">PESO TOTAL (kg)</td>
                <td class="dec-col-valor sem-borda-baixo" colspan="2" style="border-right:none">${t.pesoTotalFormatado}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="dec-declaracao">
          <div class="dec-declaracao-title">DECLARAÇÃO</div>
          <p>Declaro que não me enquadro no conceito de contribuinte previsto no art. 4º da Lei Complementar nº 87/1996, uma vez que não realizo, com habitualidade ou em volume que caracterize intuito comercial, operações de circulação de mercadoria, ainda que se iniciem no exterior, ou estou dispensado da emissão da nota fiscal por força da legislação tributária vigente, responsabilizando-me, nos termos da lei e a quem de direito, por informações inverídicas.</p>
          <p>Declaro ainda que não estou postando conteúdo inflamável, explosivo, causador de combustão espontânea, tóxico, corrosivo, gás ou qualquer outro conteúdo que conste na lista de proibições e restrições disponível no site dos Correios: <a>https://www.correios.com.br/enviar/proibicoes-e-restricoes/proibicoes-e-restricoes</a>.</p>
          <div class="dec-data-assinatura">
            <div class="dec-data">
              <span class="dec-local">BH</span><span>,&nbsp;</span>
              <span class="dec-lacuna dec-lacuna-dia">${esc(data[0])}</span>
              <span>de</span>
              <span class="dec-lacuna dec-lacuna-mes">${esc(data[1])}</span>
              <span>de</span>
              <span class="dec-lacuna dec-lacuna-ano">${esc(data[2])}</span>
            </div>
            <div class="dec-assinatura">
              <div class="dec-linha-assinatura"></div>
              <div class="dec-legenda-assinatura">Assinatura do Declarante/Remetente</div>
            </div>
          </div>
        </div>
        <div class="dec-observacao">
          <div class="dec-observacao-label">OBSERVAÇÃO:</div>
          <p>Constitui crime contra a ordem tributária suprimir ou reduzir tributo, ou contribuição social e qualquer acessório (Lei 8.137/90 Art. 1º, V).</p>
        </div>
      </div>`;
  }

  function declaracaoConteudoHTML(envio) {
    // O modelo padrão tem DUAS vias idênticas por página
    return `<div class="doc-page doc-declaracao">${viaDeclaracao(envio)}${viaDeclaracao(envio)}</div>`;
  }

  /* =========================================================
     TEMPLATE 2 — REMETENTE DOS CORREIOS
     ========================================================= */
  function remetenteCorreiosHTML(envio) {
    const d = envio.destinatario;
    const r = REMETENTE;
    return `
      <div class="doc-page doc-remetente">
        <div class="remet-bloco">
          <div class="remet-titulo">REMETENTE:</div>
          <div class="remet-linha">${r.nomeFormatado}</div>
          <div class="remet-linha">ENDEREÇO: AVENIDA RAJA GABAGLIA, Nº 2720</div>
          <div class="remet-linha">BAIRRO: ${r.bairro.toUpperCase()}</div>
          <div class="remet-linha">CIDADE: ${r.cidade.toUpperCase()}-${r.uf}</div>
          <div class="remet-linha">CEP: ${r.cep}</div>
          <div class="remet-linha">CNPJ: ${r.cnpj}</div>
        </div>
        <div class="remet-bloco">
          <div class="remet-titulo">DESTINATÁRIO:</div>
          <div class="remet-linha">${esc(d.nome)}</div>
          <div class="remet-linha">ENDEREÇO: ${esc(d.endereco)}</div>
          <div class="remet-linha">BAIRRO: ${esc(d.bairro)}</div>
          <div class="remet-linha">CIDADE: ${esc(d.cidade)}-${esc(d.uf)}</div>
          <div class="remet-linha">CEP: ${esc(d.cep)}</div>
        </div>
      </div>`;
  }

  /* =========================================================
     Exportação dos modelos (reutilizados pelos previews em documentos/)
     ========================================================= */
  const Modelos = { declaracaoConteudoHTML, remetenteCorreiosHTML, REMETENTE };

  /* =========================================================
     Geração de PNG
     ========================================================= */
  function esperarFontes() {
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

  function aguardar(ms) {
    return new Promise((res) => setTimeout(res, ms));
  }

  function capturar(elemento, escala) {
    return html2canvas(elemento, {
      scale: escala || 2,
      backgroundColor: "#ffffff",
      useCORS: false,
      allowTaint: false,
      logging: false,
      windowWidth: elemento.scrollWidth,
      windowHeight: elemento.scrollHeight,
    }).then((canvas) => {
      const url = canvas.toDataURL("image/png");
      if (!url || url.length < 2000) {
        throw new Error("A imagem gerada parece vazia.");
      }
      return { url, largura: canvas.width, altura: canvas.height };
    });
  }

  /**
   * Gera os dois PNGs. Retorna Promise com:
   * { declaracao: {url,largura,altura}, remetente: {url,largura,altura} }
   */
  async function gerarDocumentos(envio, opcoes) {
    const op = opcoes || {};
    const escala = op.escala || 2;

    const palco = document.getElementById("palco-documentos") || document.createElement("div");
    palco.id = "palco-documentos";
    palco.innerHTML = "";

    const docDeclaracao = declaracaoConteudoHTML(envio);
    const docRemetente = remetenteCorreiosHTML(envio);

    const divDecl = document.createElement("div");
    divDecl.innerHTML = docDeclaracao;
    const divRemet = document.createElement("div");
    divRemet.innerHTML = docRemetente;

    palco.appendChild(divDecl.firstElementChild);
    palco.appendChild(divRemet.firstElementChild);
    if (!palco.isConnected) {
      document.body.appendChild(palco);
    }

    await esperarFontes();
    await aguardar(120); // estabiliza layout

    if (typeof html2canvas !== "function") {
      throw new Error("Biblioteca html2canvas não encontrada em vendor/. Verifique o arquivo html2canvas.min.js.");
    }

    const declaracao = await capturar(palco.children[0], escala);
    if (op.aoCapturar) op.aoCapturar(1);
    await aguardar(60);
    const remetente = await capturar(palco.children[1], escala);
    if (op.aoCapturar) op.aoCapturar(2);

    return { declaracao, remetente };
  }

  function baixarDataUrl(dataUrl, nomeArquivo) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** Download dos dois PNGs em um único ZIP (jszip local). */
  async function baixarZip(imagens) {
    if (typeof JSZip !== "function") {
      throw new Error("Biblioteca JSZip não encontrada em vendor/.");
    }
    const zip = new JSZip();
    const d = imagens.declaracao.url.split(",")[1];
    const r = imagens.remetente.url.split(",")[1];
    zip.file("Declaracao_de_Conteudo.png", d, { base64: true });
    zip.file("Remetente_Correios.png", r, { base64: true });
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    baixarDataUrl(url, "documentos_envio.zip");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  window.DocumentoModelos = Modelos;
  window.GeradorPNG = { gerarDocumentos, baixarDataUrl, baixarZip };
})();
