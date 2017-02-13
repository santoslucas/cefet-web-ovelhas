const ANIMACOES = ['parado', 'andando', 'correndo', 'rolando', 'virando', 
  'adormecendo', 'dormindo', 'despencando', 'despencado', 'pendurada'];

const ESTADOS = {
  reflexiva: { loop: 'parado', proximo: ['dormindo', 'andando', 'reflexiva'] },
  dormindo: { loop: 'dormindo', pre: 'adormecendo', pos: { anim: 'parado', duracao: 500 }, proximo: ['andando', 'reflexiva'] },
  andando: { loop: 'andando', proximo: ['andando', 'reflexiva', 'virando', 'correndo'] },
  correndo: { loop: 'correndo', proximo: ['andando', 'correndo'] },
  virando: { loop: 'virando', proximo: ['reflexiva', 'andando'] },
  rolando: { loop: 'rolando', proximo: ['reflexiva', 'dormindo'] },
  pendurada: { loop: 'pendurada', proximo: ['despencando'] },
  despencando: { loop: 'despencando', pos: { anim: 'despencado', duracao: 2000 }, proximo: ['reflexiva']}
};

const EFEITOS_SONOROS = [
  'comeca-escutar',
  'conseguiu-escutar',
  'cancelou-escuta'].reduce((prev, cur) => {
    prev[cur] = new Audio(`audio/${cur}.mp3`);
    return prev;
  }, {});
  
const COMANDOS_DE_VOZ = {
  parar: ['para', 'parar', 'parado', 'parada'],
  continuar: ['continua', 'continuar', 'continue'],
  ovelhita: ['ovelha', 'ovelhinha', 'ovelhita'],
  rolar: ['rola', 'rolar'],
  voltar: ['volta', 'voltar'],
  limpar: ['limpa', 'limpar']
};

const GRAMATICA = `#JSGF V1.0; grammar comando; public <comando> = ${Object.values(COMANDOS_DE_VOZ).reduce((prev, cur) => prev.concat(cur, [])).join(' | ')} ;`;

const inicializaReconhecimentoDeFala = (callback, microfoneEl) => {
  let prefix = ['', 'webkit', 'moz'];
  for (let p of prefix) {
    if (`${p}SpeechRecognition` in window) {
      prefix = p;
      break;
    }
  }
    
  if (!Array.isArray(prefix)) {
    let reconhecimento = new window[`${prefix}SpeechRecognition`]();
    let palavrasParaReconhecimento = new window[`${prefix}SpeechGrammarList`]();
    palavrasParaReconhecimento.addFromString(GRAMATICA, 1);
    reconhecimento.grammars = palavrasParaReconhecimento;
    reconhecimento.lang = 'pt-BR';
    reconhecimento.continuous = false;
    reconhecimento.interimResults = false;
    reconhecimento.maxAlternatives = 1;
    reconhecimento.start();
    reconhecimento.onresult = (e) => {
      let ultima = e.results.length - 1;
      let comandos = e.results[ultima][0].transcript.trim().toLowerCase().split(' ');

      // cria um balão de texto mostrando o que foi falado/reconhecido ou não
      let balaoComando = document.createElement('output');
      balaoComando.classList.add('balao-comando');
      balaoComando.addEventListener('animationend', (e) => {
        document.body.removeChild(balaoComando)
      });
      let conteudoBalaoComado = [];
      
      // para cada palavra falada nesta frase...
      for (let comando of comandos) {
        let acaoDesteComando = null;
        
        for (let c of Object.keys(COMANDOS_DE_VOZ)) {
          
          if (COMANDOS_DE_VOZ[c].indexOf(comando) !== -1) {
            acaoDesteComando = callback[c];
            // esta palavra foi reconhecida como um comando válido
            conteudoBalaoComado.push(comando);
            break;
          } else {
            conteudoBalaoComado
          }
        }
        
        if (acaoDesteComando !== null) {
          // esta palavra (comando) foi reconhecida
          acaoDesteComando();
        } else {
          // esta palavra (comando) não foi reconhecida
          conteudoBalaoComado.push(`<span class="desconhecido">${comando}</span>`);
        }
      }
      
      // define o conteúdo do balão com os comandos
      balaoComando.innerHTML = conteudoBalaoComado.join(' ');
      document.body.appendChild(balaoComando);
    
      // pára a animação de escuta do microfone      
      microfoneEl.classList.remove('listening');
      EFEITOS_SONOROS['conseguiu-escutar'].play();
    };
    
    reconhecimento.onend = () => {
      microfoneEl.classList.remove('listening');
    };

    reconhecimento.onerror = (e) => {
      reconhecimento.onend();
      EFEITOS_SONOROS['cancelou-escuta'].play();
    };

    reconhecimento.onnomatch = reconhecimento.onerror;
    
    
    return reconhecimento;
  }  
};

const inicializaMicrofone = () => {
  let botaoMicEl = document.createElement('button');
  botaoMicEl.id = 'mic';
  botaoMicEl.className = 'google-microphone';
  let sombraMicEl = document.createElement('div');
  sombraMicEl.className = 'shadow';
  botaoMicEl.appendChild(sombraMicEl);
  let gnMicEl = document.createElement('div');
  gnMicEl.className = 'gn';
  sombraMicEl.appendChild(gnMicEl);
  let mcMicEl = document.createElement('div');
  mcMicEl.className = 'mc';
  gnMicEl.appendChild(mcMicEl);
  document.body.appendChild(botaoMicEl);
};

const vibraTela = () => {
  // chama a vibração da bateria, se houver
  if ('vibrate' in navigator) {
    navigator.vibrate(1000);
  }

  // faz os elementos dentro do tela tremerem
  document.body.classList.add('vibrando');
  document.body.addEventListener('animationend', function(e) {
    e.target.removeEventListener(e.type, arguments.callee);
    document.body.classList.remove('vibrando');
  });
};


class Ovelhita {
  
  constructor(x = 20, y = 20) {
    // dimensões da sprite
    this.largura = 40;
    this.altura = 40;
    // coordenadas que definem a posição do centro da ovelha
    // usamos um sistema de coordenadas que começa no canto direito inferior
    this.x = x;
    this.y = y;
    
    // estado inicial
    this.estado = this.y > 20 ? ESTADOS.despencando : ESTADOS.reflexiva;
    this.tempoNoEstado = 0;
    this.estadosAnteriores = [];
    // para que lado está olhando (1 ou -1)
    this.orientacao = 1;  // olhando para a esquerda

    // horário que o último quadro de atualização foi executado
    this.tempoAntes = 0;    
    // quando esta flag é ativada, a ovelha interrompe sua atualização
    this.deveParar = false;
    
    // força alguns alguns métodos a se ligarem a this para que sejam chamados
    // via callback
    this.segueMouse = this.segueMouse.bind(this);
    this.chacoalha = this.chacoalha.bind(this);
    
    // inicializa vibração, eventos e a sprite
    this.inicializa();    
  }
  
  // define qual animação será tocada
  defineAnimacao(nomeAnimacao) {
    ANIMACOES.forEach((anim) => this.el.classList.remove(anim));
    this.el.classList.add(nomeAnimacao);
  }
  
  // define se a ovelha está olhando para esquerda ou direita
  defineOrientacao(novaOrientacao) {
    if (novaOrientacao <= 0) {
      this.el.classList.add('invertido');
    } else {
      this.el.classList.remove('invertido');
    }
    this.orientacao = novaOrientacao;
  }
  
  // sistema de coordenadas começa na direita e embaixo
  definePosicao(x, y) {
    this.x = x;
    this.el.style.right = `${x - this.largura/2}px`;
    if (!!y) {
      this.y = y
      this.el.style.bottom = `${y - this.altura/2}px`;
    }
  }
  
  // invocada quando quisermos trocar o estado
  mudaEstado(novoEstado) {
    // toca animação de loop do estado
    let tocarAnimLoop = function(e) {
      if (!!e) {
        e.target.removeEventListener(e.type, tocarAnimLoop);
      }
      this.defineAnimacao(novoEstado.loop);
    }.bind(this);
    
    let tocarAnimPre = (e) => {
      if (!!e) {
        e.target.removeEventListener(e.type, tocarAnimPre);
      }
      // pode haver uma animação de entrada do novo estado (de transição)
      if (typeof novoEstado.pre !== 'undefined') {
        this.defineAnimacao(novoEstado.pre.anim || novoEstado.pre);
        
        let duracaoAnimacaoPre = novoEstado.pre.duracao;
        if (typeof duracaoAnimacaoPre !== 'undefined') {
          // a animação prévia de transição deste estado tem uma duração definida
          setTimeout(() => {
            tocarAnimLoop();
          }, duracaoAnimacaoPre);
        } else {
          // a animação não é infinita e termina por ela mesma
          this.el.addEventListener('animationend', tocarAnimLoop);
        }
      } else {
        // não há uma animação de entrada, então vamos executar a animação de loop
        tocarAnimLoop();
      }
    };
    
    let tocarAnimPos = () => {
      // pode haver uma animação de saída do estado atual
      let animacaoPos = this.estado.pos;
      if (typeof animacaoPos !== 'undefined') {
        this.defineAnimacao(animacaoPos.anim || animacaoPos);
        
        let duracaoAnimacaoPos = animacaoPos.duracao;
        if (typeof duracaoAnimacaoPos !== 'undefined') {
          setTimeout(() => {
            tocarAnimPre();
          }, duracaoAnimacaoPos);
        } else {
          this.el.addEventListener('animationend', tocarAnimPre);
        }
      } else {
        tocarAnimPre();
      }
    };
  
    tocarAnimPos();
    
    switch (novoEstado) {
      case ESTADOS.despencando:
        this.velocidadeY = 0;
        break;
    }
    
    this.estadosAnteriores.unshift(this.estado);
    while (this.estadosAnteriores.length > 3) {
      this.estadosAnteriores.pop();
    }
    this.estado = novoEstado;
    this.tempoNoEstado = 0;
  }
  
  sorteiaProximoEstado() {
    return ESTADOS[this.estado.proximo[Math.floor(Math.random() * this.estado.proximo.length)]];
  }
  
  bateuNaTela() {
    return (this.x - this.largura/2 < 0 || this.x + this.largura/2 > window.innerWidth);
  }
  
  saiuDaTela() {
    return (this.x + this.largura/2 < 0 || this.x - this.largura/2 > window.innerWidth);
  }
  
  revolucionaNaTela() {
    let newX;
    if (this.x - this.largura/2 < 0) {
      newX = this.x + window.innerWidth + this.largura/2;
    } else if (this.x + this.largura/2 > window.innerWidth) {
      newX = -this.largura/2;
    }
    this.definePosicao(newX);    
  }
  
  passouDoChao() {
    return (this.y - this.altura/2 < 0);
  }
  
  atualiza(tempo) {
    let delta = tempo - this.tempoAntes;
    this.tempoNoEstado += delta;
    
    switch (this.estado) {
      case ESTADOS.reflexiva:
        if (this.tempoNoEstado > 1000) {
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        break;
        
      case ESTADOS.dormindo:
        if (this.tempoNoEstado > 4000) {
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        break;

      case ESTADOS.andando:
        this.definePosicao(this.x += this.orientacao * .025 * delta);
        if (this.tempoNoEstado > 3000) {
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        if (this.saiuDaTela()) {
          this.revolucionaNaTela();
        }
        if (this.bateuNaTela() && this.estadosAnteriores.indexOf(ESTADOS.virando) === -1) {
          this.mudaEstado(ESTADOS.virando);
        }
        break;
        
      case ESTADOS.correndo:
        this.definePosicao(this.x += this.orientacao * .085 * delta);
        if (this.tempoNoEstado > 2500) {
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        if (this.saiuDaTela()) {
          // dá a volta na tela
          this.revolucionaNaTela();
        }
        break;
      
      case ESTADOS.virando:
        // 500ms é o mesmo tempo definido na animação em CSS
        if (this.tempoNoEstado > 500) {
          this.defineOrientacao(this.orientacao * -1);
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        break;
        
      case ESTADOS.rolando:
        // rola até bater na tela
        this.definePosicao(this.x += this.orientacao * .085 * delta);
        if (this.bateuNaTela()) {
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        break;
      
      case ESTADOS.despencando:
        // vai caindo até atingir o chão
        this.definePosicao(this.x, this.y += this.velocidadeY * .085 * delta);
        this.velocidadeY -= 0.025;
        if (this.passouDoChao()) {
          this.definePosicao(this.x, this.altura/2);
          vibraTela();
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        break;        
    }
    
    if (!this.deveParar && !this.deveDestruir) {
      requestAnimationFrame(this.atualiza.bind(this));
    } else if (this.deveDestruir) {
      this.destroi();
    }
    this.deveParar = false;
    this.tempoAntes = tempo;
  }
  
  inicializa() {
    const inicializaSprite = () => {
      const figureEl = document.createElement('figure');
      figureEl.classList.add('sprite');
      figureEl.classList.add('ovelhita');
      const imgEl = document.createElement('img');
      imgEl.setAttribute('src', 'ovelhita-spritesheet.png');
      imgEl.setAttribute('alt', 'Uma ovelha que anda, corre e faz peripécias');
      imgEl.setAttribute('draggable', 'false');
      figureEl.appendChild(imgEl);
      document.body.appendChild(figureEl);
      this.el = figureEl;
      this.definePosicao(this.x, this.y);
    };
    
    const inicializaChacoalho = () => {
      if (typeof window.Shake !== 'undefined') {
        new Shake().start();
        window.addEventListener('shake', this.chacoalha, false);
      }
    };
    
    const inicializaArraste = () => {
      this.segurando = false;
      this.arrastando = false;
      this.el.addEventListener('mousedown', () => {
        this.segurando = true;
        this.arrastando = false;
      });
      document.addEventListener('mousemove', this.segueMouse);
      this.el.addEventListener('mouseup', () => {
          this.segurando = false;
          if (!this.arrastando){
            // foi feito um clique na ovelha
            if (this.estado === ESTADOS.dormindo) {
              this.mudaEstado(ESTADOS.reflexiva);
            }
          } else {
            // a ovelha estava sendo arrastada e acabou de ser solta
            this.segurando = false;
            this.mudaEstado(ESTADOS.despencando);
          }
          this.arrastando = false;
      });
    };
    
    inicializaSprite();
    inicializaChacoalho();
    inicializaArraste();
    
    // faz a transição para o estado inicial
    this.mudaEstado(this.estado);

    // dá início ao loop de atualização de lógica
    requestAnimationFrame(this.atualiza.bind(this));
  }
  
  destroi() {
    document.removeEventListener('mousemove', this.segueMouse);
    window.removeEventListener('shake', this.chacoalha);
    this.el.remove();
  }
  
  chacoalha() {
    this.mudaEstado(ESTADOS.rolando);
    vibraTela();
  }
  
  segueMouse(e) {
    if (this.segurando) {
      this.arrastando = true;
      this.definePosicao(
        window.innerWidth - e.clientX - this.largura/2,
        window.innerHeight - e.clientY - this.altura/2);
      this.mudaEstado(ESTADOS.pendurada);
    }    
  }
  
  para() {
    this.el.querySelector('img').style.animationPlayState = 'paused';
    this.deveParar = true;
  }
  
  continua() {
    this.tempoAntes = performance.now();
    this.el.querySelector('img').style.animationPlayState = 'running';
    requestAnimationFrame(this.atualiza.bind(this));
  }
  
  rola() {    
    this.mudaEstado(ESTADOS.rolando);
  }
  
  volta() {
    this.mudaEstado(ESTADOS.virando);
  }
  
  limpa() {
    this.deveParar = true;
    this.deveDestruir = true;
  }
};

class Bando {
  constructor() {
    this.ovelhitas = [];
    inicializaMicrofone();
    let microfoneEl = document.querySelector('#mic');
    microfoneEl.addEventListener('click', e => {
      const animatedEl = microfoneEl.firstElementChild;
      
      if (animatedEl.classList.contains('listening')) {
        this.reconhecimento.stop();
        animatedEl.classList.remove('listening');
        EFEITOS_SONOROS['cancelou-escuta'].play();
      } else {
        animatedEl.classList.add('listening');
        EFEITOS_SONOROS['comeca-escutar'].play();
        this.reconhecimento = inicializaReconhecimentoDeFala({
          ovelhita: this.nova.bind(this),
          parar: this.para.bind(this),
          continuar: this.continua.bind(this),
          rolar: this.rola.bind(this),
          voltar: this.volta.bind(this),
          limpar: this.limpa.bind(this)
        }, animatedEl);
      }
    });
  }
  
  nova() {
    let x = Math.random() * (window.innerWidth - 40) + 20;
    let y = Math.random() < .2 ? Math.random() * (window.innerHeight - 40) + 20 : 0;
    setTimeout(() => {
      let nova = new Ovelhita(x, y);
      this.ovelhitas.push(nova);
      requestAnimationFrame(() => nova.el.classList.add('surgiu'));
    }, Math.random() * 350);
  }
  
  para() {
    this.ovelhitas.forEach(o => o.para());
  }

  continua() {
    this.ovelhitas.forEach(o => o.continua());
  }
  
  rola() {
    this.ovelhitas.forEach(o => o.rola());
    vibraTela();
  }
  
  volta() {
    this.ovelhitas.forEach(o => o.volta());
  }
  
  limpa() {
    while(this.ovelhitas.length > 0) {
      this.ovelhitas.pop().limpa();
    }
  }
}

new Bando().nova();