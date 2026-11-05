// Desbloqueia a página (PBKDF2 + AES-GCM), injeta o conteúdo e controla:
// etapas com progresso salvo, formulário com salvamento automático no aparelho,
// foto (redimensionada e salva localmente), copiar/baixar e prompt da IA.

const ITER = 100000;
const CHAVE_RESPOSTAS = "orientacoes:respostas";
const CHAVE_STEP = "orientacoes:step";
const CHAVE_FOTO = "orientacoes:foto";

const $ = (id) => document.getElementById(id);

const NOMES_ETAPAS = {
  1: "Identificação",
  2: "Formação",
  3: "Experiência",
  4: "Autoridade e revisão",
  5: "Regras editoriais",
  6: "Envio",
};

const ROTULOS = {
  "b1-nome": "Nome completo",
  "b1-assinatura": "Assinatura (curta)",
  "b1-cidade": "Cidade/estado",
  "b1-titulo": "Título profissional",
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
  ["Bloco 1: Identificação", ["b1-nome", "b1-assinatura", "b1-cidade", "b1-titulo"]],
  ["Bloco 2: Formação", ["b2-graduacao", "b2-pos", "b2-cursos", "b2-certificacao", "b2-registro"]],
  ["Bloco 3: Experiência", ["b3-anos", "b3-onde", "b3-faixa", "b3-resumo"]],
  ["Bloco 4: Autoridade, revisão e ritmo", ["b4-autoriza", "b4-assinatura", "b4-ritmo", "b4-horario", "b4-celular"]],
  ["Bloco 5: Regras editoriais", ["b5-tom", "b5-aprovacao"]],
];

/* ---------- criptografia ---------- */

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

/* ---------- utilitários ---------- */

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // fallback pra navegadores/contextos sem permissão da API moderna
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
  }, 5000);
}

function lerStorage(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarStorage(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
    return true;
  } catch {
    return false;
  }
}

function apagarStorage(chave) {
  try {
    localStorage.removeItem(chave);
  } catch {
    // segue
  }
}

/* ---------- etapas (steps) ---------- */

function ligarEtapas() {
  const steps = Array.from(document.querySelectorAll(".step"));
  if (steps.length === 0) return;

  const barra = $("barra-preenchida");
  const rotulo = $("etapa-atual");
  const total = 5;

  const irPara = (numero) => {
    const n = Math.min(Math.max(Number(numero) || 1, 1), steps.length);
    for (const step of steps) {
      step.classList.toggle("ativo", Number(step.dataset.step) === n);
    }
    if (barra) barra.style.width = `${Math.min(n, total) * (100 / total)}%`;
    if (rotulo) {
      rotulo.textContent =
        n >= 6
          ? "Etapa concluída: revise e envie as respostas"
          : `Etapa ${n} de ${total}: ${NOMES_ETAPAS[n] ?? ""}`;
    }
    gravarStorage(CHAVE_STEP, String(n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  document.addEventListener("click", (evento) => {
    const alvo = evento.target;
    if (!(alvo instanceof HTMLElement)) return;
    if (alvo.dataset.proximo) irPara(alvo.dataset.proximo);
    if (alvo.dataset.anterior) irPara(alvo.dataset.anterior);
  });

  // Retoma de onde ela parou (pode ser outro dia)
  irPara(lerStorage(CHAVE_STEP) || 1);
}

/* ---------- foto ---------- */

function carregarImagem(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("não consegui ler a imagem"));
    };
    img.src = url;
  });
}

async function processarFoto(file) {
  const img = await carregarImagem(file);
  const maxLado = 1000;
  const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * escala));
  canvas.height = Math.max(1, Math.round(img.height * escala));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

  const ok = gravarStorage(CHAVE_FOTO, dataUrl);
  return { dataUrl, ok };
}

function mostrarFoto(dataUrl) {
  const preview = $("foto-preview");
  const botao = $("foto-remover");
  const status = $("foto-status");
  if (preview) {
    preview.src = dataUrl;
    preview.hidden = false;
  }
  if (botao) botao.hidden = false;
  if (status) status.textContent = "Foto salva neste aparelho. Ela vai junto no download.";
}

function ligarFoto() {
  const input = $("foto");
  const remover = $("foto-remover");
  if (!input) return;

  const salva = lerStorage(CHAVE_FOTO);
  if (salva) mostrarFoto(salva);

  input.addEventListener("change", async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const status = $("foto-status");
    if (status) status.textContent = "Salvando a foto...";
    try {
      const { dataUrl, ok } = await processarFoto(file);
      mostrarFoto(dataUrl);
      if (!ok && status) {
        status.textContent = "Foto carregada, mas não deu pra salvar neste navegador (pode dar 'Baixar arquivo' agora).";
      }
    } catch {
      if (status) status.textContent = "Não consegui ler essa imagem. Tente outra foto (JPG ou PNG).";
    } finally {
      input.value = "";
    }
  });

  if (remover) {
    remover.addEventListener("click", () => {
      apagarStorage(CHAVE_FOTO);
      const preview = $("foto-preview");
      const status = $("foto-status");
      if (preview) {
        preview.src = "";
        preview.hidden = true;
      }
      remover.hidden = true;
      if (status) status.textContent = "Foto removida.";
    });
  }
}

/* ---------- formulário ---------- */

function ligarFormulario() {
  const campos = Array.from(document.querySelectorAll("[data-campo]"));
  if (campos.length === 0) return;

  // Restaura o que já foi digitado neste aparelho
  let salvo = {};
  try {
    salvo = JSON.parse(lerStorage(CHAVE_RESPOSTAS) || "{}");
  } catch {
    salvo = {};
  }
  for (const campo of campos) {
    const valor = salvo[campo.dataset.campo];
    if (valor) campo.value = valor;
  }

  const status = $("status-salvo");
  const atualizarStatus = (texto) => {
    if (status) status.textContent = texto;
  };
  if (Object.keys(salvo).length > 0) {
    atualizarStatus("Continuando de onde você parou (respostas salvas neste aparelho).");
  }

  let timer;
  const salvar = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const dados = {};
      for (const campo of campos) dados[campo.dataset.campo] = campo.value;
      if (gravarStorage(CHAVE_RESPOSTAS, JSON.stringify(dados))) {
        atualizarStatus(
          `Salvo automaticamente às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} neste aparelho.`
        );
      } else {
        atualizarStatus("Não foi possível salvar neste navegador (modo privado?).");
      }
    }, 400);
  };
  for (const campo of campos) campo.addEventListener("input", salvar);

  const valorDe = (chave) => {
    const campo = campos.find((c) => c.dataset.campo === chave);
    return campo ? campo.value : "";
  };

  const montarTexto = () => {
    const linhas = [
      `Respostas da especialista para o site (gerado em ${new Date().toLocaleDateString("pt-BR")})`,
      "",
    ];
    let algum = false;
    for (const [titulo, chaves] of BLOCOS) {
      const itens = chaves.filter((k) => valorDe(k).trim());
      if (itens.length === 0) continue;
      algum = true;
      linhas.push(titulo);
      for (const k of itens) linhas.push(`${ROTULOS[k]}: ${valorDe(k).trim()}`);
      linhas.push("");
    }
    if (algum) linhas.push("Foto: acompanha este texto (enviada junto).");
    return algum ? linhas.join("\n") : null;
  };

  const btnWhats = $("btn-whatsapp");
  if (btnWhats) {
    btnWhats.addEventListener("click", () => {
      const texto = montarTexto();
      if (!texto) {
        avisoDeAcao("Nenhuma resposta preenchida ainda. Preencha as etapas primeiro.");
        return;
      }
      const numero = (btnWhats.dataset.numero || "").replace(/\D/g, "");
      if (numero.length < 12) {
        avisoDeAcao("WhatsApp do Jonas ainda não configurado nesta página. Use 'Copiar respostas'.");
        return;
      }
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
      window.open(url, "_blank", "noopener");
      avisoDeAcao(
        "Conversa aberta com a mensagem pronta: é só apertar enviar. " +
          (lerStorage(CHAVE_FOTO)
            ? "Se tiver foto, anexe pelo ícone de papelzinho na mesma conversa."
            : "Se a mensagem não abrir por ser longa, use 'Copiar respostas'.")
      );
    });
  }

  const btnCopiar = $("btn-copiar");
  if (btnCopiar) {
    btnCopiar.addEventListener("click", async () => {
      const texto = montarTexto();
      if (!texto) {
        avisoDeAcao("Nenhuma resposta preenchida ainda.");
        return;
      }
      const ok = await copiarTexto(texto);
      avisoDeAcao(
        ok
          ? "Copiado! Cole no WhatsApp ou e-mail do Jonas. Se tiver foto, manda ela junto."
          : "Não deu pra copiar neste navegador. Use 'Baixar arquivo'."
      );
    });
  }

  const baixar = (nome, blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const btnBaixar = $("btn-baixar");
  if (btnBaixar) {
    btnBaixar.addEventListener("click", () => {
      const texto = montarTexto();
      if (!texto) {
        avisoDeAcao("Nenhuma resposta preenchida ainda.");
        return;
      }
      const hoje = new Date().toISOString().slice(0, 10);
      baixar(`respostas-esposa-${hoje}.txt`, new Blob([texto], { type: "text/plain;charset=utf-8" }));

      const foto = lerStorage(CHAVE_FOTO);
      if (foto) {
        const bin = atob(foto.split(",")[1]);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        baixar(`foto-esposa-${hoje}.jpg`, new Blob([bytes], { type: "image/jpeg" }));
        avisoDeAcao("Baixados o texto e a foto! Mande os dois pro Jonas (WhatsApp ou e-mail).");
      } else {
        avisoDeAcao("Arquivo baixado! Mande pro Jonas (WhatsApp ou e-mail).");
      }
    });
  }

  const btnLimpar = $("btn-limpar");
  if (btnLimpar) {
    btnLimpar.addEventListener("click", () => {
      if (!confirm("Apagar TODAS as respostas e a foto salvas neste aparelho?")) return;
      apagarStorage(CHAVE_RESPOSTAS);
      apagarStorage(CHAVE_FOTO);
      apagarStorage(CHAVE_STEP);
      for (const campo of campos) campo.value = "";
      const preview = $("foto-preview");
      const botaoRemover = $("foto-remover");
      const fotoStatus = $("foto-status");
      if (preview) {
        preview.src = "";
        preview.hidden = true;
      }
      if (botaoRemover) botaoRemover.hidden = true;
      if (fotoStatus) fotoStatus.textContent = "";
      atualizarStatus("");
      avisoDeAcao("Tudo apagado deste aparelho.");
      irParaInicio();
    });
  }

  const btnPrompt = $("btn-prompt");
  if (btnPrompt) {
    btnPrompt.addEventListener("click", async () => {
      const pre = $("texto-prompt");
      if (!pre) return;
      const ok = await copiarTexto(pre.textContent);
      avisoDeAcao(
        ok
          ? "Prompt copiado! Cole numa IA (ChatGPT, Gemini, Copilot)."
          : "Não deu pra copiar. Selecione o texto do prompt manualmente."
      );
    });
  }
}

function irParaInicio() {
  const primeiro = document.querySelector('.step[data-step="1"]');
  if (primeiro) {
    document.querySelectorAll(".step").forEach((s) => s.classList.remove("ativo"));
    primeiro.classList.add("ativo");
  }
  const barra = $("barra-preenchida");
  const rotulo = $("etapa-atual");
  if (barra) barra.style.width = "20%";
  if (rotulo) rotulo.textContent = "Etapa 1 de 5: Identificação";
}

/* ---------- início ---------- */

function mostrarConteudo(html) {
  $("tela-senha").hidden = true;
  const alvo = $("conteudo");
  alvo.hidden = false;
  alvo.innerHTML = html;
  ligarEtapas();
  ligarFormulario();
  ligarFoto();
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
