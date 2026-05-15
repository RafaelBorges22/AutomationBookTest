# AutomationBookTest

Aplicação para gerar cadernos de casos de teste em Excel a partir de arquivos Swagger/OpenAPI (`.json`).

O objetivo é acelerar a criação de CTs padronizados para APIs, extraindo rotas, métodos, parâmetros obrigatórios, exemplos de request/response, URLs base e HTTP status codes documentados no contrato.

## O Que A Aplicação Faz

- Importa Swagger/OpenAPI em formato JSON.
- Lê endpoints, métodos HTTP e descrições da API.
- Captura URLs do array `servers` do Swagger.
- Extrai parâmetros de `Header`, `Query`, `Path` e `Body`.
- Busca parâmetros obrigatórios aninhados dentro de objetos, arrays e `$ref`.
- Captura os HTTP Status Codes documentados em `responses`, como `200`, `201`, `400`, `401`, `403`, `404`, `422`, `500`, entre outros.
- Permite selecionar quais status codes devem gerar cenários.
- Permite preencher massa de dados diretamente na tela.
- Permite adicionar cenários manuais extras.
- Exporta uma planilha `.xlsx` pronta para uso/importação.

## Pré-Requisitos

Antes de iniciar, instale:

- Node.js 18 ou superior.
- npm.
- Um arquivo Swagger/OpenAPI em `.json`.

Para instalar as dependências do projeto:

```bash
npm install
```

## Como Iniciar A Aplicação

### Opção Recomendada: Start Automático

Na raiz do projeto, execute:

```bash
start_app.bat
```

Esse arquivo abre:

- Backend/parser em `http://localhost:3000`.
- Frontend web em `http://localhost:3001`.
- Navegador automaticamente na interface web.

### Opção Manual

Abra dois terminais na raiz do projeto.

Terminal 1:

```bash
npm run dev
```

Terminal 2:

```bash
node frontend-server.mjs
```

Depois acesse:

```text
http://localhost:3001
```

## Como Usar Pela Interface Web

1. Abra `http://localhost:3001`.
2. Preencha o campo `Número Z`.
3. Informe o nome do arquivo Swagger.
4. Informe o nome do caderno Excel que será gerado.
5. Clique em `Escolher ficheiro` e selecione o Swagger `.json` do seu computador.
6. Clique em `Importar Swagger`.
7. Clique em `Carregar Swagger`.

Depois do carregamento, a tela exibirá os endpoints encontrados no Swagger.

## Selecionar URL Base

Quando o Swagger tiver o campo `servers`, a aplicação preenche uma lista de URLs disponíveis.

No campo de URL base, você pode:

- selecionar uma URL da lista, como DEV ou HML;
- digitar manualmente outra URL.

Essa URL será usada na descrição dos passos dos cenários.

## Selecionar Status Codes

Para cada endpoint, a aplicação mostra checkboxes com os status codes encontrados em:

```text
paths.[rota].[metodo].responses
```

Exemplos:

- `200`
- `201`
- `400`
- `401`
- `403`
- `404`
- `422`
- `500`

Marque apenas os status codes que devem gerar cenários automáticos.

Importante: o status `422` não é ignorado automaticamente. Ele aparece como opção quando existir no Swagger, e o usuário decide se quer gerar ou não.

## Preencher Massa De Dados

A tela mostra os parâmetros extraídos do Swagger.

Para parâmetros vazios, a aplicação renderiza campos de texto para digitação da massa.

Você pode preencher valores para:

- Header.
- Query.
- Path.
- Body.

Esses valores entram no payload ou na descrição do cenário gerado.

## Adicionar Cenários Extras

Use o botão:

```text
+ Adicionar Cenário Extra
```

Cada cenário extra possui campos editáveis para:

- `description`
- `step_description`

Esses cenários manuais entram no mesmo Excel junto com os cenários automáticos.

## Gerar E Baixar O Excel

Depois de configurar endpoints, status codes, URL base e massa de dados:

1. Clique no botão de geração.
2. Aguarde o processamento.
3. O navegador baixará o arquivo `.xlsx`.
4. Caso o download automático não apareça, use o link exibido na tela para baixar novamente.

O arquivo também é salvo na raiz do projeto com o nome informado no campo `Nome do Caderno`.

## Arquivo Gerado

Por padrão, o caderno segue a estrutura de colunas usada para importação dos CTs:

- `unique_id`
- `type`
- `name`
- `step_type`
- `step_description`
- `test_type`
- `designer`
- `description`
- `prerequisite_udf`
- `owner`
- `phase`
- `user_tags`
- `responsible_factory_udf`
- `test_phase_udf`

As linhas vazias são exportadas como string vazia (`""`), sem preenchimento artificial.

## Cuidados Com Status Code 200

A aplicação não deve fazer replace global no Excel para remover valores.

Isso é importante porque um replace incorreto de `20` pode destruir CTs de sucesso, transformando:

```text
status 200
Response COD 200
```

em:

```text
status 0
Response COD 0
```

A correção correta é feita na origem da geração dos dados. A aplicação também possui uma validação antes de salvar o Excel para bloquear exportações com status code corrompido.

## Erros Comuns

### Unexpected end of JSON input

Esse erro normalmente indica que o arquivo JSON está vazio, incompleto ou foi lido antes de terminar o upload.

Como resolver:

- confirme que o arquivo escolhido é `.json`;
- abra o arquivo em um editor e verifique se começa com `{` e termina com `}`;
- importe novamente pelo botão da tela;
- evite usar arquivo parcialmente baixado.

### Failed to execute 'json' on 'Response'

Esse erro pode acontecer quando o frontend espera JSON, mas o backend retornou resposta vazia ou erro.

Como resolver:

- confirme que o backend está rodando na porta `3000`;
- confirme que o frontend está rodando na porta `3001`;
- reinicie usando `start_app.bat`;
- tente importar o Swagger novamente.

### O Excel Abriu Com Dados Antigos

Se uma planilha antiga já foi gerada com erro, ela não será corrigida automaticamente.

Gere um novo arquivo pela aplicação atualizada.

## Scripts Disponíveis

Rodar backend/parser:

```bash
npm run dev
```

Rodar frontend:

```bash
node frontend-server.mjs
```

Rodar fluxo antigo via CLI:

```bash
npm start
```

Validar TypeScript:

```bash
npx tsc --noEmit
```

## Estrutura Principal Do Projeto

```text
.
├── components/
│   ├── excelWrite.ts
│   ├── paramExtractor.ts
│   ├── scenarioGenerator.ts
│   ├── stepBuilder.ts
│   ├── swaggerExtractor.ts
│   └── types.ts
├── public/
│   └── index.html
├── server.ts
├── frontend-server.mjs
├── start_app.bat
├── package.json
└── readme.md
```

## Fluxo Resumido

```text
Swagger JSON
  -> Importar na interface
  -> Parser extrai endpoints, parâmetros, servers e responses
  -> Usuário escolhe status codes e preenche massa
  -> Usuário pode adicionar cenários extras
  -> Aplicação gera CTs
  -> Excel .xlsx é baixado e salvo
```

## Manual Em PDF

Também existe um manual de uso em PDF na raiz do projeto:

```text
Manual_Usuario_AutomationBookTest.pdf
```

