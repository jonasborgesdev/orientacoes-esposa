# Orientações (página protegida por senha)

**Status (05/11/2026): publicado e cifrado com a senha real do dono.**
URL: `https://jonasborgesdev.github.io/orientacoes-esposa/`
Fluxo: a esposa preenche (5 etapas, salvas no aparelho) e envia em 1 toque no
WhatsApp (5524999660042). O `.enc` em produção NÃO é o de teste.

Página simples com as orientações de preenchimento dos dados da especialista
(esposa do Jonas), publicada no GitHub Pages com **conteúdo cifrado (AES-GCM)**.
Quem não tem a senha não consegue ler o conteúdo, mesmo baixando o arquivo.

> **Repo público**: obrigatório (GitHub Pages não roda em repo privado no plano
> Free do GitHub). Por isso o texto claro fica **fora do Git**, só na sua máquina.

## Como funciona a segurança

- O texto vive em `conteudo.src.html` (texto claro) **na sua máquina, no
  `.gitignore`**. Ele nunca é commitado nem publicado.
- `node build.js` cifra esse texto com uma chave derivada da senha (PBKDF2 100k +
  AES-GCM 256) e gera `conteudo.enc` (letra embaralhada, sem sentido).
- O site publicado serve só: `index.html` + `auth.js` + `style.css` + `conteudo.enc`
  (o workflow do Pages copia arquivo por arquivo pra `dist/`, então o `.src` não
  tem como vazar).
- Quem abrir o site digita a senha; o navegador decifra na hora e mostra o texto.
  Erra a senha, não vê nada.

**A segurança depende da senha.** Use pelo menos 8 caracteres com letra e número.

## Como editar o conteúdo

1. Edite `conteudo.src.html` (sempre local; se perder o arquivo, você recupera o
   texto decifrando o `conteudo.enc` com a senha).
2. Rode na sua máquina: `node build.js` e digite a senha.
3. Faça o commit e o push de `conteudo.enc` (o `.src` é ignorado pelo Git).
4. O deploy automático publica a versão nova.

## Se mudar `style.css` ou `auth.js`

Incremente o `?v=` na referência do `index.html` (ex.: `style.css?v=5` → `?v=6`).
Isso força o navegador a baixar a versão nova em vez de servir a antiga do cache
(a Sheila pode ter a página em cache no celular).

## Número do WhatsApp (botão de envio)

O botão "Enviar no WhatsApp" usa o número configurado no `conteudo.src.html`, no
atributo `data-numero` do botão (formato internacional, só dígitos: `55` + DDD +
número, ex.: `5524999660042`). Para trocar: edite o arquivo e refaça o build.

## Como trocar a senha

Rode `node build.js` de novo e digite a **senha nova**. O `conteudo.enc` atualizado
é commitado junto. A senha antiga para de funcionar na hora (o arquivo novo usa
outra chave).

## O que é publicado (e o que não é)

| Arquivo | No site? | No Git? |
|---|---|---|
| `index.html`, `auth.js`, `style.css` | sim (código da tela de senha) | sim |
| `conteudo.enc` | sim (conteúdo cifrado) | sim |
| `conteudo.src.html` | **nunca** | **nunca** (gitignore, só local) |
| `build.js`, `README.md` | não | sim (repo público) |

## Riscos conhecidos (honestidade)

- A senha é a única chave: se vazar, o conteúdo vaza (troque a senha rodando o build).
- O GitHub Pages é público e a URL é descobrível; a proteção é a cifra, não a URL.
- Sem senha forte, a cifra não serve: 8+ caracteres com letra e número.
- Não há log de quem abriu. Se um dia precisar disso, aí vale uma opção com
  servidor (Edge Function no Supabase).
