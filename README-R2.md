# Publicando o álbum no Cloudflare R2

As fotos e vídeos convertidos (~1,78 GB) não cabem no repositório nem no bundle
da Vercel. Eles vão para um bucket R2, e o site passa a apontar para as URLs
públicas dele. O `manifest.json` (107 KB) é a única coisa que fica versionada.

O plano gratuito do R2 dá 10 GB de armazenamento e **egress zero** — este álbum
usa 1,78 GB, então o custo é R$ 0.

## 1. Criar o bucket

1. Crie uma conta em <https://dash.cloudflare.com> (gratuita).
2. No menu lateral, **R2 Object Storage** → **Create bucket**.
3. Nome: `japan-album` (ou outro; guarde o nome).
4. Location: **Automatic**.

## 2. Tornar o bucket público

Sem isso o navegador não consegue baixar as imagens.

1. Abra o bucket → aba **Settings**.
2. Em **Public access** → **R2.dev subdomain** → **Enable**.
3. Copie a URL que aparece, algo como `https://pub-<hash>.r2.dev`.

> Essa é a URL pública de desenvolvimento do R2. Se depois quiser um domínio
> próprio, basta trocar o valor de `MEDIA_BASE_URL` — o `next.config.ts` lê o
> hostname dessa variável e libera automaticamente no `next/image`.

## 3. Gerar o token de API

1. Na tela do R2, **API** → **Manage API tokens** → **Create API token**.
2. Permissão: **Object Read & Write**.
3. Escopo: apenas o bucket criado acima.
4. Copie os três valores mostrados — o **Secret Access Key** só aparece uma vez:
   - Access Key ID
   - Secret Access Key
   - Account ID (aparece na URL do painel e no topo da página do R2)

## 4. Preencher o `.env.local`

Acrescente ao arquivo que já existe na raiz do projeto:

```ini
R2_ACCOUNT_ID="seu-account-id"
R2_ACCESS_KEY_ID="seu-access-key-id"
R2_SECRET_ACCESS_KEY="seu-secret-access-key"
R2_BUCKET="japan-album"
MEDIA_BASE_URL="https://pub-<hash>.r2.dev"
```

O `.env.local` está no `.gitignore` — essas credenciais não vão para o Git.

## 5. Subir os arquivos

```bash
node scripts/publish-r2.mjs
```

São ~1.564 objetos e 1,78 GB, então leva um tempo dependendo da sua conexão. O
script é **retomável**: ele verifica o que já está no bucket e pula, então pode
interromper e rodar de novo à vontade. Se algum objeto falhar, ele sai com erro
e basta rodar de novo para tentar só os que faltaram.

Ao final ele grava `src/data/album-manifest.json` — **esse arquivo precisa ser
commitado**, é o índice que o site lê em produção.

## 6. Configurar a Vercel

No projeto da Vercel, **Settings** → **Environment Variables**, adicione:

| Nome | Valor |
| --- | --- |
| `MEDIA_BASE_URL` | `https://pub-<hash>.r2.dev` |

Só essa. As credenciais do R2 são usadas apenas no upload local, nunca em
runtime — o site só lê URLs públicas.

Não defina `ALBUM_MEDIA_DIR` na Vercel. Ela existe apenas para o
desenvolvimento local ler o disco.

## Como as peças se encaixam

| Ambiente | Índice | Bytes |
| --- | --- | --- |
| Local (`npm run dev`) | `ALBUM_MEDIA_DIR/manifest.json` | `/api/media/...` lendo o disco |
| Vercel | `src/data/album-manifest.json` (bundle) | R2, via `MEDIA_BASE_URL` |

Localmente o índice vem do disco para que novas conversões apareçam sem
republicar. Em produção vem do bundle, porque não existe diretório de mídia.

## Fluxo completo, do zero

```bash
node scripts/ingest-album.mjs     # Takeout -> JPEG/MP4 + manifest.json
node scripts/geocode-manifest.mjs # opcional: adiciona a cidade em cada item
node scripts/publish-r2.mjs       # sobe para o R2 + grava o manifest versionado
git add src/data/album-manifest.json && git commit -m "Atualiza álbum"
```
