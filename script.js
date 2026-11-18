(() => {
  const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const toque = window.matchMedia("(hover: none)").matches;
  const cor = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();

  /* ---------- Globo 3D de pontos (canvas, sem bibliotecas) ---------- */
  function iniciarGlobo() {
    const canvas = document.getElementById("globo");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const N = 420;
    const pontos = [];
    const ouro = Math.PI * (3 - Math.sqrt(5));

    // Distribuição de Fibonacci na esfera
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = ouro * i;
      pontos.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }

    // Liga cada ponto aos vizinhos próximos (calculado uma vez)
    const arestas = [];
    const limite = 0.2;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pontos[i][0] - pontos[j][0];
        const dy = pontos[i][1] - pontos[j][1];
        const dz = pontos[i][2] - pontos[j][2];
        if (dx * dx + dy * dy + dz * dz < limite * limite) arestas.push([i, j]);
      }
    }

    let largura = 0, altura = 0, raio = 0, dpr = 1;
    function redimensionar() {
      const caixa = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      largura = caixa.width;
      altura = caixa.height;
      canvas.width = largura * dpr;
      canvas.height = altura * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      raio = Math.min(largura, altura) * 0.4;
    }
    redimensionar();
    window.addEventListener("resize", redimensionar);

    let rotY = 0, rotX = -0.35;
    let alvoX = 0, alvoY = 0, mouseX = 0, mouseY = 0;
    window.addEventListener("pointermove", (e) => {
      alvoX = (e.clientY / window.innerHeight - 0.5) * 0.6;
      alvoY = (e.clientX / window.innerWidth - 0.5) * 0.8;
    });

    const projetados = new Array(N);
    let c1 = cor("--destaque"), c2 = cor("--destaque-2");
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      c1 = cor("--destaque"); c2 = cor("--destaque-2");
    });

    let visivel = true;
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(canvas);

    function quadro() {
      requestAnimationFrame(quadro);
      if (!visivel) return;

      if (!reduzir) rotY += 0.0025;
      mouseX += (alvoX - mouseX) * 0.05;
      mouseY += (alvoY - mouseY) * 0.05;

      const ay = rotY + mouseY, ax = rotX + mouseX;
      const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
      const meioX = largura / 2, meioY = altura / 2;
      const foco = 3;

      for (let i = 0; i < N; i++) {
        const [x, y, z] = pontos[i];
        const x1 = x * cy - z * sy;
        const z1 = x * sy + z * cy;
        const y1 = y * cx - z1 * sx;
        const z2 = y * sx + z1 * cx;
        const escala = foco / (foco + z2);
        projetados[i] = [meioX + x1 * raio * escala, meioY + y1 * raio * escala, z2, escala];
      }

      ctx.clearRect(0, 0, largura, altura);

      // Linhas
      ctx.lineWidth = 0.6;
      ctx.strokeStyle = c1;
      for (const [a, b] of arestas) {
        const pa = projetados[a], pb = projetados[b];
        const prof = (2 - (pa[2] + pb[2])) / 4; // 0 (fundo) a 1 (frente)
        ctx.globalAlpha = 0.04 + prof * 0.28;
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
      }

      // Pontos
      for (let i = 0; i < N; i++) {
        const p = projetados[i];
        const prof = (1 - p[2]) / 2;
        ctx.globalAlpha = 0.15 + prof * 0.85;
        ctx.fillStyle = i % 7 === 0 ? c2 : c1;
        ctx.beginPath();
        ctx.arc(p[0], p[1], (i % 7 === 0 ? 2.2 : 1.4) * p[3], 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    quadro();
  }

  /* ---------- Texto digitando ---------- */
  function iniciarDigitacao() {
    const alvo = document.getElementById("digitado");
    if (!alvo || reduzir) return;
    const frases = ["Engenharia de Software", "Desenvolvimento web", "Back-end e banco de dados", "Dados e automação", "Código testado e documentado"];
    let f = 0, c = alvo.textContent.length, apagando = true;
    function passo() {
      const frase = frases[f];
      if (apagando) {
        c--;
        alvo.textContent = frase.slice(0, c);
        if (c === 0) { apagando = false; f = (f + 1) % frases.length; }
        setTimeout(passo, 40);
      } else {
        const nova = frases[f];
        c++;
        alvo.textContent = nova.slice(0, c);
        if (c === nova.length) { apagando = true; setTimeout(passo, 2200); }
        else setTimeout(passo, 75);
      }
    }
    setTimeout(passo, 2500);
  }

  /* ---------- Inclinação 3D e luz que segue o mouse ---------- */
  function iniciarInclinacao() {
    if (toque || reduzir) return;
    document.querySelectorAll(".cartao, .qualificacoes > div, .contato-caixa").forEach((el) => {
      const forca = el.classList.contains("contato-caixa") ? 3 : 8;
      el.classList.add("inclina");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * forca}deg) rotateY(${(px - 0.5) * forca}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Botões magnéticos ---------- */
  function iniciarMagnetico() {
    if (toque || reduzir) return;
    document.querySelectorAll(".magnetico").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Brilho que acompanha o cursor ---------- */
  function iniciarBrilho() {
    const brilho = document.querySelector(".brilho-cursor");
    if (!brilho || toque || reduzir) return;
    window.addEventListener("pointermove", (e) => {
      brilho.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      brilho.style.opacity = "1";
    });
    document.addEventListener("pointerleave", () => { brilho.style.opacity = "0"; });
  }

  /* ---------- Revelar ao rolar ---------- */
  function iniciarRevelar() {
    if (reduzir || !("IntersectionObserver" in window)) return;
    const itens = document.querySelectorAll(
      ".secao-rotulo, section h2, section h3, .sobre-texto p, .cartao, .qualificacoes > div, .linha-do-tempo li, .contato-caixa"
    );
    const obs = new IntersectionObserver((entradas) => {
      entradas.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visivel");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    itens.forEach((el) => {
      const irmaos = Array.from(el.parentElement.children).filter((c) => c.tagName === el.tagName);
      el.style.setProperty("--atraso", `${Math.min(irmaos.indexOf(el), 6) * 70}ms`);
      el.classList.add("revelar");
      obs.observe(el);
    });
  }

  /* ---------- Barra de progresso e link ativo ---------- */
  function iniciarRolagem() {
    const barra = document.querySelector(".progresso");
    const links = document.querySelectorAll(".topo ul a");
    const secoes = Array.from(links).map((a) => document.querySelector(a.getAttribute("href")));
    function atualizar() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barra) barra.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      let ativo = -1;
      secoes.forEach((s, i) => { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.35) ativo = i; });
      links.forEach((a, i) => a.classList.toggle("ativo", i === ativo));
    }
    window.addEventListener("scroll", atualizar, { passive: true });
    atualizar();
  }

  iniciarGlobo();
  iniciarDigitacao();
  iniciarInclinacao();
  iniciarMagnetico();
  iniciarBrilho();
  iniciarRevelar();
  iniciarRolagem();
})();
