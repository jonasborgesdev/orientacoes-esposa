// Cifra conteudo.src.html -> conteudo.enc (AES-GCM 256, chave derivada da senha
// com PBKDF2). Rode na sua máquina, digitando a senha no prompt:
//
//   node build.js
//
// O .enc é o que vai pro site (ilegível sem a senha). O .src fica no repo
// PRIVADO e NUNCA é publicado (o deploy publica só os arquivos públicos).

import { readFile, writeFile } from "node:fs/promises";
import { stdin, stdout } from "node:process";

const ITER = 100000;
const SRC = "conteudo.src.html";
const OUT = "conteudo.enc";

function lerSenha(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let senha = "";
    const onData = (chunk) => {
      for (const c of chunk) {
        if (c === "\n" || c === "\r" || c === "\u0004") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          stdout.write("\n");
          resolve(senha);
          return;
        }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f" || c === "\b") senha = senha.slice(0, -1);
        else senha += c;
      }
    };
    stdin.on("data", onData);
  });
}

function b64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function main() {
  const senha = await lerSenha("Senha do site: ");
  if (senha.length < 8) {
    console.error("Use uma senha com pelo menos 8 caracteres.");
    process.exit(1);
  }

  const texto = await readFile(SRC, "utf8");
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const base = await crypto.subtle.importKey(
    "raw",
    encoder.encode(senha),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const chave = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    encoder.encode(texto)
  );

  const payload = {
    kdf: "PBKDF2",
    hash: "SHA-256",
    iter: ITER,
    salt: b64(salt),
    iv: b64(iv),
    data: b64(new Uint8Array(cifrado)),
  };
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Cifrado: ${SRC} -> ${OUT} (${texto.length} caracteres, AES-GCM 256)`);
  console.log("Agora faça o commit do conteudo.enc e publique.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
