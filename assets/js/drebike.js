(function (janela) {
  'use strict';

  const doc = janela.document;
  if (!doc) return;

  const FOCAVEIS = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const NOME_DA_LOJA = 'DR. E-BIKE';

  function todos(raiz, seletor) {
    return Array.prototype.slice.call(raiz.querySelectorAll(seletor));
  }

  function elemento(tag, classe, texto) {
    const el = doc.createElement(tag);
    if (classe) el.className = classe;
    if (texto) el.textContent = texto;
    return el;
  }

  function movimentoReduzido() {
    try {
      return janela.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_erro) {
      return true;
    }
  }

  function telaGrande() {
    try {
      return janela.matchMedia('(min-width: 64em)').matches;
    } catch (_erro) {
      return false;
    }
  }

  function rolagem() {
    const l = janela.ES_LENIS;
    return l && typeof l.stop === 'function' && typeof l.start === 'function' ? l : null;
  }

  function ligarTopo() {
    const topo = doc.querySelector('[data-de-topo]');
    if (!topo) return;
    let quadro = 0;
    const medir = () => {
      quadro = 0;
      topo.classList.toggle('topo--rolado', janela.scrollY > 24);
    };
    janela.addEventListener('scroll', () => {
      if (!quadro) quadro = janela.requestAnimationFrame(medir);
    }, { passive: true });
    medir();

    const links = todos(topo, '.topo__link');
    if (!links.length || typeof janela.IntersectionObserver !== 'function') return;
    const pares = links.map((link) => {
      const url = new URL(link.href, janela.location.href);
      const secao = url.pathname === janela.location.pathname && url.hash ? doc.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
      return { link, secao };
    }).filter((p) => p.secao);
    const observador = new janela.IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        pares.forEach((p) => {
          if (p.secao === entrada.target) p.link.setAttribute('aria-current', 'true');
          else p.link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    pares.forEach((p) => observador.observe(p.secao));
    todos(doc, 'main > section').filter((s) => !pares.some((p) => p.secao === s)).forEach((s) => observador.observe(s));
  }

  function ligarMenu() {
    const topo = doc.querySelector('[data-de-topo]');
    const botao = topo ? topo.querySelector('.topo__menu') : null;
    const menu = doc.querySelector('[data-de-menu]');
    if (!botao || !menu) return;
    const rotulo = botao.querySelector('[data-de-menu-rotulo]');
    menu.hidden = false;
    botao.hidden = false;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Menu');
    let aberto = false;

    const definir = (abrir, devolverFoco) => {
      if (abrir === aberto) return;
      aberto = abrir;
      menu.classList.toggle('is-aberto', abrir);
      botao.setAttribute('aria-expanded', String(abrir));
      if (rotulo) rotulo.textContent = abrir ? 'Fechar' : 'Menu';
      doc.documentElement.classList.toggle('de-menu-aberto', abrir);
      todos(doc, 'main, footer, .flutuante').forEach((el) => {
        if (abrir) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
      });
      const l = rolagem();
      if (l) {
        if (abrir) l.stop();
        else l.start();
      }
      if (abrir) {
        const primeiro = menu.querySelector('.menu__item');
        if (primeiro) janela.requestAnimationFrame(() => primeiro.focus({ preventScroll: true }));
      } else if (devolverFoco) {
        botao.focus();
      }
    };

    botao.addEventListener('click', () => definir(!aberto, false));
    menu.addEventListener('click', (evento) => {
      const alvo = evento.target;
      if (!alvo || typeof alvo.closest !== 'function') return;
      if (!alvo.closest('.menu__painel')) {
        definir(false, true);
        return;
      }
      if (alvo.closest('a')) definir(false, false);
    });
    doc.addEventListener('keydown', (evento) => {
      if (!aberto) return;
      if (evento.key === 'Escape') {
        evento.preventDefault();
        definir(false, true);
        return;
      }
      if (evento.key !== 'Tab') return;
      const alvos = [botao].concat(todos(menu, FOCAVEIS));
      const i = alvos.indexOf(doc.activeElement);
      if (i === -1) {
        evento.preventDefault();
        alvos[0].focus();
      } else if (evento.shiftKey && i === 0) {
        evento.preventDefault();
        alvos[alvos.length - 1].focus();
      } else if (!evento.shiftKey && i === alvos.length - 1) {
        evento.preventDefault();
        alvos[0].focus();
      }
    });
    try {
      janela.matchMedia('(min-width: 64em)').addEventListener('change', (mudanca) => {
        if (mudanca.matches) definir(false, false);
      });
    } catch (_erro) {
      return;
    }
  }

  function ligarFlutuante() {
    const botao = doc.querySelector('.flutuante');
    const hero = doc.querySelector('.hero');
    if (!botao || !hero || typeof janela.IntersectionObserver !== 'function') return;
    const observador = new janela.IntersectionObserver((entradas) => {
      entradas.forEach((entrada) => botao.classList.toggle('flutuante--recolhido', entrada.isIntersecting));
    }, { rootMargin: '0px 0px -35% 0px' });
    observador.observe(hero);
  }

  function ligarFaq() {
    const itens = todos(doc, '.faq__item');
    if (!itens.length) return;
    if (!itens.some((i) => i.open)) itens[0].open = true;
    if (movimentoReduzido()) return;
    itens.forEach((item) => {
      const pergunta = item.querySelector('summary');
      const resposta = item.querySelector('.faq__resposta');
      if (!pergunta || !resposta || typeof resposta.animate !== 'function') return;
      let animacao = null;
      pergunta.addEventListener('click', (evento) => {
        evento.preventDefault();
        if (animacao) animacao.cancel();
        if (!item.open) {
          item.open = true;
          const altura = resposta.scrollHeight;
          animacao = resposta.animate([{ height: '0px', opacity: 0 }, { height: `${altura}px`, opacity: 1 }], { duration: 320, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
          animacao.onfinish = () => { animacao = null; };
        } else {
          const altura = resposta.scrollHeight;
          item.classList.add('is-fechando');
          animacao = resposta.animate([{ height: `${altura}px`, opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 260, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
          animacao.onfinish = () => {
            item.open = false;
            item.classList.remove('is-fechando');
            animacao = null;
          };
          animacao.oncancel = () => item.classList.remove('is-fechando');
        }
      });
    });
  }

  function ligarAncoras() {
    doc.addEventListener('click', (evento) => {
      const link = evento.target && evento.target.closest ? evento.target.closest('a[href]') : null;
      if (!link || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey) return;
      const url = new URL(link.href, janela.location.href);
      if (url.pathname !== janela.location.pathname || !url.hash) return;
      const alvo = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!alvo) return;
      const lenis = janela.ES_LENIS;
      if (!lenis || typeof lenis.scrollTo !== 'function') return;
      evento.preventDefault();
      lenis.scrollTo(alvo, { duration: 1.1 });
      if (janela.history && typeof janela.history.replaceState === 'function') janela.history.replaceState(janela.history.state, '', url.hash);
      alvo.setAttribute('tabindex', '-1');
      alvo.focus({ preventScroll: true });
    });
  }

  function ligarVitrineVazia() {
    const aviso = doc.querySelector('[data-de-vitrine-vazia]');
    if (!aviso) return;
    aviso.hidden = doc.querySelectorAll('.es-catalogo-card').length > 0;
  }

  function ligarFiltro() {
    const vitrine = doc.querySelector('[data-es-catalogo]');
    const filtro = vitrine ? vitrine.querySelector('[data-es-filtro]') : null;
    if (!filtro) return;
    const cards = todos(vitrine, '[data-es-modelo]');
    todos(filtro, '[data-es-filtro-tipo]').forEach((botao) => {
      if (botao.querySelector('.de-contagem')) return;
      const tipo = botao.getAttribute('data-es-filtro-tipo');
      const total = tipo === 'todos' ? cards.length : cards.filter((c) => c.getAttribute('data-tipo') === tipo).length;
      const contagem = elemento('span', 'de-contagem', String(total));
      contagem.setAttribute('aria-hidden', 'true');
      botao.insertBefore(contagem, botao.firstChild);
    });
    if (typeof janela.IntersectionObserver !== 'function') return;
    const sentinela = elemento('div', 'de-sentinela');
    sentinela.setAttribute('aria-hidden', 'true');
    filtro.parentNode.insertBefore(sentinela, filtro);
    const topo = doc.querySelector('[data-de-topo]');
    const folga = (topo ? topo.offsetHeight : 64) + 9;
    new janela.IntersectionObserver((entradas) => {
      const e = entradas[0];
      filtro.classList.toggle('is-fixo', !e.isIntersecting && e.boundingClientRect.top < folga);
    }, { rootMargin: `-${folga}px 0px 0px 0px`, threshold: 0 }).observe(sentinela);
  }

  const ROTULO_DO_TIPO = { scooter: 'Scooter elétrica', 'e-bike': 'Bike elétrica', triciclo: 'Triciclo elétrico' };
  const FOTOS_DE_AMBIENTE = new Set(['tank/01', 'wx-06/01', 'e-trek/01', 'e-trek/02', 'e-trek/03']);
  const FOTOS_DE_DETALHE = new Set(['wx15/05', 'wx-06/05', 'wx-06/06', 'wx-06/07', 'wx-06/08', 'wx-06/09', 'wx-06/10', 'wx-06/11']);
  const TAMANHOS_DO_CARD = '(min-width: 64em) 380px, (min-width: 40em) 45vw, 92vw';
  const TAMANHOS_DA_GALERIA = '(min-width: 64em) 60vw, 100vw';

  function idDaFoto(src) {
    const m = String(src || '').match(/assets\/img\/(?:fabricante|vitrine)\/([^/]+)\/(\d+)/);
    return m ? `${m[1]}/${m[2]}` : null;
  }

  function versaoLeve(img, tamanhos) {
    const atual = img.getAttribute('src') || '';
    const partes = atual.match(/^(assets\/img\/)fabricante\/(.+)\.(?:jpe?g|png)(?:\?.*)?$/i);
    if (FOTOS_DE_AMBIENTE.has(idDaFoto(atual))) img.classList.add('de-ambiente');
    if (!partes) return;
    const base = `${partes[1]}vitrine/${partes[2]}`;
    img.setAttribute('srcset', `${base}-800.webp 800w, ${base}-1600.webp 1600w`);
    img.setAttribute('sizes', tamanhos);
    img.setAttribute('src', `${base}-800.webp`);
  }

  function usarFotosLeves() {
    todos(doc, '.es-catalogo-card__foto').forEach((img) => versaoLeve(img, TAMANHOS_DO_CARD));
    todos(doc, 'template[data-es-modelo-detalhe]').forEach((molde) => {
      if (molde.content) todos(molde.content, '.es-catalogo-galeria__foto').forEach((img) => versaoLeve(img, TAMANHOS_DA_GALERIA));
    });
  }

  function rotuloDoTipo(id) {
    const card = id ? doc.querySelector(`.es-catalogo-card[data-es-modelo="${id}"]`) : null;
    const tipo = card ? card.getAttribute('data-tipo') : null;
    return (tipo && ROTULO_DO_TIPO[tipo]) || null;
  }

  const DESTAQUES = [
    { rotulo: 'Velocidade', teste: /^velocidade/i },
    { rotulo: 'Potência', teste: /^pot[êe]ncia/i },
    { rotulo: 'Autonomia', teste: /^autonomia/i },
  ];

  function itensDaFicha(dl) {
    return dl ? todos(dl, '.es-catalogo-especificacoes__item').map((item) => {
      const dt = item.querySelector('dt');
      const dd = item.querySelector('dd');
      return { item, rotulo: dt ? dt.textContent.trim() : '', valor: dd ? dd.textContent.trim() : '' };
    }) : [];
  }

  function numerosEmDestaque(itens, classe) {
    const escolhidos = DESTAQUES.map((d) => {
      const achado = itens.find((i) => d.teste.test(i.rotulo));
      return achado ? { rotulo: d.rotulo, valor: achado.valor, item: achado.item } : null;
    }).filter(Boolean);
    if (!escolhidos.length) return null;
    const dl = elemento('dl', `es-catalogo-especificacoes de-numeros ${classe}`);
    escolhidos.forEach((e) => {
      const celula = elemento('div', 'es-catalogo-especificacoes__item');
      const dd = elemento('dd');
      const partes = e.valor.match(/^([\d.,]+)\s*(.*)$/);
      if (partes) {
        dd.appendChild(elemento('b', '', partes[1].replace(/^(\d{1,2})\.(\d{3})$/, '$1$2')));
        if (partes[2]) dd.appendChild(elemento('span', '', partes[2]));
      } else {
        dd.textContent = e.valor;
      }
      celula.appendChild(elemento('dt', '', e.rotulo));
      celula.appendChild(dd);
      dl.appendChild(celula);
    });
    return { dl, usados: escolhidos.map((e) => e.item) };
  }

  function ligarCards() {
    todos(doc, '.es-catalogo-card[data-es-modelo]').forEach((card) => {
      const id = card.getAttribute('data-es-modelo');
      const molde = doc.querySelector(`template[data-es-modelo-detalhe="${id}"]`);
      const ficha = molde && molde.content ? molde.content.querySelector('.es-catalogo-especificacoes') : null;
      const destaque = numerosEmDestaque(itensDaFicha(ficha), 'es-catalogo-especificacoes--card');
      const nome = card.querySelector('.es-catalogo-card__nome');
      if (destaque) {
        const atual = card.querySelector('.es-catalogo-especificacoes');
        if (atual) atual.replaceWith(destaque.dl);
        else if (nome) nome.after(destaque.dl);
      }
      const rotulo = rotuloDoTipo(id);
      if (rotulo && nome && !card.querySelector('.de-card__tipo')) nome.before(elemento('p', 'de-card__tipo', rotulo));
      const comprar = card.querySelector('.es-catalogo-card__comprar');
      const detalhes = card.querySelector('.es-catalogo-card__detalhes');
      if (comprar && detalhes && detalhes.compareDocumentPosition(comprar) & 4) detalhes.before(comprar);
      const abrir = card.querySelector('[data-es-abrir]');
      const foto = card.querySelector('.es-catalogo-card__foto');
      if (abrir && foto && !foto.classList.contains('de-card__foto--abre')) {
        foto.classList.add('de-card__foto--abre');
        foto.addEventListener('click', () => abrir.click());
      }
    });
  }

  function montarGaleria(lado) {
    const contador = elemento('p', 'de-modal__contador');
    contador.setAttribute('aria-hidden', 'true');
    const anterior = elemento('button', 'de-modal__seta de-modal__seta--anterior');
    anterior.type = 'button';
    anterior.setAttribute('aria-label', 'Foto anterior');
    const proxima = elemento('button', 'de-modal__seta de-modal__seta--proxima');
    proxima.type = 'button';
    proxima.setAttribute('aria-label', 'Próxima foto');
    const miniaturas = elemento('div', 'de-modal__miniaturas');
    miniaturas.setAttribute('role', 'group');
    miniaturas.setAttribute('aria-label', 'Fotos do modelo');
    lado.appendChild(contador);
    lado.appendChild(anterior);
    lado.appendChild(proxima);
    lado.appendChild(miniaturas);
    let comMouse = false;
    try {
      comMouse = janela.matchMedia('(hover: hover) and (pointer: fine)').matches;
    } catch (_erro) {
      comMouse = false;
    }
    if (!comMouse) {
      anterior.hidden = true;
      proxima.hidden = true;
    }

    const modal = lado.closest('[data-es-catalogo-modal]');
    const porCor = todos(lado, '[data-es-galeria]').filter((g) => g.getAttribute('data-es-galeria') !== '');
    const corMarcada = () => {
      const b = modal ? modal.querySelector('[data-es-cor][aria-pressed="true"]') : null;
      return b ? b.getAttribute('data-es-cor') : '';
    };
    const escolherCor = (nome) => {
      const b = modal ? todos(modal, '[data-es-cor]').find((x) => x.getAttribute('data-es-cor') === nome) : null;
      if (b) b.click();
    };
    const indiceDaCor = () => porCor.findIndex((g) => g.getAttribute('data-es-galeria') === corMarcada());

    const aviso = elemento('p', 'de-modal__aviso-cor');
    aviso.hidden = true;
    lado.appendChild(aviso);
    const avisarCorSemFoto = () => {
      const cor = corMarcada();
      const semFoto = Boolean(cor) && porCor.length > 0 && !porCor.some((g) => g.getAttribute('data-es-galeria') === cor);
      aviso.textContent = semFoto ? `Ainda sem foto da cor ${cor}: a imagem mostra outra cor.` : '';
      aviso.hidden = !semFoto;
    };

    const umaFotoPorCor = porCor.length > 0 && porCor.every((g) => todos(g, '.es-catalogo-galeria__foto').length <= 1);
    if (umaFotoPorCor) {
      const atualizarCor = () => {
        avisarCorSemFoto();
        const i = indiceDaCor();
        contador.textContent = i >= 0 ? `${i + 1} / ${porCor.length}` : '';
        contador.hidden = i < 0 || porCor.length < 2;
        miniaturas.hidden = porCor.length < 2;
        lado.classList.toggle('tem-varias', porCor.length > 1);
        anterior.disabled = i <= 0;
        proxima.disabled = i >= porCor.length - 1;
        todos(miniaturas, '.de-modal__mini').forEach((m, j) => m.setAttribute('aria-current', j === i ? 'true' : 'false'));
      };
      porCor.forEach((g) => {
        const nome = g.getAttribute('data-es-galeria');
        const foto = g.querySelector('.es-catalogo-galeria__foto');
        if (!foto) return;
        const mini = elemento('button', 'de-modal__mini');
        mini.type = 'button';
        mini.setAttribute('aria-label', `Ver a cor ${nome}`);
        const img = elemento('img');
        img.src = foto.getAttribute('src');
        if (foto.classList.contains('de-detalhe')) img.classList.add('de-detalhe');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        mini.appendChild(img);
        mini.addEventListener('click', () => escolherCor(nome));
        miniaturas.appendChild(mini);
      });
      anterior.addEventListener('click', () => {
        const i = indiceDaCor();
        if (i > 0) escolherCor(porCor[i - 1].getAttribute('data-es-galeria'));
      });
      proxima.addEventListener('click', () => {
        const i = indiceDaCor();
        const alvo = porCor[i < 0 ? 0 : i + 1];
        if (alvo) escolherCor(alvo.getAttribute('data-es-galeria'));
      });
      atualizarCor();
      return atualizarCor;
    }

    const visivel = () => lado.querySelector('[data-es-galeria]:not([hidden])') || lado.querySelector('[data-es-galeria]');
    const fotos = () => {
      const g = visivel();
      return g ? todos(g, '.es-catalogo-galeria__foto') : [];
    };
    const indice = () => {
      const g = visivel();
      return g && g.clientWidth ? Math.round(g.scrollLeft / g.clientWidth) : 0;
    };
    const ir = (i) => {
      const g = visivel();
      const lista = fotos();
      if (!g || !lista.length) return;
      const alvo = Math.max(0, Math.min(lista.length - 1, i));
      g.scrollTo({ left: alvo * g.clientWidth, behavior: movimentoReduzido() ? 'auto' : 'smooth' });
    };
    const atualizar = () => {
      const lista = fotos();
      const i = indice();
      contador.textContent = `${i + 1} / ${lista.length}`;
      contador.hidden = lista.length < 2;
      miniaturas.hidden = lista.length < 2;
      lado.classList.toggle('tem-varias', lista.length > 1);
      anterior.disabled = i <= 0;
      proxima.disabled = i >= lista.length - 1;
      todos(miniaturas, '.de-modal__mini').forEach((m, j) => m.setAttribute('aria-current', j === i ? 'true' : 'false'));
    };
    const refazer = () => {
      miniaturas.textContent = '';
      fotos().forEach((foto, j) => {
        const mini = elemento('button', 'de-modal__mini');
        mini.type = 'button';
        mini.setAttribute('aria-label', `Foto ${j + 1}`);
        const img = elemento('img');
        img.src = foto.getAttribute('src');
        if (foto.classList.contains('de-detalhe')) img.classList.add('de-detalhe');
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        mini.appendChild(img);
        mini.addEventListener('click', () => ir(j));
        miniaturas.appendChild(mini);
      });
      const g = visivel();
      if (g) g.scrollLeft = 0;
      avisarCorSemFoto();
      atualizar();
    };
    anterior.addEventListener('click', () => ir(indice() - 1));
    proxima.addEventListener('click', () => ir(indice() + 1));
    todos(lado, '[data-es-galeria]').forEach((g) => {
      g.addEventListener('scroll', () => janela.requestAnimationFrame(atualizar), { passive: true });
    });
    refazer();
    return refazer;
  }

  const ORDEM_DA_FICHA = [
    'Motor', 'Bateria', 'Tempo de recarga', 'Carregador', 'Freios', 'Suspensão', 'Rodas', 'Pneus', 'Painel',
    'Lugares', 'Carga máxima', 'Dimensões', 'Peso', 'Garantia', 'Fabricante',
  ];
  const LINHA_DA_FICHA = /^([^:]{2,40}):\s+(.+)$/;
  const AVISO_DA_FICHA = 'Ficha informada pela loja e confirmada no atendimento. A autonomia é a máxima e varia com peso, relevo e modo de condução. A classificação legal de cada modelo é confirmada com você antes da compra. Imagens ilustrativas.';

  function subtituloAntes(el) {
    const anterior = el ? el.previousElementSibling : null;
    return anterior && anterior.classList.contains('es-catalogo-modal__subtitulo') ? anterior : null;
  }

  function organizarFicha(ficha, barra) {
    const conteudo = barra ? barra.parentNode : null;
    if (!conteudo) return null;
    const lista = conteudo.querySelector('.es-catalogo-lista-tecnica');
    const tituloLista = subtituloAntes(lista);
    const linhas = [];
    let chamada = null;
    if (ficha) {
      todos(ficha, '.es-catalogo-especificacoes__item').forEach((item) => {
        const dt = item.querySelector('dt');
        const dd = item.querySelector('dd');
        if (dt && dd) linhas.push([dt.textContent.trim(), dd.textContent.trim()]);
      });
      const tituloFicha = subtituloAntes(ficha);
      if (tituloFicha) tituloFicha.remove();
      ficha.remove();
    }
    if (lista) {
      todos(lista, 'li').forEach((li) => {
        const m = LINHA_DA_FICHA.exec(li.textContent.trim());
        if (!m) return;
        if (m[1] === 'Chamada') chamada = m[2];
        else linhas.push([m[1], m[2]]);
        li.remove();
      });
      if (!lista.children.length) {
        if (tituloLista) tituloLista.remove();
        lista.remove();
      } else if (tituloLista) {
        tituloLista.textContent = 'Itens de série';
      }
    }
    const posicao = (rotulo) => {
      const i = ORDEM_DA_FICHA.indexOf(rotulo);
      return i < 0 ? ORDEM_DA_FICHA.length - 1.5 : i;
    };
    const ordenadas = linhas.map((l, i) => [l, i]).sort((a, b) => posicao(a[0][0]) - posicao(b[0][0]) || a[1] - b[1]).map((x) => x[0]);
    const depois = (tituloLista && tituloLista.isConnected) ? tituloLista : barra;
    if (ordenadas.length) {
      const dl = elemento('dl', 'es-catalogo-especificacoes de-ficha');
      ordenadas.forEach(([rotulo, valor]) => {
        const item = elemento('div', 'es-catalogo-especificacoes__item');
        item.appendChild(elemento('dt', '', rotulo));
        item.appendChild(elemento('dd', '', valor));
        dl.appendChild(item);
      });
      conteudo.insertBefore(elemento('h3', 'es-catalogo-modal__subtitulo', 'Ficha técnica'), depois);
      conteudo.insertBefore(dl, depois);
      conteudo.insertBefore(elemento('p', 'de-modal__aviso-ficha', AVISO_DA_FICHA), barra);
    }
    return chamada;
  }

  function ligarModal() {
    const modal = doc.querySelector('[data-es-catalogo-modal]');
    const conteudo = modal ? modal.querySelector('[data-es-catalogo-conteudo]') : null;
    const caixa = modal ? modal.querySelector('[role="dialog"]') : null;
    if (!conteudo || !caixa) return;
    modal.classList.add('de-modal');
    caixa.setAttribute('data-lenis-prevent', '');
    let refazerGaleria = null;
    let rotuloCor = null;

    const nomeDaCor = () => {
      const marcada = conteudo.querySelector('[data-es-cor][aria-pressed="true"]');
      return marcada ? marcada.getAttribute('data-es-cor') : '';
    };

    const montarNavegacao = (lado, id) => {
      const ids = todos(doc, '.es-catalogo-card[data-es-modelo]').filter((c) => !c.hidden).map((c) => c.getAttribute('data-es-modelo'));
      const i = ids.indexOf(id);
      if (i < 0 || ids.length < 2) return;
      const nav = elemento('div', 'de-modal__navegacao');
      const botao = (classe, rotulo, alvo) => {
        const b = elemento('button', `de-modal__nav ${classe}`);
        b.type = 'button';
        b.setAttribute('aria-label', rotulo);
        b.addEventListener('click', () => {
          const abrir = doc.querySelector(`[data-es-abrir="${alvo}"]`);
          if (abrir) abrir.click();
        });
        return b;
      };
      const anterior = ids[(i - 1 + ids.length) % ids.length];
      const proximo = ids[(i + 1) % ids.length];
      nav.appendChild(botao('de-modal__nav--anterior', 'Modelo anterior', anterior));
      nav.appendChild(elemento('span', 'de-modal__nav-texto', `${i + 1} / ${ids.length}`));
      nav.appendChild(botao('de-modal__nav--proximo', 'Próximo modelo', proximo));
      lado.appendChild(nav);
    };

    const montar = () => {
      if (!conteudo.firstElementChild || conteudo.querySelector('.de-modal__painel')) return;
      const galerias = conteudo.querySelector('.es-catalogo-galerias');
      const titulo = conteudo.querySelector('.es-catalogo-modal__titulo');
      const cores = conteudo.querySelector('.es-catalogo-cores');
      const barra = conteudo.querySelector('.es-catalogo-modal__barra');
      const comprar = barra ? barra.querySelector('a[data-es-link][data-modelo]') : null;
      const id = comprar ? comprar.getAttribute('data-modelo') : null;

      let lado = null;
      if (galerias) {
        lado = elemento('div', 'de-modal__galeria');
        conteudo.insertBefore(lado, galerias);
        lado.appendChild(galerias);
        todos(galerias, '.es-catalogo-galeria__foto').forEach((img) => {
          const foto = idDaFoto(img.getAttribute('src'));
          if (FOTOS_DE_AMBIENTE.has(foto)) img.classList.add('de-ambiente');
          if (FOTOS_DE_DETALHE.has(foto)) img.classList.add('de-detalhe');
        });
      }

      const painel = elemento('div', 'de-modal__painel');
      const topo = elemento('div', 'de-modal__topo');
      const corpo = elemento('div', 'de-modal__corpo');
      const base = elemento('div', 'de-modal__base');
      corpo.setAttribute('data-lenis-prevent', '');
      const tipo = rotuloDoTipo(id);
      topo.appendChild(elemento('p', 'de-modal__eyebrow', tipo ? `${NOME_DA_LOJA} · ${tipo}` : NOME_DA_LOJA));
      if (titulo) topo.appendChild(titulo);

      const ficha = conteudo.querySelector('.es-catalogo-especificacoes');
      const destaque = numerosEmDestaque(itensDaFicha(ficha), 'de-numeros--modal');
      if (destaque) {
        topo.appendChild(destaque.dl);
        destaque.usados.forEach((item) => item.remove());
      }
      const chamada = organizarFicha(ficha, barra);
      if (chamada) topo.insertBefore(elemento('p', 'de-modal__chamada', chamada), destaque ? destaque.dl : null);

      Array.prototype.slice.call(conteudo.children).forEach((filho) => {
        if (filho === lado || filho === barra || filho === cores) return;
        corpo.appendChild(filho);
      });

      rotuloCor = null;
      if (cores) {
        const linha = elemento('div', 'de-modal__cores');
        const rotulo = elemento('p', 'de-modal__cor', 'Cor: ');
        rotuloCor = elemento('strong', '', nomeDaCor());
        rotulo.appendChild(rotuloCor);
        linha.appendChild(rotulo);
        linha.appendChild(cores);
        base.appendChild(linha);
      }
      if (barra) base.appendChild(barra);
      base.appendChild(elemento('p', 'de-modal__nota', 'Atendimento direto pelo WhatsApp de vendas da loja.'));

      painel.appendChild(topo);
      painel.appendChild(corpo);
      painel.appendChild(base);
      conteudo.appendChild(painel);
      refazerGaleria = lado ? montarGaleria(lado) : null;
      if (lado) montarNavegacao(lado, id);
    };

    const lightbox = elemento('div', 'de-lightbox');
    lightbox.hidden = true;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Foto ampliada');
    const fotoGrande = elemento('img', 'de-lightbox__foto');
    fotoGrande.alt = '';
    const fecharFoto = elemento('button', 'de-lightbox__fechar');
    fecharFoto.type = 'button';
    fecharFoto.setAttribute('aria-label', 'Fechar a foto ampliada');
    fecharFoto.textContent = '×';
    lightbox.appendChild(fotoGrande);
    lightbox.appendChild(fecharFoto);
    caixa.appendChild(lightbox);
    let voltarPara = null;
    const fecharLightbox = () => {
      if (lightbox.hidden) return;
      lightbox.hidden = true;
      fotoGrande.removeAttribute('src');
      if (voltarPara) voltarPara.focus();
      voltarPara = null;
    };
    fecharFoto.addEventListener('click', fecharLightbox);
    lightbox.addEventListener('click', (evento) => {
      if (evento.target === lightbox) fecharLightbox();
    });
    janela.addEventListener('keydown', (evento) => {
      if (lightbox.hidden || evento.key !== 'Escape') return;
      evento.preventDefault();
      evento.stopPropagation();
      fecharLightbox();
    }, true);
    conteudo.addEventListener('click', (evento) => {
      const foto = evento.target && evento.target.closest ? evento.target.closest('.es-catalogo-galeria__foto') : null;
      if (!foto) return;
      voltarPara = foto.closest('.de-modal__galeria');
      fotoGrande.src = foto.currentSrc || foto.getAttribute('src');
      fotoGrande.alt = foto.alt || '';
      lightbox.hidden = false;
      fecharFoto.focus();
    });

    if (typeof janela.MutationObserver === 'function') {
      new janela.MutationObserver(montar).observe(conteudo, { childList: true });
    }
    modal.addEventListener('click', (evento) => {
      const alvo = evento.target;
      if (!alvo || typeof alvo.closest !== 'function' || !alvo.closest('[data-es-cor]')) return;
      if (rotuloCor) rotuloCor.textContent = nomeDaCor();
      if (refazerGaleria) refazerGaleria();
    });
  }

  function ligarHero(gsap) {
    const linhas = todos(doc, '.hero__linha > span');
    const destaque = doc.querySelector('.hero__destaque');
    const blocos = todos(doc, '[data-de-hero]');
    const velocidade = todos(doc, '.hero__velocidade span');
    const midia = doc.querySelector('.hero__midia');
    const faixa = doc.querySelector('.hero__faixa');
    const linha = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (midia) linha.fromTo(midia, { opacity: 0, xPercent: 6 }, { opacity: 1, xPercent: 0, duration: 1.4 }, 0);
    if (faixa) linha.fromTo(faixa, { scaleY: 0, scaleX: 0 }, { scaleY: 1, scaleX: 1, duration: 1, ease: 'power3.inOut' }, 0.35);
    if (linhas.length) linha.fromTo(linhas, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.12 }, 0.1);
    if (destaque) linha.fromTo(destaque, { opacity: 0.35 }, { keyframes: { opacity: [0.35, 1, 0.55, 1] }, duration: 0.7, ease: 'none' }, 0.9);
    if (velocidade.length) linha.fromTo(velocidade, { scaleX: 0 }, { scaleX: 1, duration: 0.9, stagger: 0.08, ease: 'power3.out' }, 0.55);
    if (blocos.length) linha.fromTo(blocos, { opacity: 0, x: -12, y: 8 }, { opacity: 1, x: 0, y: 0, duration: 0.9, stagger: 0.08 }, 0.6);

    if (!telaGrande() || !janela.ScrollTrigger) return;
    const hero = doc.querySelector('.hero');
    const imagem = doc.querySelector('.hero__imagem');
    if (imagem && hero) gsap.fromTo(imagem, { yPercent: 0 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  function ligarAssistencia(gsap) {
    const secao = doc.querySelector('[data-de-assistencia]');
    const gatilho = janela.ScrollTrigger;
    if (!secao || !gatilho || typeof gsap.matchMedia !== 'function') return;
    const ecg = secao.querySelector('.assistencia__ecg');
    const linha = secao.querySelector('.assistencia__ecg-linha');
    const palavras = todos(secao, '.assistencia__palavra');
    const cards = todos(secao, '.assistencia__card');
    const acoes = secao.querySelector('.assistencia__acoes');
    const fantasma = secao.querySelector('.assistencia__fantasma');
    const viva = (sim) => {
      if (ecg) ecg.classList.toggle('is-vivo', sim);
    };
    const LADOS = [-1, 1, -1, 1];
    const GIROS = [-5, 4, 3, -4];
    const mm = gsap.matchMedia();

    mm.add('(min-width: 64em) and (prefers-reduced-motion: no-preference)', () => {
      secao.classList.add('is-animada');
      const linhaDoTempo = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: secao,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (st) => viva(st.progress > 0.42),
        },
      });
      linhaDoTempo.fromTo(palavras, { opacity: 0.15, yPercent: 30 }, { opacity: 1, yPercent: 0, stagger: 0.03, duration: 0.18 }, 0);
      if (linha) linhaDoTempo.fromTo(linha, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.42 }, 0.02);
      if (fantasma) linhaDoTempo.fromTo(fantasma, { xPercent: 5 }, { xPercent: -45, duration: 1 }, 0);
      cards.forEach((card, i) => {
        const lado = LADOS[i % LADOS.length];
        linhaDoTempo.fromTo(card,
          { x: () => lado * janela.innerWidth * 0.7, rotation: lado * 14, autoAlpha: 0 },
          { x: 0, rotation: GIROS[i % GIROS.length], autoAlpha: 1, duration: 0.14, ease: 'power2.out' },
          0.14 + i * 0.1);
        linhaDoTempo.to(card,
          { x: () => lado * janela.innerWidth * 0.7, rotation: lado * 10, autoAlpha: 0, duration: 0.12, ease: 'power2.in' },
          0.68 + i * 0.04);
      });
      if (acoes) linhaDoTempo.fromTo(acoes, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.86);
      linhaDoTempo.to({}, { duration: 0.06 }, 0.94);
      janela.requestAnimationFrame(() => gatilho.refresh());
      return () => {
        secao.classList.remove('is-animada');
        viva(false);
      };
    });

    mm.add('(max-width: 63.99em) and (prefers-reduced-motion: no-preference)', () => {
      if (linha && ecg) {
        gsap.fromTo(linha, { strokeDashoffset: 1 }, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: { trigger: ecg, start: 'top 88%', end: 'bottom 45%', scrub: 0.6, onLeave: () => viva(true), onEnterBack: () => viva(false) },
        });
      }
      cards.forEach((card, i) => {
        const lado = i % 2 ? 1 : -1;
        gsap.fromTo(card, { x: lado * 56, autoAlpha: 0, scale: 0.94 }, {
          x: 0,
          autoAlpha: 1,
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: card, start: 'top 94%', end: 'top 62%', scrub: true },
        });
      });
      return () => viva(false);
    });
  }

  function ligarMapa() {
    const frame = doc.querySelector('[data-de-mapa]');
    const endereco = doc.querySelector('.rodape__endereco');
    if (!frame || !endereco) return;
    const busca = (frame.getAttribute('data-de-mapa-busca') || endereco.textContent).replace(/\s+/g, ' ').trim();
    if (!busca) return;
    const carregar = () => {
      if (frame.getAttribute('src')) return;
      frame.addEventListener('load', () => frame.parentElement.classList.add('is-carregado'), { once: true });
      frame.src = `https://maps.google.com/maps?q=${encodeURIComponent(busca)}&t=m&z=16&output=embed&iwloc=near`;
    };
    if (typeof janela.IntersectionObserver !== 'function') {
      carregar();
      return;
    }
    const observador = new janela.IntersectionObserver((entradas) => {
      if (!entradas[0].isIntersecting) return;
      carregar();
      observador.disconnect();
    }, { rootMargin: '600px' });
    observador.observe(frame);
  }

  function iniciar() {
    ligarTopo();
    ligarMenu();
    ligarFlutuante();
    ligarMapa();
    ligarVitrineVazia();
    ligarAncoras();
    usarFotosLeves();
    ligarFiltro();
    ligarCards();
    ligarModal();
    ligarFaq();
    const gsap = janela.gsap;
    if (!gsap || typeof gsap.timeline !== 'function' || movimentoReduzido()) return;
    try {
      if (janela.ScrollTrigger) gsap.registerPlugin(janela.ScrollTrigger);
      ligarHero(gsap);
      ligarAssistencia(gsap);
    } catch (_erro) {
      gsap.set('[data-de-hero], .hero__linha > span, .hero__destaque, .hero__velocidade span, .hero__midia, .hero__faixa, .assistencia__palavra, .assistencia__card, .assistencia__acoes, .assistencia__ecg-linha', { clearProps: 'all' });
      const secao = doc.querySelector('[data-de-assistencia]');
      if (secao) secao.classList.remove('is-animada');
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(window);
