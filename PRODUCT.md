# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Usuária primária**: esposa do Jonas (pedagoga e terapeuta ABA). Usa o celular,
  pode preencher em dias diferentes e não é usuária técnica.
- **Usuário secundário (receptor)**: Jonas, que recebe as respostas pelo WhatsApp
  e usa os dados pra publicar autoridade no site.

## Product Purpose

Coletar os dados profissionais reais da especialista (identificação, formação,
experiência, combinados de revisão e regras editoriais) pra montar a página
"Sobre a especialista" e o selo "Revisado por especialista" do site de autismo/ABA.
Sucesso = ela preenche sem frustração, em quantas sessões precisar, e o Jonas
recebe tudo organizado com um clique de envio.

## Positioning

Página privada sem servidor: o conteúdo é cifrado (AES-GCM, chave derivada da
senha com PBKDF2) e só se abre com a senha; o texto claro nunca é publicado.
Mecanismo que um site estático comum não copia sem reimplementar a cifra.

## Operating Context

- GitHub Pages (site estático, repo público, free tier, sem custo).
- Uso em celular (iOS/Android), navegador do sistema.
- Salvamento local no aparelho (localStorage): campos, etapa atual e foto.
- Envio final por WhatsApp com um clique (mensagem formatada pronta);
  copiar e baixar arquivo são alternativas.
- Ajuda opcional por IA (prompt pronto) e revisão por checklist.
- Conteúdo em pt-BR; senha definida e digitada pelo dono no build (nunca em arquivo).

## Capabilities and Constraints

- Tela de senha → conteúdo cifrado → preenchimento em 5 etapas + tela de envio.
- Autosave por campo com aviso, retomada da etapa em outro dia.
- Foto por arquivo com preview e redimensionamento local (máx. 1000px, JPEG).
- Botão WhatsApp (`wa.me/5524999660042`), copiar, baixar .txt + foto, limpar tudo.
- Sem backend, sem banco, sem conta, sem terceiros recebendo dado.
- Restrição de conteúdo: nunca inventar formação, certificação, registro ou anos;
  dado não confirmado fica de fora do site.
- A senha é a única chave (exigir 8+ caracteres com letra e número).

## Brand Commitments

- Referência visual vinculante declarada pelo dono: **site da Apple** (estética)
  e **usabilidade do aplicativo da Nubank** (fluxo mobile, clareza, ações grandes).
- Voz: acolhedor, direto, sem jargão; linguagem respeitosa ("pessoa autista").
- Nome do produto (interno): "Orientações" (título da página).

## Evidence on Hand

- `conteudo.src.html`: script real de credenciais (5 blocos + checklist + prompt).
- Número de WhatsApp do receptor configurado (5524999660042).
- Testes executados em navegador: senha, etapas, autosave, foto, cópia, URL do WhatsApp.
- Ausências que não devem ser fabricadas: sem analytics, sem log de acesso,
  sem dados de uso, sem imagens de marca próprias.

## Product Principles

1. Nada de servidor: tudo que é preciso cabe no navegador dela.
2. Nunca inventar dado profissional; o vazio é publicado como vazio.
3. Ela nunca perde o que digitou (salva sozinho, retoma em outro dia).
4. O envio é um toque; o resto é alternativa.
5. Segurança honesta: cifra real, senha fraca não protege nada.

## Accessibility & Inclusion

- Requisito não estabelecido pelo dono (registrar como aberto): uso normal de
  navegador mobile, sem leitor de tela confirmado. Trabalhar com contraste,
  alvos de toque grandes e foco visível por padrão.
