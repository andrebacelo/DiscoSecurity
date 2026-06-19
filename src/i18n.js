// I18N — traduções do jogo
//
// Como funciona:
//  1. As cenas carregam i18n/pt.json e i18n/en.json no preload() (this.load.json);
//  2. No create(), chamam I18N.carregar(this) para ler os JSON da cache;
//  3. Todo o texto da UI passa por I18N.t('chave') em vez de string fixa;
//  4. Trocar de língua nas OPÇÕES chama I18N.trocar() e reinicia a cena
//     (scene.restart), que redesenha tudo já na língua nova.
//
// É um objeto global simples (sem módulos) porque o projeto usa script tags.
const I18N = {
  // Ordem de rotação das línguas (o botão IDIOMA passa à seguinte e dá a volta).
  LINGUAS: ['pt', 'en', 'es'],

  // Língua ativa: recupera a última escolha do localStorage (sobrevive a
  // fechar o separador). O try/catch protege contra modo privado/bloqueado.
  lingua: (() => {
    try {
      const guardada = localStorage.getItem('discosecurity-lingua');
      // Só aceita uma língua conhecida; senão, cai no português.
      return ['pt', 'en', 'es'].includes(guardada) ? guardada : 'pt';
    } catch (e) { return 'pt'; }
  })(),
  textos: { pt: null, en: null, es: null },

  // Lê os JSON (já carregados pelo loader da cena) para a memória.
  carregar(cena) {
    this.textos.pt = cena.cache.json.get('i18n-pt');
    this.textos.en = cena.cache.json.get('i18n-en');
    this.textos.es = cena.cache.json.get('i18n-es');
  },

  // Devolve o texto na língua ativa. Se a chave não existir, devolve a
  // própria chave — assim um texto em falta nota-se logo no ecrã.
  t(chave) {
    const dicionario = this.textos[this.lingua];
    return (dicionario && dicionario[chave]) || chave;
  },

  trocar() {
    // Avança para a próxima língua da lista e dá a volta no fim (% length).
    const i = this.LINGUAS.indexOf(this.lingua);
    this.lingua = this.LINGUAS[(i + 1) % this.LINGUAS.length];
    try { localStorage.setItem('discosecurity-lingua', this.lingua); } catch (e) { /* sem storage */ }
  },
};
