#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DOCUMENTO = 'REGRAS-DE-NEGOCIO.md';
const SECOES = { execucao: 'Convenções de datas e tempo' };

function normalizar(texto) {
  return texto.replace(/\s+/g, '');
}

function secao(texto, titulo) {
  const cabecalho = '## ' + titulo;
  const linhas = texto.split(/\r?\n/);
  const inicio = linhas.indexOf(cabecalho);
  if (inicio < 0) return '';
  const fim = linhas.findIndex((linha, indice) => indice > inicio && /^## /.test(linha));
  return normalizar(linhas.slice(inicio + 1, fim < 0 ? undefined : fim).join('\n'));
}

function grupos(arquivo) {
  if (arquivo === 'package.json' || /^\.github\/workflows\/.*\.yml$/.test(arquivo) ||
      arquivo === 'ferramentas/verificar-regras.js' ||
      /^(?:engine|regras|datas)\.js$/.test(arquivo)) return ['execucao'];
  return [];
}

function verificar(raiz, base) {
  const git = (...args) => execFileSync('git', args, {
    cwd: raiz, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']
  });
  const referencia = base ? git('merge-base', 'HEAD', base).trim() : git('rev-parse', 'HEAD').trim();
  const antigos = new Set(git('ls-tree', '-r', '--name-only', '-z', referencia).split('\0').filter(Boolean));
  const arquivos = new Set([
    ...git('diff', '--name-only', '--no-renames', '-z', referencia, '--').split('\0'),
    ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0')
  ].filter(Boolean));
  const lerAntes = (arquivo) => antigos.has(arquivo) ? git('show', referencia + ':' + arquivo) : '';
  const lerDepois = (arquivo) => fs.existsSync(path.join(raiz, arquivo))
    ? fs.readFileSync(path.join(raiz, arquivo), 'utf8') : '';
  const documento = lerDepois(DOCUMENTO);
  const anterior = lerAntes(DOCUMENTO);
  const falhas = [];

  for (const [grupo, titulo] of Object.entries(SECOES)) {
    if (!secao(documento, titulo)) falhas.push(DOCUMENTO + ': seção ausente ou vazia: ' + titulo + '.');
    const afetados = Array.from(arquivos).filter((arquivo) => grupos(arquivo).includes(grupo));
    if (afetados.length && secao(anterior, titulo) === secao(documento, titulo)) {
      falhas.push('Atualize a seção "' + titulo + '" de ' + DOCUMENTO +
        ' para explicar a decisão ou a ausência de mudança de critério.\n  Arquivos: ' + afetados.join(', '));
    }
  }
  return falhas;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Uso: npm run verificar-regras [-- --base origin/main]\n' +
      'Sem --base: alterações locais em relação ao HEAD (inclui staged e arquivos novos).\n' +
      'Com --base: toda a branch desde o ancestral comum, mais alterações locais.');
    return;
  }
  if (args.length && (args.length !== 2 || args[0] !== '--base' || !args[1] || args[1].startsWith('-'))) {
    throw new Error('Argumentos inválidos. Use --help.');
  }
  const falhas = verificar(path.resolve(__dirname, '..'), args[1]);
  if (falhas.length) {
    console.error(falhas.join('\n'));
    process.exitCode = 1;
  } else console.log('Regras de negócio: documentação presente e seções afetadas atualizadas.');
}

if (require.main === module) {
  try { main(); } catch (erro) {
    console.error('Falha ao verificar regras: ' + erro.message);
    process.exitCode = 1;
  }
}
module.exports = { verificar, grupos, secao };
