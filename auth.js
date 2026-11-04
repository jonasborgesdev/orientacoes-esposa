// Desbloqueia a página: deriva a chave da senha (PBKDF2) e decifra o conteúdo
// (AES-GCM) no navegador. Sem a senha certa, o texto nem chega a ser decifrado.

const ITER = 100000;

const $ = (id) => document.getElementById(id);

function bytesFromB64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function decifrar(senha, arquivo) {
  const salt = bytesFromB64(arquivo.salt);
  const iv = bytesFromB64(arquivo.iv);
  const data = bytesFromB64(arquivo.data);

  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(senha),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const chave = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: arquivo.iter, hash: arquivo.hash },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const texto = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, chave, data);
  return new TextDecoder().decode(texto);
}

async function desbloquear(senha) {
  const res = await fetch("conteudo.enc", { cache: "no-store" });
  if (!res.ok) throw new Error("arquivo não encontrado");
  const arquivo = await res.json();
  return decifrar(senha, arquivo);
}

function mostrarConteudo(html) {
  $("tela-senha").hidden = true;
  const alvo = $("conteudo");
  alvo.hidden = false;
  alvo.innerHTML = html;
}

async function iniciar() {
  $("form-senha").addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const senha = $("senha").value;
    const botao = evento.target.querySelector("button");
    botao.disabled = true;
    $("erro").hidden = true;
    $("carregando").hidden = false;
    try {
      const html = await desbloquear(senha);
      mostrarConteudo(html);
    } catch {
      $("erro").hidden = false;
      $("senha").value = "";
      $("senha").focus();
    } finally {
      botao.disabled = false;
      $("carregando").hidden = true;
    }
  });
}

iniciar();
