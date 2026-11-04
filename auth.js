// Desbloqueia a página (PBKDF2 + AES-GCM), injeta o conteúdo e liga o
// formulário de respostas: salvamento automático no aparelho, copiar,
// baixar arquivo e copiar o prompt da IA.

const ITER = 100000;
const CHAVE_STORAGE = "orientacoes:respostas";

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
  ligarFormulario();
}

async function copiarTexto(texto) {
  // API moderna (funciona em HTTPS, que é o caso do Pages)
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Fallback: textarea + execCommand (compatível com navegadores mais antigos)
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, texto.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

function avisoDeAcao(mensagem) {
  const alvo = $("aviso-acao");
  if (!alvo) return;
  alvo.textContent = mensagem;
  alvo.hidden = false;
  setTimeout(() => {
    alvo.hidden = true;
  }, 4000);
}

const ROTULOS = {
  "b1-nome": "Nome completo",
  "b1-assinatura": "Assinatura (curta)",
  "b1-cidade": "Cidade/estado",
  "b1-titulo": "Título profissional",
  "b1-foto": "Foto",
  "b2-graduacao": "Graduação",
  "b2-pos": "Pós/especialização",
  "b2-cursos": "Cursos complementares",
  "b2-certificacao": "Certificação",
  "b2-registro": "Registro em conselho",
  "b3-anos": "Anos de prática",
  "b3-onde": "Onde atuou/atuou",
  "b3-faixa": "Faixa de idade",
  "b3-resumo": "O que faz e diferencial",
  "b4-autoriza": "Autoriza publicar?",
  "b4-assinatura": "Assinatura nos artigos",
  "b4-ritmo": "Ritmo de revisão",
  "b4-horario": "Melhor dia/horário",
  "b4-celular": "Recebe no celular?",
  "b5-tom": "Confirma tom e regras",
  "b5-aprovacao": "Confirma aprovação prévia",
};

const BLOCOS = [
  ["Bloco 1: Identificação", ["b1-nome", "b1-assinatura", "b1-cidade", "b1-titulo", "b1-foto"]],
  ["Bloco 2: Formação", ["b2-graduacao", "b2-pos", "b2-cursos", "b2-certificacao", "b2-registro"]],
  ["Bloco 3: Experiência", ["b3-anos", "b3-onde", "b3-faixa", "b3-resumo"]],
  ["Bloco 4: Autoridade, revisão e ritmo", ["b4-autoriza", "b4-assinatura", "b4-ritmo", "b4-horario", "b4-celular"]],
  ["Bloco 5: Regras editoriais", ["b5-tom", "b5-aprovacao"]],
];

function ligarFormulario() {
  const campos = Array.from(document.querySelectorAll("[data-campo]"));
  if (campos.length === 0) return;

  // Restaura o que já foi digitado neste aparelho
  let salvo = {};
  try {
    salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE) || "{}");
  } catch {
    salvo = {};
  }
  for (const campo of campos) {
    const valor = salvo[campo.dataset.campo];
    if (valor) campo.value = valor;
  }
  const status = $("status-salvo");
  if (status && Object.keys(salvo).length > 0) {
    status.textContent = "Continuando de onde você parou (respostas salvas neste aparelho).";
  }

  // Salva automático enquanto digita
  let timer;
  const salvar = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const dados = {};
      for (const campo of campos) dados[campo.dataset.campo] = campo.value;
      try {
        localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
        if (status) {
          status.textContent = `Salvo automaticamente neste aparelho às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`;
        }
      } catch {
        if (status) status.textContent = "Não foi possível salvar neste navegador (modo privado?).";
      }
    }, 400);
  };
  for (const campo of campos) campo.addEventListener("input", salvar);

  const montarTexto = () => {
    const linhas = [
      `Respostas da especialista para o site (gerado em ${new Date().toLocaleDateString("pt-BR")})`,
      "",
    ];
    let algum = false;
    for (const [titulo, chaves] of BLOCOS) {
      const itens = chaves.filter((k) => (salvoLocal(k) ?? "").trim());
      if (itens.length === 0) continue;
      algum = true;
      linhas.push(titulo);
      for (const k of itens) {
        linhas.push(`${ROTULOS[k]}: ${salvoLocal(k).trim()}`);
      }
      linhas.push("");
    }
    return algum ? linhas.join("\n") : null;
  };

  const salvoLocal = (chave) => {
    const campo = campos.find((c) => c.dataset.campo === chave);
    return campo ? campo.value : "";
  };

  const btnCopiar = $("btn-copiar");
  if (btnCopiar) {
    btnCopiar.addEventListener("click", async () => {
      const texto = montarTexto();
      if (!texto) {
        avisoDeAcao("Nenhuma resposta preenchida ainda.");
        return;
      }
      try {
        const ok = await copiarTexto(texto);
        avisoDeAcao(
          ok
            ? "Copiado! Agora é só colar no WhatsApp ou e-mail do Jonas."
            : "Não deu pra copiar neste navegador. Use 'Baixar arquivo'."
        );
      } catch {
        avisoDeAcao("Não deu pra copiar neste navegador. Use 'Baixar arquivo'.");
      }
    });
  }

  const btnBaixar = $("btn-baixar");
  if (btnBaixar) {
    btnBaixar.addEventListener("click", () => {
      const texto = montarTexto();
      if (!texto) {
        avisoDeAcao("Nenhuma resposta preenchida ainda.");
        return;
      }
      const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respostas-esposa-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      avisoDeAcao("Arquivo baixado! Mande pro Jonas pelo WhatsApp ou e-mail.");
    });
  }

  const btnLimpar = $("btn-limpar");
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      if (!confirm("Apagar todas as respostas digitadas neste aparelho?")) return;
      try {
        localStorage.removeItem(CHAVE_STORAGE);
      } catch {
        // segue
      }
      for (const campo of campos) campo.value = "";
      if (status) status.textContent = "";
      avisoDeAcao("Tudo apagado.");
    });
  }

  const btnPrompt = $("btn-prompt");
  if (btnPrompt) {
    btnPrompt.addEventListener("click", async () => {
      const pre = $("texto-prompt");
      if (!pre) return;
      try {
        const ok = await copiarTexto(pre.textContent);
        avisoDeAcao(
          ok
            ? "Prompt copiado! Cole numa IA (ChatGPT, Gemini, Copilot)."
            : "Não deu pra copiar. Selecione o texto do prompt manualmente."
        );
      } catch {
        avisoDeAcao("Não deu pra copiar. Selecione o texto do prompt manualmente.");
      }
    });
  }
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
