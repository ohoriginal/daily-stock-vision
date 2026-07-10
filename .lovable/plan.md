# Empacotar STOKMASTER para uso 100% offline

## O que já está pronto

- App inteiro roda no navegador, sem backend, sem Supabase, sem Firebase, sem API externa
- Dados salvos em `localStorage` via `src/lib/storage.ts`
- Backup/restauração em JSON já existe (`exportBackup` / `importBackup` em `/config`)

Só falta empacotar. Nada precisa ser removido do código (não há dependência de rede a limpar).

## 1. PWA instalável com Service Worker

**Instalo:** `vite-plugin-pwa` (dev dependency).

**Crio:**
- `public/manifest.webmanifest` — nome STOKMASTER, `display: standalone`, `theme_color` do tema dourado, `start_url: "/"`, `scope: "/"`
- Ícones PWA gerados via `imagegen`: 192×192, 512×512, e 512×512 maskable (fundo sólido dourado com logo "SM"), guardados como assets em `public/`
- `src/lib/pwa-register.ts` — wrapper com todas as guardas do skill Lovable (não registra em `id-preview--*`, `preview--*`, `*.lovableproject.com`, dev, iframe, `?sw=off`), usa `registerType: "autoUpdate"`
- Registro chamado de `src/start.ts` (só ativa em produção publicada)

**Configuro em `vite.config.ts`:**
- Plugin com `registerType: "autoUpdate"`, `injectRegister: null`, `devOptions: { enabled: false }`, `filename: "sw.js"`
- Runtime caching: `NetworkFirst` para navegações HTML, `CacheFirst` para assets hasheados same-origin, exclui `/~oauth`
- `precacheEntries` cobre todo o app-shell → funciona offline após primeira visita

**Head tags em `src/routes/__root.tsx`:** `<link rel="manifest">`, `apple-touch-icon`, `theme-color` já existe.

## 2. APK via PWABuilder

Não mexo em código nativo. Depois de publicar, você:

1. Abre `pwabuilder.com`
2. Cola `https://daily-stock-vision.lovable.app`
3. Baixa o pacote Android assinado (`.apk` + `.aab`)
4. Instala no celular

Vou incluir no `/config` um card "Instalar como app" com esse passo-a-passo e um botão que abre o PWABuilder já com a URL preenchida.

## 3. Electron para Windows (`.exe`)

Sigo o skill Electron do Lovable:

**Instalo (via `bun add -d`):** `electron`, `@electron/packager`.

**Crio:**
- `electron/main.cjs` — CommonJS, `BrowserWindow` 1200×800, carrega `dist/index.html` via `file://`, `contextIsolation: true`, `nodeIntegration: false`
- `electron/preload.cjs` — vazio (não precisa de bridge; localStorage funciona nativo no Electron)

**Ajusto:**
- `vite.config.ts`: adiciono `base: './'` (crítico, senão janela branca no `file://`)
- `package.json`: `"main": "electron/main.cjs"` + scripts `build:electron` e `pack:win`

**Persistência dos dados no Electron:**
- Chromium do Electron mantém `localStorage` no diretório de userData por padrão (`%APPDATA%/STOKMASTER/Local Storage/`). Dados persistem entre execuções automaticamente — nenhum código adicional necessário.
- Backup JSON continua funcionando idêntico (mesma tela `/config`).

**Empacoto no sandbox:**
```
npx @electron/packager . "STOKMASTER" \
  --platform=win32 --arch=x64 \
  --out=electron-release --overwrite \
  --ignore=node_modules --ignore=^/src --ignore=^/public --ignore=^/electron-release
```
Depois zipo em `/mnt/documents/STOKMASTER-windows-x64.zip` pra você baixar. Extrai → duplo clique em `STOKMASTER.exe`.

Aviso: no sandbox Linux não dá pra gerar instalador `.exe` (setup). O `.zip` extraído contém o executável funcional; não tem installer bonitinho, mas roda 100%.

## 4. Assets 100% offline

- Confirmo que não há `@import` de URL remota em `src/styles.css` nem `<link>` pra Google Fonts / CDN externa no `__root.tsx`
- Ícones da PWA e da Electron ficam em `public/` (não vão pra CDN de assets Lovable, senão o Electron não acha via `file://`)
- Todo import de imagem já é local

## 5. Aviso sobre migração de dados

Cada formato tem storage isolado (Chrome web ≠ Electron ≠ APK). Vou adicionar no `/config` um alerta claro: "Antes de instalar em outro dispositivo, exporte o backup JSON e importe no novo app."

## Arquivos alterados/criados

**Criar:**
- `public/manifest.webmanifest`
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` (via imagegen)
- `src/lib/pwa-register.ts`
- `electron/main.cjs`
- `electron/preload.cjs`

**Editar:**
- `vite.config.ts` — adicionar `vite-plugin-pwa` e `base: './'`
- `package.json` — adicionar `main`, scripts electron, deps
- `src/start.ts` — chamar `registerPWA()`
- `src/routes/__root.tsx` — `<link rel="manifest">` e ícones apple-touch
- `src/routes/config.tsx` — card "Instalar como app" com link PWABuilder e aviso de backup

## O que você recebe no final

1. App publicado com "Instalar" disponível no Chrome/Edge/Safari (celular e desktop)
2. Instruções + botão pra gerar o APK no PWABuilder
3. `STOKMASTER-windows-x64.zip` em `/mnt/documents/` pra baixar e rodar no Windows

Aprovo pra implementar?
