# ABNT GALÁCTICO

**EDITOR ACADÊMICO INTELIGENTE**

> Seu conhecimento. Sua missão. Seu trabalho nas normas ABNT.

O ABNT GALÁCTICO é um editor para criação, organização, edição, formatação e exportação de trabalhos acadêmicos.

## Importante: repositório GitHub x aplicação publicada

A página principal de um repositório GitHub mostra os arquivos do código. Ela não executa automaticamente a aplicação React. Para abrir o editor como um site, publique-o pelo **GitHub Pages** seguindo os passos abaixo.

## Publicar automaticamente no GitHub Pages

1. Envie todo o conteúdo deste projeto para a raiz do repositório (não envie a pasta externa `ABNT-Galactico` como uma subpasta).
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment → Source**, selecione **GitHub Actions**.
4. Abra a aba **Actions** e aguarde o workflow **Publicar ABNT Galáctico no GitHub Pages** terminar com sucesso.
5. O endereço do site aparecerá em **Settings → Pages**. Normalmente será `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.

O Vite já está configurado para gerar os caminhos corretos dos arquivos quando o projeto é publicado em um repositório GitHub Pages.

## Executar localmente

Requisitos: Node.js 22 (recomendado) e npm.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:3000`.

## Verificar o projeto

```bash
npm run lint
npm run build
npm run preview
```

## Publicar na Vercel

1. Importe o repositório GitHub na Vercel.
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.

## Estrutura

```text
src/
  abnt/        Regras, formatação e conformidade ABNT
  components/  Componentes e telas da aplicação
  export/      Exportação para PDF, Word e pacote web
  storage/     Persistência local dos documentos
.github/
  workflows/   Verificação e publicação automatizada
```

## Dados locais e privacidade

Os identificadores de armazenamento existentes foram mantidos para preservar a compatibilidade com documentos e preferências já salvos no navegador. Os documentos são armazenados localmente neste navegador; limpar os dados do navegador pode apagá-los. Faça cópias de segurança regularmente.

Não envie `node_modules/`, `dist/` nem arquivos `.env` com chaves privadas para o GitHub. O `.gitignore` ignora esses itens.

## Licença

Defina uma licença antes de distribuir ou aceitar contribuições. Este projeto não declara uma licença automaticamente.
