// Som — definições de volume do jogo: MÚSICA e EFEITOS em separado.
// Guardadas no localStorage (sobrevivem a fechar o separador), como a língua.
//
// As cenas tocam efeitos com Som.efeito(cena, chave, base) e criam a música
// com Som.volMusicaFaixa(chave). Cada valor (0 a 1) é um "master" que
// multiplica o volume-base afinado de cada som — pôr a 0 desliga.
const Som = {
  PASSOS: [0, 0.25, 0.5, 0.75, 1], // níveis ao clicar (0% … 100%)
  musica: 1,                        // master da música
  efeitos: 1,                       // master dos efeitos

  // Volume "100%" de cada faixa de música (o equilíbrio já afinado).
  BASE_MUSICA: { 'musica-menu': 0.2, 'musica-perseguicao': 0.1 },

  carregar() {
    try {
      const m = parseFloat(localStorage.getItem('ds-vol-musica'));
      const e = parseFloat(localStorage.getItem('ds-vol-efeitos'));
      if (!isNaN(m)) this.musica = m;
      if (!isNaN(e)) this.efeitos = e;
    } catch (err) { /* sem localStorage */ }
  },

  guardar() {
    try {
      localStorage.setItem('ds-vol-musica', this.musica);
      localStorage.setItem('ds-vol-efeitos', this.efeitos);
    } catch (err) { /* sem localStorage */ }
  },

  // Toca um efeito: volume = base afinado × master de efeitos.
  efeito(cena, chave, base = 1) {
    if (cena.cache.audio.exists(chave)) {
      cena.sound.play(chave, { volume: base * this.efeitos });
    }
  },

  // Volume final de uma faixa de música (base × master).
  volMusicaFaixa(chave) {
    return (this.BASE_MUSICA[chave] || 0.3) * this.musica;
  },

  // Re-aplica o volume a uma instância de música a tocar (ao mudar nas opções).
  aplicarMusica(inst) {
    if (inst) inst.setVolume(this.volMusicaFaixa(inst.key));
  },

  // Avança um valor para o próximo passo (dá a volta no fim).
  proximo(valor) {
    const i = this.PASSOS.indexOf(valor);
    return this.PASSOS[(i + 1) % this.PASSOS.length];
  },

  percent(valor) {
    return Math.round(valor * 100) + '%';
  },
};
