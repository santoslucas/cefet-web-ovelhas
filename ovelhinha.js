

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

let ovelha = {
  el: document.querySelector('#ovelha'),
  
  // estado inicial
  estado: ESTADOS.reflexiva,
  tempoNoEstado: 0,
  estadosAnteriores: [],
  orientacao: 1,
  
  // define qual animação será tocada
  defineAnimacao: function(nomeAnimacao) {
    ANIMACOES.forEach((anim) => this.el.classList.remove(anim));
    this.el.classList.add(nomeAnimacao);
  },
  
  // define se a ovelha está olhando para esquerda ou direita
  defineOrientacao: function(novaOrientacao) {
    if (novaOrientacao <= 0) {
      this.el.classList.add('invertido');
    } else {
      this.el.classList.remove('invertido');
    }
    this.orientacao = novaOrientacao;
  },
  
  largura: 40,
  altura: 40,
  // coordenadas definem a posição do centro da ovelha
  x: 20,
  y: 20,
  // sistema de coordenadas começa na direita e embaixo
  definePosicao: function(x, y) {
    this.x = x;
    this.el.style.right = `${x - this.largura/2}px`;
    if (!!y) {
      this.y = y
      this.el.style.bottom = `${y - this.altura/2}px`;
    }
  },
  
  // invocada quando quisermos trocar o estado
  mudaEstado: function(novoEstado) {
    // toca animação de loop do estado
    let tocarAnimLoop = (e) => {
      if (!!e) {
        e.target.removeEventListener(e.type, arguments.callee);
      }
      this.defineAnimacao(novoEstado.loop);
    };
    
    let tocarAnimPre = (e) => {
      if (!!e) {
        e.target.removeEventListener(e.type, arguments.callee);
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
  },
  
  sorteiaProximoEstado: function() {
    return ESTADOS[this.estado.proximo[Math.floor(Math.random() * this.estado.proximo.length)]];
  },
  
  bateuNaTela: function() {
    return (this.x - this.largura/2 < 0 || this.x + this.largura/2 > window.innerWidth);
  },
  
  saiuDaTela: function() {
    return (this.x + this.largura/2 < 0 || this.x - this.largura/2 > window.innerWidth);
  },
  
  revolucionaNaTela: function() {
    let newX;
    if (this.x - this.largura/2 < 0) {
      newX = this.x + window.innerWidth + this.largura/2;
    } else if (this.x + this.largura/2 > window.innerWidth) {
      newX = -this.largura/2;
    }
    this.definePosicao(newX);    
  },
  
  passouDoChao: function() {
    return (this.y - this.altura/2 < 0);
  },
  
  tempoAntes: 0,
  atualiza: function(tempo) {
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
          this.mudaEstado(this.sorteiaProximoEstado());
        }
        break;        
    }
    
    if (!this.deveParar) {
      requestAnimationFrame(this.atualiza.bind(this));
    }
    this.deveParar = false;
    this.tempoAntes = tempo;
  },
  
  inicializa: function() {
    
    let inicializaChacoalho = () => {
      if (typeof window.Shake !== 'undefined') {
        new Shake().start();
        window.addEventListener('shake', () => this.mudaEstado(ESTADOS.rolando), false);
      }
    };
    
    let inicializaArraste = () => {
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
    
    inicializaChacoalho();
    inicializaArraste();    
    
    requestAnimationFrame(this.atualiza.bind(this));
  },
  
  deveParar: false,
  para: function() {
    this.deveParar = true;
  }
};


ovelha.inicializa();
