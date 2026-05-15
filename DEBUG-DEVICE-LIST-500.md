# Debug: 500 Internal Server Error no /device-list (Produção Vercel)

## Sintoma

`https://csdt.vercel.app/device-list` retorna 500. Outras páginas (dashboard, login) funcionam. Ambiente local (`next dev`) funciona normal (200).

## Causa raiz identificada

O `recharts` 3.8.1 usa `@reduxjs/toolkit` e `react-redux` como dependências internas obrigatórias. No build do Vercel (Next.js 15.5 + serverless Lambda), o bundler resolve `@reduxjs/toolkit` via condição `module` nos exports do package.json, que aponta para `dist/redux-toolkit.modern.mjs` (ESM). Esse arquivo **não é copiado** para o bundle da Lambda, resultando em:

```
Error: Cannot find module '/var/task/node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs'
    code: 'MODULE_NOT_FOUND'
    path: '/var/task/node_modules/@reduxjs/toolkit'
    page: '/device-list'
```

## Cadeia de imports

```
device-list.tsx
  → DeviceList.tsx
    → Analytics/Dashboard.tsx
      → import { BarChart, PieChart, ... } from 'recharts'
        → recharts/es6/state/store.js
          → import { configureStore } from '@reduxjs/toolkit'
        → recharts/es6/state/RechartsStoreProvider.js
          → import { Provider } from 'react-redux'
```

`recharts` importa `@reduxjs/toolkit` e `react-redux` em ~30 arquivos internos.

## O que já foi tentado

### 1. Adicionar `@reduxjs/toolkit` ao `package.json` (commit `0a98ddf`)
- Adicionado `"@reduxjs/toolkit": "^2.11.2"` em dependencies
- **Resultado**: Mesmo erro. O pacote é instalado mas o arquivo `.modern.mjs` não é incluído no bundle da Lambda.

### 2. Adicionar `react-redux` ao `package.json` (commit `f829725`)
- Adicionado `"react-redux": "^9.2.0"` em dependencies
- **Resultado**: Mesmo erro.

### 3. `transpilePackages` no next.config.js (commit `ac81e34`)
```js
transpilePackages: ['recharts', '@reduxjs/toolkit', 'react-redux'],
```
- **Resultado**: Erro DIFERENTE. O build quebrou na fase "Collecting page data":
  ```
  TypeError: (0 , c(...).createSlice) is not a function
  ```
  Problema de interop CJS/ESM: o `recharts/lib/` usa `require("@reduxjs/toolkit")` (CJS), mas ao transpilar o pacote ESM, os exports não batem.

### 4. Webpack alias para forçar CJS (commit `7352105`)
```js
webpack: (config) => {
  config.resolve.alias['@reduxjs/toolkit'] = path.resolve(__dirname, 'node_modules/@reduxjs/toolkit/dist/cjs/index.js');
  return config;
}
```
- **Resultado**: Build ainda em andamento quando a sessão foi interrompida. Status: estava em "Creating an optimized production build..." há ~1min.

## Estado atual do package.json

```json
"dependencies": {
  "@reduxjs/toolkit": "^2.11.2",
  "react-redux": "^9.2.0",
  "recharts": "^3.8.1",
  ...
}
```

## Estado atual do next.config.js

```js
const path = require('path');
const nextConfig = {
  reactStrictMode: true,
  env: {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS
  },
  webpack: (config) => {
    config.resolve.alias['@reduxjs/toolkit'] = path.resolve(__dirname, 'node_modules/@reduxjs/toolkit/dist/cjs/index.js');
    return config;
  }
};
module.exports = nextConfig;
```

## Possíveis próximas abordagens

### A) Verificar se o webpack alias (tentativa 4) funcionou
Rodar `npx vercel list` pra ver se o deploy `csdt-qqx19mix3` finalizou como Ready ou Error.
Se Ready: testar `curl https://csdt.vercel.app/device-list`
Se Error: pegar logs com `npx vercel inspect https://csdt-qqx19mix3-vandersons-projects-6b7a3afd.vercel.app --logs`

### B) Downgrade do recharts para v2.x
A v2.x não usava `@reduxjs/toolkit` internamente. Mas pode quebrar a API de componentes.

### C) `outputFileTracingIncludes` no next.config.js
Forçar Next.js a incluir o arquivo `.modern.mjs` no bundle:
```js
outputFileTracingIncludes: {
  '/device-list': ['./node_modules/@reduxjs/toolkit/**/*'],
  '/_next/data/**/device-list.json': ['./node_modules/@reduxjs/toolkit/**/*'],
}
```

### D) `serverExternalPackages` (experimental)
Tentar externalizar os pacotes em vez de empacotá-los:
```js
serverExternalPackages: ['@reduxjs/toolkit', 'react-redux'],
```
(Opção pode ter nome diferente no Next.js 15.5 — verificar docs)

### E) Alias também para `react-redux` no webpack
Já que recharts também precisa de `react-redux`:
```js
config.resolve.alias['react-redux'] = path.resolve(__dirname, 'node_modules/react-redux/dist/react-redux.js');
```

### F) Configurar `experimental.esmExternals`
```js
experimental: {
  esmExternals: 'loose'
}
```

## Comandos úteis

```bash
# Ver status dos deploys
npx vercel list

# Logs de build (substituir URL pelo deploy atual)
npx vercel inspect https://csdt-XXXXX-vandersons-projects-6b7a3afd.vercel.app --logs

# Logs de runtime (erros em produção)
npx vercel logs --query "device-list" --level error --since 1h --expand

# Testar endpoint
curl -s -o NUL -w "%{http_code}" https://csdt.vercel.app/device-list

# Build local
npx next build
```
