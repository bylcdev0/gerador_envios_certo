# Roteiro de testes executado — Gerador de Envios

Ambiente: Windows; aplicação servida durante os testes em `http://127.0.0.1:8734`
(python `http.server` **apenas como infraestrutura de teste de arquivos estáticos** —
a aplicação não requer servidor; todos os scripts são locais e relativos).
Navegador controlado por automação. Todas as execuções abaixo foram realmente
realizadas nesta sessão de desenvolvimento.

## 1. Validação dos campos obrigatórios — ✔ APROVADO

- Clicar em "Continuar para equipamentos" com todos os campos vazios permanece
  na etapa 1 e exibe as 6 mensagens ("Nome completo é obrigatório.", etc.) e o
  alerta "Preencha corretamente os campos destacados para continuar.".

## 2. Máscara e validação do CEP — ✔ APROVADO

- Digitação simulada com evento `input`: `30000000` → `30000-000`.
- CEP incompleto `30000-00` → erro "CEP deve ter 8 dígitos (formato 00000-000)."
  e bloqueio do avanço.

## 3. UF maiúscula — ✔ APROVADO

- Digitação `pr` → o campo exibe `PR` (conversão automática por evento `input`).

## 4. Seleção e remoção de equipamentos — ✔ APROVADO

- Itens "Outro equipamento (Headset gamer com microfone)", Desktop, Cabo de
  alimentação e Mouse adicionados via grade de tipos; tabela refletiu cada item.
- Botão "Remover" excluiu o item e o total foi recalculado (4 → 3 linhas).
- Botão "Editar" reabriu o formulário com os valores do item; alteração de
  quantidade (1 → 2) foi aplicada à tabela e aos totais.

## 5. Descrição de equipamento personalizado — ✔ APROVADO

- Tipo "Outro equipamento" abriu o campo de descrição personalizada; a descrição
  "Headset gamer com microfone" apareceu na tabela e entraria no CONTEÚDO da declaração.

## 6. Cálculo de quantidade — ✔ APROVADO

- 1 Notebook + 2 Mouse ⇒ fila de revisão exibiu "3" na quantidade total;
  Desktop 1 + Cabo 1 + Mouse 1 ⇒ "3".

## 7. Cálculo monetário — ✔ APROVADO

- `5.200,00` ⇒ 520000 centavos; `5200.00` ⇒ 520000; `5.200` ⇒ 520000 (milhar); `abc` ⇒ rejeitado.
- Totais conferidos: R$ 5.350,00 (5200 + 2×75) e R$ 3.225,00 (3100 + 50 + 75).

## 8. Cálculo de peso — ✔ APROVADO

- `2,5` ⇒ 2500 g; `0,1` ⇒ 100 g; entrada não numérica ⇒ rejeitada.
- Totais conferidos: 2,70 kg e 12,25 kg (inteiros em gramas, sem erro de flutuante).

## 9. Limite de equipamentos — ✔ APROVADO

- Com 4 itens já cadastrados, a adição do 5º foi bloqueada:
  "Limite de 4 tipos de equipamento atingido (modelo da Declaração de Conteúdo)…",
  e a tabela permaneceu com 4 linhas. Aviso de limite exibido.

## 10. Desktop com Cabo de alimentação associado — ✔ APROVADO

- Ao salvar um Desktop com a opção marcada, o formulário reabriu automaticamente
  para "Cabo de alimentação" e o cabo foi gravado como **item separado**, com
  quantidade/valor/peso informados manualmente (nenhum valor automático).

## 11. Navegação entre etapas sem perder dados — ✔ APROVADO

- Dados preenchidos persistiram ao avançar para a revisão e voltar
  (sessionStorage); após "Reiniciar"/"Novo envio", os campos voltaram vazios e o
  armazenamento temporário foi limpo (`sessionStorage` → `null`).

## 12. Geração real dos dois PNGs — ✔ APROVADO

- "Confirmar e gerar documentos" produziu:
  - `Declaracao_de_Conteudo.png` — **1880×2714 px** (~227 dpi em A4; duas vias);
  - `Remetente_Correios.png` — **1880×2660 px** (~227 dpi em A4).
- Capturados da aba e inspecionados visualmente contra as imagens de
  referência: bordas, tabela, tons de cinza das linhas TOTAIS/PESO, textos
  legais, link dos Correios, data `BH , 22 de OUTUBRO de 2026`, assinatura em
  branco e as duas vias — tudo presente e legível, sem cortes.
- Uma falha anterior da geração (`firstChild` retornando nó de texto) foi
  corrigida (`firstElementChild`) e regenerada com sucesso.

## 13. Downloads individuais — ✔ APROVADO

- Botões de download geraram os arquivos `Declaracao_de_Conteudo.png`
  (587.949 bytes) e `Remetente_Correios.png` (298.007 bytes), recuperados e
  conferidos na máquina (PNGs válidos, não vazios).

## 14. Download ZIP — ✔ APROVADO

- `documentos_envio.zip` (898.405 bytes) gerado no navegador com JSZip local;
  extraído na pasta de teste com `Expand-Archive`: contém exatamente
  `Declaracao_de_Conteudo.png` e `Remetente_Correios.png`.

## 15. Acesso direto a revisao.html sem dados — ✔ APROVADO

- Mensagem clara "Nenhum envio em andamento" e seção de revisão oculta.

## 16. Funcionamento sem backend — ✔ APROVADO (com ressalva de verificação)

- A aplicação não usa `fetch`, CDNs, Python, Node ou APIs; servida como
  arquivos estáticos. Todos os scripts são locais, inclusive `vendor/`.
- **Ressalva**: a ferramenta de automação de navegador não permite abrir URLs
  `file://`; portanto a abertura duplo-clique do `index.html` não pôde ser
  automatizada aqui. Verificação manual sugerida (abaixo). Não há no código
  nenhum recurso que exija servidor (nenhuma chamada de rede, `import` remoto
  ou caminho absoluto).

## Verificação manual sugerida (2 minutos)

1. Duplo clique em `gerador-envios/index.html`.
2. Preencher destinatário → continuar → adicionar Notebook (1 × R$ 5.200,00 × 2,50 kg)
   e Mouse (2 × R$ 75,00 × 0,10 kg) → continuar.
3. Revisão → "Confirmar e gerar documentos" → conferir as duas pré-visualizações.
4. Baixar os dois PNGs e o ZIP; conferir com os exemplos em
   `testes/exemplos-gerados/`.
