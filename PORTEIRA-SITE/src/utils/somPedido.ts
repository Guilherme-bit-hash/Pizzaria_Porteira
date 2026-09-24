// src/utils/somPedido.ts
// Bipe curto (dois tons) tocado no painel admin quando chega um pedido novo (ver AdminPedidos.tsx).
// Gerado na hora com a Web Audio API, sem precisar de nenhum arquivo de áudio.

// Reaproveita o mesmo AudioContext entre chamadas — criar um novo a cada bipe é desnecessário
// e alguns navegadores limitam quantos podem existir ao mesmo tempo.
let audioContext: AudioContext | null = null

// Toca uma nota: uma onda senoidal que sobe de volume instantaneamente e decai suave
// (evita o "clique" seco que um corte abrupto de volume causaria).
function tocarTom(frequencia: number, inicioSegundos: number, duracaoSegundos: number, ctx: AudioContext) {
  const oscilador = ctx.createOscillator()
  const ganho = ctx.createGain()

  oscilador.type = 'sine'
  oscilador.frequency.value = frequencia

  ganho.gain.setValueAtTime(0.3, ctx.currentTime + inicioSegundos)
  ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicioSegundos + duracaoSegundos)

  oscilador.connect(ganho)
  ganho.connect(ctx.destination)

  oscilador.start(ctx.currentTime + inicioSegundos)
  oscilador.stop(ctx.currentTime + inicioSegundos + duracaoSegundos)
}

// Toca o aviso de "pedido novo": duas notas em sequência (tipo um "ding-dong").
export function tocarSomNovoPedido() {
  try {
    if (!audioContext) {
      audioContext = new AudioContext()
    }
    // Navegadores suspendem o áudio até haver alguma interação do usuário na página;
    // como o admin já passou pela tela de login, resume() aqui costuma funcionar de primeira.
    if (audioContext.state === 'suspended') {
      audioContext.resume()
    }

    tocarTom(880, 0, 0.15, audioContext)
    tocarTom(1108, 0.18, 0.22, audioContext)
  } catch (error) {
    // Navegador sem suporte a Web Audio, ou áudio bloqueado — o toast visual já basta.
    console.error('Não foi possível tocar o som de novo pedido:', error)
  }
}
