# ABNT GALÁCTICO

**EDITOR ACADÊMICO INTELIGENTE**

> Seu conhecimento. Sua missão. Seu trabalho nas normas ABNT.

O ABNT GALÁCTICO é um editor para criação, organização, edição, formatação e exportação de trabalhos acadêmicos.

## Requisitos

- Node.js 20.19+ ou 22.12+ (recomendado para Vite 8)
- npm 10+ (ou Bun)

## Executar localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (por padrão `http://localhost:3000`).

## Verificar o projeto

```bash
npm run lint
npm run build
npm run preview
```

## Publicar no GitHub

1. Crie um repositório no GitHub, por exemplo `ABNT-Galactico`.
2. Extraia este ZIP no computador.
3. Envie o conteúdo desta pasta para a raiz do repositório (incluindo `src/`, `package.json`, `index.html` e os arquivos de configuração).
4. Faça o commit inicial.

Não envie `node_modules/`, `dist/` nem arquivos `.env` com chaves privadas. O `.gitignore` já ignora esses itens.

## Publicar na Vercel

1. Importe o repositório GitHub na Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.

## Estrutura

```text
src/
  abnt/        Regras, formatação e conformidade ABNT
  components/ Componentes e telas da aplicação
  export/     Exportação para PDF, Word e pacote web
  storage/    Persistência local dos documentos
```

## Dados locais

Os identificadores de armazenamento existentes foram mantidos para preservar a compatibilidade com documentos e preferências já salvos no navegador. Limpar os dados do navegador pode apagar documentos armazenados localmente; mantenha cópias de segurança.

## Licença

Defina uma licença antes de distribuir ou aceitar contribuições. Este projeto não declara uma licença automaticamente.
