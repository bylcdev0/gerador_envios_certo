/* =========================================================
   js/revisao.js — Etapas 3 (Revisão) e 4 (Geração)
   ========================================================= */
(function () {
  "use strict";

  const CHAVE_ENVIO = "gerador-envios:envio";

  const $ = (id) => document.getElementById(id);

  function esc(t) {
    return String(t == null ? "" : t)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;");
  }

  function carregarEnvio() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_ENVIO);
      if (!bruto) return null;
      const dados = JSON.parse(bruto);
      if (!dados || !dados.destinatario || !Array.isArray(dados.equipamentos)) return null;
      if (!dados.destinatario.nome || dados.equipamentos.length === 0) return null;
      return dados;
    } catch (e) {
      return null;
    }
  }

  function limparEnvio() {
    try {
      sessionStorage.removeItem(CHAVE_ENVIO);
    } catch (e) { /* Sem persistência */ }
  }

  function renderizarRevisao(envio) {
    const d = envio.destinatario;
    $("rv-destinatario").innerHTML =
      "<div class='rotulo'>Nome</div><div>" + esc(d.nome) + "</div>" +
      "<div class='rotulo'>Endereço</div><div>" + esc(d.endereco) + "</div>" +
      "<div class='rotulo'>Bairro</div><div>" + esc(d.bairro) + "</div>" +
      "<div class='rotulo'>Cidade</div><div>" + esc(d.cidade) + "</div>" +
      "<div class='rotulo'>UF</div><div>" + esc(d.uf) + "</div>" +
      "<div class='rotulo'>CEP</div><div>" + esc(d.cep) + "</div>" +
      "<div class='rotulo'>Documento</div><div>" + (d.documento ? esc(d.documento) : "—") + "</div>";

    const r = window.DocumentoModelos.REMETENTE;
    $("rv-remetente").innerHTML =
      "<div class='rotulo'>Nome</div><div>" + esc(r.nome) + "</div>" +
      "<div class='rotulo'>Endereço</div><div>Avenida Raja Gabaglia, 2720</div>" +
      "<div class='rotulo'>Bairro</div><div>Estoril</div>" +
      "<div class='rotulo'>Cidade/UF</div><div>Belo Horizonte/MG</div>" +
      "<div class='rotulo'>CEP</div><div>" + esc(r.cep) + "</div>" +
      "<div class='rotulo'>CNPJ</div><div>" + esc(r.cnpj) + "</div>";

    const tbody = $("rv-tabela").querySelector("tbody");
    tbody.innerHTML = "";
    envio.equipamentos.forEach((it) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + esc(it.descricao) + "</td>" +
        '<td class="num">' + String(it.quantidade) + "</td>" +
        '<td class="num">' + Calculos.formatarMoeda(it.valorUnitarioCentavos) + "</td>" +
        '<td class="num">' + Calculos.formatarMoeda(Calculos.valorTotalItemCents(it)) + "</td>" +
        '<td class="num">' + Calculos.formatarPeso(it.pesoUnitarioGramas) + "</td>" +
        '<td class="num">' + Calculos.formatarPeso(Calculos.pesoTotalItemGramas(it)) + "</td>";
      tbody.appendChild(tr);
    });

    const t = Calculos.calcularTotaisEExtentos(envio.equipamentos);
    $("rv-res-qtd").textContent = String(t.quantidadeTotal);
    $("rv-res-valor").textContent = t.valorTotalFormatado;
    $("rv-res-peso").textContent = t.pesoTotalFormatado;

    document.querySelectorAll("[data-etapa]").forEach((el) => {
      const n = Number(el.getAttribute("data-etapa"));
      el.classList.toggle("ativa", n === 3);
      el.classList.toggle("concluida", n < 3);
    });
  }

  const envio = carregarEnvio();
  if (!envio) {
    $("alerta-revisao").className = "alerta alerta-erro visivel";
    $("alerta-revisao").textContent = "Nenhum envio em andamento. Volte ao início e preencha os dados.";
    $("secao-revisao").style.display = "none";
    $("rv-voltar").addEventListener("click", () => { window.location.href = "index.html"; });
    return;
  }

  renderizarRevisao(envio);

  $("rv-voltar").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  /* ---------- Geração ---------- */
  let imagensGeradas = null;

  $("rv-confirmar").addEventListener("click", async function () {
    if (imagensGeradas) {
      // Já geradas: apenas mostra novamente
      $("secao-resultado").classList.add("visivel");
      return;
    }
    const botao = this;
    botao.disabled = true;
    $("rv-voltar").disabled = true;
    $("rv-status").className = "status-geracao visivel";
    $("rv-status-texto").textContent = "Gerando Declaração de Conteúdo (PDF)…";

    try {
      const documentos = await GeradorPDF.gerarDocumentosPDF(envio, {
        aoCapturar(n) {
          $("rv-status-texto").textContent =
            n === 1 ? "Gerando Remetente dos Correios (PDF)…" : "Finalizando…";
        },
      });

      if (!documentos.declaracao || !documentos.remetente) {
        throw new Error("Um dos documentos não foi produzido.");
      }
      imagensGeradas = documentos;

      // Pré-visualização: o próprio PDF real (o que se vê é o que se baixa)
      const urlDecl = URL.createObjectURL(documentos.declaracao.blob);
      const urlRem = URL.createObjectURL(documentos.remetente.blob);
      $("prev-declaracao").src = urlDecl;
      $("prev-remetente").src = urlRem;
      $("info-declaracao").textContent =
        documentos.declaracao.nomeArquivo + " — " + documentos.declaracao.paginas +
        " página(s), " + Math.round(documentos.declaracao.bytes / 1024) + " KB (texto editável)";
      $("info-remetente").textContent =
        documentos.remetente.nomeArquivo + " — " + documentos.remetente.paginas +
        " página(s), " + Math.round(documentos.remetente.bytes / 1024) + " KB (texto editável)";

      document.querySelectorAll("[data-etapa]").forEach((el) => {
        const n = Number(el.getAttribute("data-etapa"));
        el.classList.toggle("ativa", n === 4);
        el.classList.toggle("concluida", n < 4);
      });

      $("secao-resultado").classList.add("visivel");
      $("secao-resultado").scrollIntoView({ behavior: "smooth" });
    } catch (erro) {
      $("alerta-revisao").className = "alerta alerta-erro visivel";
      $("alerta-revisao").textContent =
        "Falha ao gerar os documentos: " + (erro && erro.message ? erro.message : erro) + ". Verifique e tente novamente.";
    } finally {
      botao.disabled = false;
      $("rv-voltar").disabled = false;
      $("rv-status").className = "status-geracao";
    }
  });

  $("dl-declaracao").addEventListener("click", () => {
    if (imagensGeradas) GeradorPDF.baixarBlob(imagensGeradas.declaracao.blob, imagensGeradas.declaracao.nomeArquivo);
  });
  $("dl-remetente").addEventListener("click", () => {
    if (imagensGeradas) GeradorPDF.baixarBlob(imagensGeradas.remetente.blob, imagensGeradas.remetente.nomeArquivo);
  });
  $("dl-zip").addEventListener("click", async function () {
    if (!imagensGeradas) return;
    this.disabled = true;
    try {
      await GeradorPDF.baixarZip(imagensGeradas);
    } catch (erro) {
      $("alerta-revisao").className = "alerta alerta-aviso visivel";
      $("alerta-revisao").textContent =
        "Não foi possível gerar o ZIP (" + (erro && erro.message ? erro.message : erro) + "). Use os downloads individuais.";
    } finally {
      this.disabled = false;
    }
  });

  $("rv-novo-envio").addEventListener("click", () => {
    if (!confirm("Iniciar um novo envio? Os dados atuais serão apagados.")) return;
    limparEnvio(); // privacidade: dados removidos do sessionStorage ao finalizar
    window.location.href = "index.html";
  });
})();
