# Orientações (página protegida por senha)

Página simples com as orientações de preenchimento dos dados da especialista
(esposa do Jonas), publicada no GitHub Pages com **conteúdo cifrado (AES-GCM)**.
Quem não tem a senha não consegue ler o conteúdo, mesmo baixando o arquivo.

## Como funciona a segurança

- O texto vive em `conteudo.src.html` (texto claro) na sua máquina/repo **privado**.
- `node build.js` cifra esse texto com uma chave derivada da senha (PBKDF2 + AES-GCM 256)
  e gera `conteudo.enc` (letra embaralhada, sem sentido).
- O site publicado serve só: `index.html` + `auth.js` + `style.css` + `conteudo.enc`.
  **O `conteudo.src.html` NUNCA é publicado** (o deploy publica uma pasta `dist/`
  sem ele).
- Quem abrir o site digita a senha; o navegador decifra na hora e mostra o texto.
  Erra a senha, não vê nada.

**A segurança depende da senha.** Use pelo menos 8 caracteres com letra e número.

## Como editar o conteúdo

1. Edite `conteudo.src.html` (local ou pelo GitHub, repo privado).
2. Rode na sua máquina: `node build.js` e digite a senha.
3. Faça o commit e o push de `conteudo.src.html` e `conteudo.enc`.
4. O deploy automático publica a versão nova.

## Como trocar a senha

Rode `node build.js` de novo e digite a **senha nova**. O `conteudo.enc` atualizado
é commitado junto. A senha antiga para de funcionar na hora (o arquivo novo usa
outra chave).

## O que é publicado (e o que não é)

| Arquivo | No site? |
|---|---|
| `index.html`, `auth.js`, `style.css` | sim (código da tela de senha) |
| `conteudo.enc` | sim (conteúdo cifrado) |
| `conteudo.src.html` | **nunca** (texto claro, fica no repo privado) |

## Riscos conhecidos (honestidade)

- A senha é a única chave: se vazar, o conteúdo vaza (troque a senha rodando o build).
- O GitHub Pages é público e a URL é descobrível; a proteção é a cifra, não a URL.
- Não é contabilidade de acesso: não há log de quem abriu. Se um dia precisar disso,
  aí vale uma opção com servidor (Edge Function no Supabase).
