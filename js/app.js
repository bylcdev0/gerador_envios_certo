/* =========================================================
   js/app.js — Etapas 1 (Destinatário) e 2 (Equipamentos)
   Persistência: apenas sessionStorage (temporária) — ver
   seção Privacidade do README. Nenhum dado sai do navegador.
   ========================================================= */
(function () {
  "use strict";

  const CHAVE_ENVIO = "gerador-envios:envio";

  const TIPOS = [
    "Notebook", "Desktop", "Cabo de alimentação", "Celular", "Chip",
    "Mouse", "Teclado", "Mochila", "Monitor", "Carregador", "Outro equipamento",
  ];

  const estado = {
    destinatario: { nome: "", endereco: "", bairro: "", cidade: "", uf: "", cep: "", documento: "" },
    equipamentos: [],
    idEditando: null,
  };

  /* ---------- Persistência temporária ---------- */
  function salvarEstado() {
    try { sessionStorage.setItem(CHAVE_ENVIO, JSON.stringify(estado)); } catch (e) { /* sem storage */ }
  }
  function carregarEstado() {
    try {
      const bruto = sessionStorage.getItem(CHAVE_ENVIO);
      if (!bruto) return;
      const dados = JSON.parse(bruto);
      if (dados && dados.destinatario) {
        Object.assign(estado.destinatario, dados.destinatario);
        estado.equipamentos = Array.isArray(dados.equipamentos) ? dados.equipamentos : [];
      }
    } catch (e) { /* estado corrompido: começa limpo */ }
  }
  function limparEstado() {
    try { sessionStorage.removeItem(CHAVE_ENVIO); } catch (e) { /* Sem persistência */ }
  }

  const $ = (id) => document.getElementById(id);

  /* ---------- Referências ---------- */
  const etapaDest = $("secao-destinatario");
  const etapaEq = $("secao-equipamentos");
  const INPUTS = {
    nome: $("f-nome"), endereco: $("f-endereco"), bairro: $("f-bairro"),
    cidade: $("f-cidade"), uf: $("f-uf"), cep: $("f-cep"), documento: $("f-documento"),
  };
  const CAMPOS = ["nome", "endereco", "bairro", "cidade", "uf", "cep"];
  const ROTULOS = {
    nome: "Nome completo", endereco: "Endereço", bairro: "Bairro",
    cidade: "Cidade", uf: "UF", cep: "CEP",
  };
  const ERROS = {
    nome: "erro-nome", endereco: "erro-endereco", bairro: "erro-bairro",
    cidade: "erro-cidade", uf: "erro-uf", cep: "erro-cep",
  };
  const alertaDest = $("alerta-destinatario");
  const alertaEq = $("alerta-equipamentos");
  const tiposGrade = $("tipos-equipamento");
  const formEquip = $("form-equipamento");
  const lblTipoAtual = $("eq-tipo-atual");
  const inDescricaoOutro = $("eq-descricao-outro");
  const inQuantidade = $("eq-quantidade");
  const inValor = $("eq-valor");
  const inPeso = $("eq-peso");
  const inCabo = $("eq-incluir-cabo");
  const msgErroEq = $("msg-erro-equipamento");
  const previaItem = $("eq-previa");
  const corpoTabela = $("corpo-tabela-equipamentos");
  const resQtd = $("res-qtd"), resValor = $("res-valor"), resPeso = $("res-peso");
  const btnSalvar = $("btn-eq-salvar");
  const btnContinuar = $("btn-continuar");

  /* ---------- Utilidades ---------- */
  function esc(t) {
    return String(t == null ? "" : t)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split('"').join("&quot;");
  }
  function msgCampo(input, erroId, texto) {
    const div = $(erroId);
    if (texto) {
      input.classList.add("erro"); div.textContent = texto; div.classList.add("visivel");
      return false;
    }
    input.classList.remove("erro"); div.classList.remove("visivel");
    return true;
  }

  /* ---------- Máscaras ---------- */
  INPUTS.cep.addEventListener("input", () => {
    let v = INPUTS.cep.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
    INPUTS.cep.value = v;
  });
  INPUTS.uf.addEventListener("input", () => {
    INPUTS.uf.value = INPUTS.uf.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  });
  inValor.addEventListener("input", () => {
    inValor.value = inValor.value.replace(/[^0-9.,]/g, "");
    atualizarPrevia();
  });
  inPeso.addEventListener("input", () => {
    inPeso.value = inPeso.value.replace(/[^0-9.,]/g, "");
    atualizarPrevia();
  });
  inQuantidade.addEventListener("input", () => {
    inQuantidade.value = inQuantidade.value.replace(/\D/g, "");
    atualizarPrevia();
  });
  inQuantidade.addEventListener("blur", () => {
    if (inQuantidade.value === "0" || (inQuantidade.value !== "" && Number(inQuantidade.value) < 1)) {
      msgCampo(inQuantidade, "erro-quantidade", "Quantidade deve ser um número inteiro maior que zero.");
    } else {
      msgCampo(inQuantidade, "erro-quantidade", "");
    }
  });

  function atualizarPrevia() {
    const q = Number(inQuantidade.value || 0);
    const vc = Calculos.parseParaCentavos(inValor.value);
    const pg = Calculos.parseParaGramas(inPeso.value);
    if (q > 0 && vc != null) {
      let txt = "Valor total do item: " + Calculos.formatarMoeda(q * vc);
      if (pg != null) txt += "  •  Peso total do item: " + Calculos.formatarPeso(q * pg);
      previaItem.textContent = txt;
    } else {
      previaItem.textContent = "";
    }
  }

  /* ---------- Validação do destinatário ---------- */
  function validarDestinatario(mostrarErros) {
    let ok = true;
    CAMPOS.forEach((c) => {
      const campo = INPUTS[c];
      const valor = campo.value.trim();
      let erro = "";
      if (!valor) erro = ROTULOS[c] + " é obrigatório.";
      else if (c === "cep" && valor.replace(/\D/g, "").length !== 8) erro = "CEP deve ter 8 dígitos (formato 00000-000).";
      else if (c === "uf" && valor.length !== 2) erro = "UF deve ter 2 letras.";
      if (mostrarErros) {
        if (!msgCampo(campo, ERROS[c], erro)) ok = false;
      } else if (erro) {
        ok = false;
      }
    });
    return ok;
  }

  function coletarDestinatario() {
    CAMPOS.forEach((c) => { estado.destinatario[c] = INPUTS[c].value.trim(); });
    // Normalizações defensivas (caso o valor seja colado/editado programaticamente)
    estado.destinatario.uf = estado.destinatario.uf.toUpperCase();
    estado.destinatario.cep = estado.destinatario.cep.replace(/\D/g, "");
    INPUTS.uf.value = estado.destinatario.uf;
    if (estado.destinatario.cep.length > 5) {
      INPUTS.cep.value = estado.destinatario.cep.slice(0, 5) + "-" + estado.destinatario.cep.slice(5);
    }
    estado.destinatario.documento = INPUTS.documento.value.trim();
  }

  /* ---------- Progresso e navegação ---------- */
  function atualizarProgresso(passo) {
    document.querySelectorAll("[data-etapa]").forEach((el) => {
      const n = Number(el.getAttribute("data-etapa"));
      el.classList.toggle("ativa", n === passo);
      el.classList.toggle("concluida", n < passo);
    });
  }

  function mostrarEtapa(nome) {
    etapaDest.classList.toggle("visivel", nome === "destinatario");
    etapaEq.classList.toggle("visivel", nome === "equipamentos");
    atualizarProgresso(nome === "destinatario" ? 1 : 2);
    window.scrollTo(0, 0);
  }

  $("btn-dest-continuar").addEventListener("click", () => {
    coletarDestinatario();
    if (!validarDestinatario(true)) {
      alertaDest.textContent = "Preencha corretamente os campos destacados para continuar.";
      alertaDest.className = "alerta alerta-erro visivel";
      return;
    }
    alertaDest.className = "alerta";
    salvarEstado();
    mostrarEtapa("equipamentos");
    renderizarTabela();
  });

  $("btn-dest-reiniciar").addEventListener("click", () => {
    if (!confirm("Reiniciar o envio? Os dados preenchidos serão apagados.")) return;
    limparEstado();
    estado.equipamentos = [];
    estado.idEditando = null;
    CAMPOS.concat(["documento"]).forEach((c) => { INPUTS[c].value = ""; });
    CAMPOS.forEach((c) => msgCampo(INPUTS[c], ERROS[c], ""));
    mostrarEtapa("destinatario");
    renderizarTabela();
  });

  $("btn-eq-voltar").addEventListener("click", () => {
    coletarDestinatario();
    salvarEstado();
    mostrarEtapa("destinatario");
  });

  btnContinuar.addEventListener("click", () => {
    if (estado.equipamentos.length === 0) {
      alertaEq.textContent = "Adicione pelo menos um equipamento antes de continuar.";
      alertaEq.className = "alerta alerta-erro visivel";
      return;
    }
    if (estado.equipamentos.length > Calculos.MAX_ITENS) {
      alertaEq.className = "alerta alerta-erro visivel";
      alertaEq.textContent =
        "A Declaração de Conteúdo comporta no máximo " + Calculos.MAX_ITENS +
        " tipos diferentes de equipamento. Remova itens para continuar.";
      return;
    }
    salvarEstado();
    window.location.href = "revisao.html";
  });

  /* ---------- Equipamentos ---------- */
  function desenharTipos() {
    TIPOS.forEach((tipo) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tipo-opcao";
      b.textContent = tipo;
      b.addEventListener("click", () => abrirFormulario(null, tipo));
      tiposGrade.appendChild(b);
    });
  }

  function marcarTipoSelecionado(tipo) {
    document.querySelectorAll(".tipo-opcao").forEach((b) => {
      b.classList.toggle("selecionado", b.textContent === tipo);
    });
  }

  function abrirFormulario(id, tipo) {
    estado.idEditando = id;
    formEquip.style.display = "block";
    msgErroEq.textContent = "";
    marcarTipoSelecionado(tipo);
    lblTipoAtual.textContent = tipo;

    if (tipo === "Outro equipamento") {
      inDescricaoOutro.style.display = "block";
      inDescricaoOutro.value = "";
    } else {
      inDescricaoOutro.style.display = "none";
      inDescricaoOutro.value = "";
    }

    inCabo.closest(".campo-opcao").style.display = tipo === "Desktop" ? "flex" : "none";
    inCabo.checked = false;

    if (id != null) {
      const it = estado.equipamentos.find((x) => x.id === id);
      if (it) {
        if (it.tipo === "Outro equipamento") inDescricaoOutro.value = it.descricao;
        inQuantidade.value = String(it.quantidade);
        inValor.value = (it.valorUnitarioCentavos / 100)
          .toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        inPeso.value = (it.pesoUnitarioGramas / 1000)
          .toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
        btnSalvar.textContent = "Salvar alterações";
      }
    } else {
      btnSalvar.textContent = "Adicionar equipamento";
    }
    atualizarPrevia();
    formEquip.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  btnSalvar.addEventListener("click", () => {
    const tipo = lblTipoAtual.textContent;
    if (!tipo) {
      msgErroEq.textContent = "Selecione o tipo de equipamento.";
      return;
    }
    // Tipos padrão usam o próprio nome do tipo como descrição;
    // "Outro equipamento" exige descrição personalizada.
    const descricao = tipo === "Outro equipamento" ? inDescricaoOutro.value.trim() : tipo;
    if (!descricao) {
      msgErroEq.textContent = "Informe a descrição do equipamento.";
      return;
    }
    const qtd = inQuantidade.value === "" ? NaN : Number(inQuantidade.value);
    const valorC = Calculos.parseParaCentavos(inValor.value);
    const pesoG = Calculos.parseParaGramas(inPeso.value);

    if (!Number.isInteger(qtd) || qtd < 1) {
      msgErroEq.textContent = "Quantidade inválida: informe um número inteiro maior que zero.";
      return;
    }
    if (valorC == null || valorC < 0) {
      msgErroEq.textContent = "Valor unitário inválido. Use o formato 5.200,00.";
      return;
    }
    if (pesoG == null) {
      msgErroEq.textContent = "Peso unitário inválido. Use o formato 2,5 (kg).";
      return;
    }

    if (estado.idEditando != null) {
      const i = estado.equipamentos.findIndex((x) => x.id === estado.idEditando);
      estado.equipamentos[i] = { id: estado.idEditando, tipo, descricao, quantidade: qtd, valorUnitarioCentavos: valorC, pesoUnitarioGramas: pesoG };
    } else {
      if (estado.equipamentos.length >= Calculos.MAX_ITENS) {
        msgErroEq.textContent =
          "Limite de " + Calculos.MAX_ITENS + " tipos de equipamento atingido (modelo da Declaração de Conteúdo). Remova um item para adicionar outro.";
        return;
      }
      estado.equipamentos.push({ id: Calculos.proximoId(), tipo, descricao, quantidade: qtd, valorUnitarioCentavos: valorC, pesoUnitarioGramas: pesoG });
      // Desktop pode ter Cabo de alimentação associado — sempre como ITEM separado,
      // com quantidade, valor e peso informados manualmente (nada é somado automaticamente).
      if (tipo === "Desktop" && inCabo.checked) {
        salvarEstado();
        fecharFormulario();
        renderizarTabela();
        abrirFormulario(null, "Cabo de alimentação");
        msgErroEq.textContent = "";
        previaItem.textContent = "";
        const aviso = document.createElement("div");
        aviso.className = "aviso-cabo";
        aviso.textContent = "Desktop adicionado. Agora informe o cabo de alimentação associado (quantidade, valor e peso).";
        msgErroEq.after(aviso);
        return;
      }
      salvarEstado();
      fecharFormulario();
      renderizarTabela();
      return;
    }
    salvarEstado();
    fecharFormulario();
    renderizarTabela();
  });

  $("btn-eq-cancelar").addEventListener("click", fecharFormulario);

  function fecharFormulario() {
    formEquip.style.display = "none";
    estado.idEditando = null;
    marcarTipoSelecionado("");
    inQuantidade.value = "";
    inValor.value = "";
    inPeso.value = "";
    inDescricaoOutro.value = "";
    previaItem.textContent = "";
  }

  function renderizarTabela() {
    corpoTabela.innerHTML = "";
    if (estado.equipamentos.length === 0) {
      corpoTabela.innerHTML =
        '<tr><td colspan="8" class="vazio">Nenhum equipamento adicionado. Selecione um tipo acima.</td></tr>';
    } else {
      estado.equipamentos.forEach((it) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + esc(it.descricao) + "</td>" +
          '<td class="num">' + String(it.quantidade) + "</td>" +
          '<td class="num">' + Calculos.formatarMoeda(it.valorUnitarioCentavos) + "</td>" +
          '<td class="num">' + Calculos.formatarMoeda(Calculos.valorTotalItemCents(it)) + "</td>" +
          '<td class="num">' + Calculos.formatarPeso(it.pesoUnitarioGramas) + "</td>" +
          '<td class="num">' + Calculos.formatarPeso(Calculos.pesoTotalItemGramas(it)) + "</td>" +
          '<td><button type="button" class="btn-secundario btn-pequeno" data-editar="' + it.id + '">Editar</button></td>' +
          '<td><button type="button" class="btn-perigo btn-pequeno" data-remover="' + it.id + '">Remover</button></td>';
        corpoTabela.appendChild(tr);
      });
    }

    const totais = Calculos.calcularTotaisEExtentos(estado.equipamentos);
    resQtd.textContent = String(totais.quantidadeTotal);
    resValor.textContent = totais.valorTotalFormatado;
    resPeso.textContent = totais.pesoTotalFormatado;

    if (estado.equipamentos.length >= Calculos.MAX_ITENS && btnContinuar) {
      alertaEq.className = "alerta alerta-aviso visivel";
      alertaEq.textContent = "Você atingiu o limite de " + Calculos.MAX_ITENS +
        " tipos de equipamento da Declaração de Conteúdo.";
    } else if (alertaEq.classList.contains("alerta-aviso")) {
      alertaEq.className = "alerta";
    }
  }

  corpoTabela.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    if (btn.hasAttribute("data-remover")) {
      const id = Number(btn.getAttribute("data-remover"));
      estado.equipamentos = estado.equipamentos.filter((x) => x.id !== id);
      salvarEstado();
      renderizarTabela();
    } else if (btn.hasAttribute("data-editar")) {
      abrirFormulario(Number(btn.getAttribute("data-editar")), tipoDoId(Number(btn.getAttribute("data-editar"))));
    }
  });

  function tipoDoId(id) {
    const it = estado.equipamentos.find((x) => x.id === id);
    return it ? it.tipo : "Outro equipamento";
  }

  /* ---------- Inicialização ---------- */
  carregarEstado();
  CAMPOS.concat(["documento"]).forEach((c) => { INPUTS[c].value = estado.destinatario[c] || ""; });
  desenharTipos();
  mostrarEtapa("destinatario");
  renderizarTabela();
})();
