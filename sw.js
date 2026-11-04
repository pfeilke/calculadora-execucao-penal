'use strict';

var CACHE = 'calculadora-execucao-penal-v4';
var ARQUIVOS = [
  './',
  './index.html',
  './ferramentas.html',
  './ferramentas.css',
  './ferramentas-ui.js',
  './ferramentas-rapidas.js',
  './importar.html',
  './importacao.css',
  './importacao.js',
  './ui-importacao.js',
  './radar-importacoes.js',
  './radar.html',
  './radar.js',
  './radar-ui.js',
  './radar.css',
  './copilot.js',
  './calcpenal-copilot-v1.schema.json',
  './vendor/pdfjs/pdf.mjs',
  './vendor/pdfjs/pdf.worker.mjs',
  './regras.js',
  './catalogo-tipos.js',
  './projecao-ui.js',
  './docs/legislacao/catalogo-tipos-conferido.json',
  './datas.js',
  './engine.js',
  './explicador.js',
  './antecedentes.js',
  './ui.js',
  './calc.css',
  './compartilhado.css',
  './execucao.css',
  './compartilhado.js',
  './tema.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon16.png',
  './icons/icon32.png',
  './icons/icon48.png',
  './icons/icon128.png',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './icons/logo-dpesp.png',
  './fonts/figtree-latin-wght-normal.woff2'
];

self.addEventListener('install', function (evento) {
  evento.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(ARQUIVOS.map(function (arquivo) {
      return new URL(arquivo, self.registration.scope).href;
    }));
  }).then(function () {
    return self.skipWaiting();
  }));
});

self.addEventListener('activate', function (evento) {
  evento.waitUntil(caches.keys().then(function (chaves) {
    return Promise.all(chaves.filter(function (chave) {
      return chave.indexOf('calculadora-execucao-penal-') === 0 && chave !== CACHE;
    }).map(function (chave) { return caches.delete(chave); }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener('fetch', function (evento) {
  var requisicao = evento.request;
  var url = new URL(requisicao.url);
  if (requisicao.method !== 'GET' || url.origin !== self.location.origin) return;

  evento.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(requisicao).then(function (resposta) {
      if (resposta) return resposta;
      return fetch(requisicao).then(function (respostaRede) {
        if (!respostaRede.ok) return respostaRede;
        return cache.put(requisicao, respostaRede.clone()).then(function () { return respostaRede; });
      }).catch(function () {
        if (requisicao.mode === 'navigate') {
          return cache.match(new URL('./index.html', self.registration.scope).href);
        }
        return Response.error();
      });
    });
  }));
});
