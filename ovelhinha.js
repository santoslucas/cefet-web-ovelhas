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

const COMANDOS_DE_VOZ = ['parar', 'continuar', 'ovelhita'];
const gramatica = `#JSGF V1.0; grammar comando; public <comando> = ${COMANDOS_DE_VOZ.join(' | ')} ;`;

const inicializaReconhecimentoDeFala = (callback) => {
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
    palavrasParaReconhecimento.addFromString(gramatica, 1);
    reconhecimento.grammars = palavrasParaReconhecimento;
    reconhecimento.language = 'pt-BR';
    reconhecimento.contiuous = true;
    reconhecimento.interimResults = true;
    reconhecimento.maxAlternatives = 1;
    reconhecimento.start();
    // reconhecimento.addEventListener('result', (e) => {
    reconhecimento.onresult = (e) => {
      let ultima = e.results.lenght - 1;
      let comando = e.results[ultima][0].transcript;
      if (comando in callback) {
        callback[comando];
      }
    // });
    };
  }
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
    this.estado = ESTADOS.reflexiva;
    this.tempoNoEstado = 0;
    this.estadosAnteriores = [];
    // para que lado está olhando (1 ou -1)
    this.orientacao = 1;  // olhando para a esquerda

    // horário que o último quadro de atualização foi executado
    this.tempoAntes = 0;    
    // quando esta flag é ativada, a ovelha interrompe sua atualização
    this.deveParar = false;
    
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
    
    if (!this.deveParar) {
      requestAnimationFrame(this.atualiza.bind(this));
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
        window.addEventListener('shake', () => {
          this.mudaEstado(ESTADOS.rolando);
          vibraTela();
        }, false);
      }
    };
    
    const inicializaArraste = () => {
      let segurando = false,
        arrastando = false;
      this.el.addEventListener('mousedown', () => {
        segurando = true;
        arrastando = false;
      });
      document.addEventListener('mousemove', (e) => {
        if (segurando) {
          arrastando = true;
          this.definePosicao(
            window.innerWidth - e.clientX - this.largura/2,
            window.innerHeight - e.clientY - this.altura/2);
          this.mudaEstado(ESTADOS.pendurada);
        }
      });
      this.el.addEventListener('mouseup', () => {
          segurando = false;
          if (!arrastando){
            // foi feito um clique na ovelha
            if (this.estado === ESTADOS.dormindo) {
              this.mudaEstado(ESTADOS.reflexiva);
            }
          } else {
            // a ovelha estava sendo arrastada e acabou de ser solta
            segurando = false;
            this.mudaEstado(ESTADOS.despencando);
          }
          arrastando = false;
      });
    };
    
    inicializaSprite();
    inicializaChacoalho();
    inicializaArraste();
    
    requestAnimationFrame(this.atualiza.bind(this));
  }
  
  para() {
    this.deveParar = true;
  }
  
  continua() {
    requestAnimationFrame(this.atualiza.bind(this));
  }
};

class Bando {
  constructor() {
    this.ovelhitas = [];
    inicializaReconhecimentoDeFala({ 
      ovelhita: this.nova,
      parar: this.para,
      continuar: this.continua
    });
  }
  
  nova() {
    this.ovelhitas.push(new Ovelhita());
  }
  
  para() {
    this.ovelhitas.forEach((o) => o.para());
  }

  continua() {
    this.ovelhitas.forEach((o) => o.continua());
  }
}



new Bando().nova();