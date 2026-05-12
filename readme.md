# 📑 Gerador de Casos de Teste - API MVNO

> Utilitário em Node.js (TypeScript) para automação e geração de cadernos de testes no Excel a partir de documentação Swagger/OpenAPI.

---

## 📋 Sobre o Projeto

O **Gerador de Casos de Teste** foi desenvolvido para padronizar e acelerar o processo de QA em projetos de APIs MVNO. A ferramenta analisa o contrato da API, identifica parâmetros obrigatórios e regras de negócio para gerar uma planilha `.xlsx` completa, contendo:

- **Cenários de Sucesso (200/201)**: Com inclusão dinâmica do `REQUEST BODY` formatado.
- **Cenários de Erro 400**: Geração automática de um caso de teste para cada parâmetro obrigatório ausente (Bad Request).
- **Cenários Técnicos**: Validações de erro 401, 404, 405, 415 e 429 com mensagens padronizadas.
- **Nomenclatura Dinâmica**: IDs sequenciais automáticos (ex: `API-CT-024.0001`) e tags de importação para o Octane.

O sistema utiliza **ExcelJS** para criar arquivos com cabeçalhos estilizados, filtros ativos e painéis congelados, prontos para execução manual ou importação em ferramentas de gestão.

---

## 🚀 Tecnologias Utilizadas

| Tecnologia | Finalidade |
|---|---|
| Node.js | Ambiente de execução |
| TypeScript | Linguagem principal e tipagem |
| ExcelJS | Manipulação e estilização de planilhas Excel |
| Swagger Parser | Parsing e resolução de $refs do OpenAPI |
| Readline | Interface CLI interativa |

---

## ⚙️ Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js 18+](https://nodejs.org/)
- Arquivos Swagger/OpenAPI no formato `.json`
- Pasta `./documentation` criada na raiz do projeto

---

## 📦 Instalação

```bash
# Clone o repositório
git clone [https://github.com/RafaelBorges22/AutomationBookTest.git](https://github.com/RafaelBorges22/AutomationBookTest.git)
cd AutomationBookTest

# Instale as dependências
npm install

