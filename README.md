# Gerador de Envios

Aplicação **100% estática** (HTML5 + CSS3 + JavaScript Vanilla) para a equipe interna de TI
gerar os documentos de envio de equipamentos a colaboradores remotos:

- **Declaração de Conteúdo** (modelo padrão da empresa, com **duas vias** por página);
- **Remetente dos Correios** (reprodução visual do modelo padrão — não é um formulário oficial dos Correios).

Ambos são gerados como imagens **PNG** em resolução adequada à impressão A4, com os dados
preenchidos automaticamente a partir do envio informado na interface.

---

## Como executar

Não há backend, servidor de aplicação ou instalação:

- **Versão publicada (GitHub Pages)**: https://bylcdev0.github.io/gerador_envios_certo/
1. Abra o arquivo **`index.html`** em um navegador moderno (Chrome, Edge ou Firefox).
2. Fluxo: Destinatário → Equipamentos → Revisão → Confirmação → Geração dos PNGs → Download.

Boa alternativa para testes: `documentos/declaracao-conteudo.html` e
`documentos/remetente-correios.html` mostram os modelos preenchidos com dados de teste.

> A aplicação funciona aberta direto do disco (`file://`) — não usa `fetch` nem CDNs.

## Estrutura de arquivos

```
gerador-envios/
├── index.html                       Etapas 1–2 (Destinatário, Equipamentos)
├── revisao.html                     Etapas 3–4 (Revisão, Geração e Downloads)
├── css/
│   ├── style.css                    Interface do aplicativo
│   └── documentos.css               Aparência exclusiva dos documentos (modelos padrão)
├── js/
│   ├── app.js                       Formulário, validações, máscaras, equipamentos
│   ├── revisao.js                   Revisão, confirmação, downloads, novo envio
│   ├── calculos.js                  Cálculos (inteiros em centavos/gramas) e formatação pt-BR
│   └── gerador-png.js               Templates HTML dos documentos + html2canvas + ZIP
├── documentos/
│   ├── declaracao-conteudo.html     Pré-visualização do modelo (dados de teste)
│   └── remetente-correios.html      Pré-visualização do modelo (dados de teste)
├── vendor/
│   ├── html2canvas.min.js           v1.4.1 (cópia local — sem CDN)
│   └── jszip.min.js                 v3.10.1 (cópia local — sem CDN)
├── testes/                          Roteiros e resultados de teste
└── README.md
```

## Regras de negócio

- **Remetente fixo**: RRPM CURSOS PREPARATORIOS LTDA — Avenida Raja Gabaglia, 2720,
  Estoril, Belo Horizonte/MG, CEP 30494-170, CNPJ 03.515.918/0004-04 (não editável).
- **Destinatário**: nome, endereço, bairro, cidade, UF e CEP obrigatórios;
  CPF/CNPJ/documento estrangeiro opcional. UF em maiúsculas; CEP mascarado `00000-000`.
- **Equipamentos**: 11 tipos predefinidos (incluindo "Outro equipamento" com descrição
  personalizada). O Desktop pode ter **Cabo de alimentação associado**, sempre
  representado como **item separado** — quantidade, valor e peso são informados
  manualmente, nada é somado automaticamente.
- **Limite**: a Declaração de Conteúdo padrão comporta no máximo **4 tipos diferentes**
  de equipamento; a geração é bloqueada com explicação se ultrapassar.
- **Cálculos** (em tempo real, sem erros de arredondamento — aritmética inteira em
  centavos e gramas):
  - valor total do item = quantidade × valor unitário;
  - peso total do item = quantidade × peso unitário;
  - quantidade, valor e peso totais do envio;
  - formatos: `R$ 5.200,00` e `2,00 kg`.
- **Data** no documento: obtida no momento da geração, formato `24 de OUTUBRO de 2026`
  (mês em português, maiúsculo).
- **Assinatura** permanece em branco (preenchida à mão). Nenhuma assinatura digital
  ou fictícia é inserida.

## A arte dos documentos

`css/documentos.css` e `js/gerador-png.js` reproduzem as **imagens de referência da
empresa** (fonte principal dos layouts):

- Declaração: título em caixa própria, blocos REMETENTE/DESTINATÁRIO lado a lado,
  tabela IDENTIFICAÇÃO DOS BENS (ITEM | CONTEÚDO | QUANT. | VALOR) com 4 linhas,
  linhas TOTAIS/PESO TOTAL (kg) com fundo cinza, quadro DECLARAÇÃO com o texto legal
  (incluindo o link dos Correios), linha `BH, ___ de ___ de ___` preenchida com a data
  e espaço de assinatura em branco, quadro OBSERVAÇÃO — tudo repetido **duas vezes**
  (duas vias) na mesma página, como no original.
- Remetente dos Correios: blocos "REMETENTE:" e "DESTINATÁRIO:" com listagem de
  dados, na mesma disposição da referência.

## Privacidade

- **Sem banco de dados**, sem cadastro permanente, sem histórico de envios.
- Nenhum dado pessoal é enviado para qualquer serviço externo (sem CDNs, sem APIs,
  sem logs de terceiros). `html2canvas` e `JSZip` rodam 100% no navegador a partir
  de `vendor/`.
- Os dados são mantidos em **memória** + `sessionStorage` apenas para permitir
  voltar a uma etapa anterior sem perder o preenchimento. O `sessionStorage` é limpo
  ao clicar em **"Novo envio (apaga os dados)"** ou "Reiniciar envio"; ao fechar o
  navegador a sessão é descartada pelo próprio browser.

## Limitações conhecidas

- A qualidade visual do PNG depende da renderização do próprio navegador;
  `html2canvas` é a biblioteca de captura (cópia local em `vendor/`).
- Fonte: usa `Open Sans`/`Segoe UI`/Arial do sistema — se a máquina não tiver
  `Open Sans`, a tipografia pode diferir discretamente da referência.
- No documento de Remetente, a linha de cidade usa o formato `CIDADE/estado`,
  unificado com o padrão do bloco REMETENTE (`CIDADE: BELO HORIZONTE-MG`); a
  imagem de referência original do destinatário usava uma barra invertida
  (`CIDADE: cidade\UF`), que parece um erro de digitação do original — ajustável
  em `js/gerador-png.js` se desejado.
- O download ZIP depende de `vendor/jszip.min.js`; se o arquivo estiver ausente, os
  downloads individuais continuam funcionando (funcionalidade obrigatória).
- O `alert()/confirm()` nativo é usado nas confirmações destrutivas.

## Testes

Veja `testes/roteiro-de-testes.md` para o roteiro executado no ambiente e os
resultados de cada item.
