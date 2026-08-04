// Rascunho gerado automaticamente a partir de album-manifest.json,
// agrupando por dia (fuso Asia/Tokyo) e mesclando dias consecutivos que
// compartilham a cidade/bairro dominante do geocoding. É só um ponto de
// partida: edite os textos (placeholder "TODO"), ajuste títulos, e sinta-se
// livre para mesclar, dividir ou reordenar capítulos — este arquivo não é
// regenerado automaticamente.
export interface StoryChapter {
  id: string;
  title: string;
  dateLabel?: string;
  text: string;
  photoIds: string[];
}

export const storyChapters: StoryChapter[] = [
  {
    id: "chapter-1",
    title: "Guarulhos", // TODO: revise o título (nome real do destino)
    dateLabel: "14 de abr.",
    text: "O dia começou cedo, com a mala organizada e aquela ansiedade gostosa de quem sabe que vai pra longe. Pegamos o trem até o aeroporto de Guarulhos, tiramos a primeira foto do casal já com o coração acelerado, e embarcamos assistindo a pista pela janela do avião. Ali começava, de verdade, a viagem que a gente vinha planejando havia meses: rumo ao Japão.",
    photoIds: ["b6d8838c69ba664e", "20535d0f55774458", "4d4d0482503da849", "f790b975e444c7db", "e9db04b7f19d9b57", "87080d7f71fb6b7f"],
  },
  {
    // TODO: bairro de Tóquio — considere renomear/mesclar com outros capítulos de Tóquio.
    id: "chapter-2",
    title: "Chiyoda", // TODO: revise o título (nome real do destino)
    dateLabel: "15 de abr. - 16 de abr.",
    text: "Depois de mais de 24 horas de viagem, finalmente pisamos em Tóquio. Ainda zonzos do fuso, arrastamos as malas pelos corredores do metrô e fomos direto atrás de um udon quentinho com tempura de camarão — a primeira refeição japonesa valeu cada hora de voo. Nos dias seguintes, exploramos as ruas com calma: cafés escondidos, lojinhas cheias de gatinhos de cerâmica na vitrine e aquele clima tranquilo que só Tóquio sabe entregar.",
    photoIds: ["48a0a53a6833d5d5", "fdba0add6f6fd239", "24b6e0dfd002c16e", "be28a72ab3e0b624", "9116fb3079f636cb", "ef3046103f30f697"],
  },
  {
    // TODO: bairro de Tóquio — considere renomear/mesclar com outros capítulos de Tóquio.
    id: "chapter-3",
    title: "Urayasu", // TODO: revise o título (nome real do destino)
    dateLabel: "17 de abr.",
    text: "Dia de criança de novo: fomos para o complexo da Disney em Urayasu e passamos o dia inteiro entre tulipas coloridas, fotos com os personagens e a energia contagiante dos parques. Andamos pela área temática de Toy Story, brincamos com as sombras gigantes do sol da tarde e até topamos com um soldadinho verde puro carisma pra fotografar. Um daqueles dias que a gente guarda no coração.",
    photoIds: ["c8183bdda12617c0", "f754e717af62a36a", "6fd87f9291d49e4e", "ca44818829f968d9", "a46939dc50ab5fbc", "3d1be11b7aef0acd"],
  },
  {
    id: "chapter-4",
    title: "Kanazawa", // TODO: revise o título (nome real do destino)
    dateLabel: "18 de abr. - 19 de abr.",
    text: "Trocamos a agitação de Tóquio pela tranquilidade de Kanazawa. Caminhamos pelos jardins e pelo castelo da cidade bem no auge da temporada das sakuras, com as árvores cobrindo os caminhos de rosa e branco. Paramos em bancos para admirar a paisagem, tiramos fotos embaixo das flores e sentimos, ali, o clássico cartão-postal da primavera japonesa.",
    photoIds: ["3e0906ccb3a93aac", "c851edad93c971aa", "2144d5f06db8e480", "f1d22558bc389bba", "f5068b9866a5fdf2", "45cfe6f9f1581f2a"],
  },
  {
    id: "chapter-5",
    title: "Quioto", // TODO: revise o título (nome real do destino)
    dateLabel: "20 de abr. - 21 de abr.",
    text: "Quioto nos recebeu com um dos cenários mais icônicos do Japão: os milhares de torii vermelhos do Fushimi Inari, formando túneis que pareciam não ter fim. Subimos entre os portões, paramos para purificar as mãos na fonte tradicional antes de entrar nos templos e caminhamos por becos e santuários com aquele silêncio meio sagrado que só os templos antigos têm.",
    photoIds: ["1b3a933ba44ebd1b", "5e41621a18c46e69", "3b9ad58dc3f12184", "e1faf6912396539a", "a58ab8fc362082f3", "7a23d0dd206803d1"],
  },
  {
    id: "chapter-6",
    title: "Hiroshima", // TODO: revise o título (nome real do destino)
    dateLabel: "22 de abr.",
    text: "Hiroshima é daquelas cidades que mexem com a gente. Começamos o dia com um okonomiyaki feito na chapa bem na nossa frente e demos uma passeada pelas lojinhas locais, mas a tarde foi tomada pelo Parque Memorial da Paz: o campo de margaridas, os origamis de tsuru pendurados em homenagem às vítimas e, por fim, a Cúpula da Bomba Atômica, preservada como ficou depois de 1945. Uma visita difícil, mas necessária.",
    photoIds: ["7c075c336832981e", "f39fd7fc8976e4fd", "dab72242004bbdf5", "26742e5b89d89b29", "295636fd359f16ea", "c86b35e712e90067"],
  },
  {
    id: "chapter-7",
    title: "Hatsukaichi", // TODO: revise o título (nome real do destino)
    dateLabel: "23 de abr.",
    text: "Pegamos a balsa em direção a Miyajima e vimos o famoso torii flutuante do santuário Itsukushima surgir em meio à neblina que cobria as montanhas da ilha. Entre uma caminhada e outra, paramos numa padaria local pra escolher docinhos e comemos tudo ainda quente, de mãos dadas, esperando a próxima parte do passeio.",
    photoIds: ["4ae0d173f7c81b8c", "4646207e4f427c97", "a3e2e6e208371815", "9e9b4f7d871e9f00", "544d4ec8704d74ae", "4ab05147a59a2ff8"],
  },
  {
    id: "chapter-8",
    title: "Osaka", // TODO: revise o título (nome real do destino)
    dateLabel: "24 de abr.",
    text: "Osaka começou com os letreiros gigantes de Dotonbori — inclusive o famoso corredor do Glico — e terminou dentro do Universal Studios Japan. Passamos o dia inteiro no parque: exploramos o Super Nintendo World, tiramos foto ao lado do Mario e do Luigi, visitamos o castelo de Hogwarts na área do Wizarding World. Um dia inteiro de nostalgia e adrenalina.",
    photoIds: ["dc3ca71fa118d9b8", "fa73ab97d45f9742", "505384259607fa20", "4d8ed80c256fe9a6", "1d34b67ecfb33545", "977f3f5ddf5ca4a2"],
  },
  {
    id: "chapter-9",
    title: "Nara", // TODO: revise o título (nome real do destino)
    dateLabel: "25 de abr.",
    text: "Em Nara, quem manda são os veados: eles andam soltos pelo parque, cutucam a gente pedindo biscoito e posam sem susto pra qualquer foto. Caminhamos entre o santuário e o museu da cidade, paramos pra fazer carinho em alguns deles e nos divertimos com a curiosidade (e a fome) desses bichinhos que parecem ser donos do lugar.",
    photoIds: ["d19a33f0842986b2", "3e14aba94b1de677", "2c52e5e9d5aea490", "84a3e6d1be4d443e", "8fcce60d42a7dad8", "7803d2c4c67d71ac"],
  },
  {
    id: "chapter-10",
    title: "Osaka", // TODO: revise o título (nome real do destino)
    dateLabel: "26 de abr.",
    text: "De volta a Osaka, o dia foi de água e altura: visitamos o aquário Kaiyukan, vimos pinguins de pertinho e depois subimos na roda-gigante de Tempozan pra ver a cidade lá de cima. Entre risadas dentro da cabine e a vista da baía, fechamos com chave de ouro mais um dia por essa cidade que a gente já estava começando a amar.",
    photoIds: ["fbe5613f10fe4901", "2531616ba68783e6", "bbbe51af4aa92922", "cd9129351c1161af", "839a15464a2b292a", "4779cac31da1482d"],
  },
  {
    // TODO: bairro de Tóquio — considere renomear/mesclar com outros capítulos de Tóquio.
    id: "chapter-11",
    title: "Chiyoda", // TODO: revise o título (nome real do destino)
    dateLabel: "27 de abr.",
    text: "De volta a Tóquio, aproveitamos pra rever a região com outros olhos. Vimos um sushiman preparando cada peça com uma precisão impressionante, demos uma volta tranquila pelo parque entre árvores e um Skyline GT-R estacionado que chamou a atenção de longe. Tóquio sempre tem um detalhe novo pra surpreender.",
    photoIds: ["c8183bdda12617c0", "3a316cc75899653c", "4695bd5ef01e780b", "c04953b07973aa06", "1a1ac88282720871", "c859da6adbd69ad4"],
  },
  {
    // TODO: bairro de Tóquio — considere renomear/mesclar com outros capítulos de Tóquio.
    id: "chapter-12",
    title: "Taito", // TODO: revise o título (nome real do destino)
    dateLabel: "28 de abr.",
    text: "Caminhamos até o templo Senso-ji e paramos pra admirar o pagode de cinco andares e as lanternas gigantes cheias de kanji na entrada. Também subimos até o mirante da Tokyo Skytree pra ver a cidade inteira lá embaixo e fechamos o dia relaxando em um onsen, com aquele som de água corrente que só a natureza japonesa sabe entregar.",
    photoIds: ["443adb5e1eac7f55", "8a2d1c6c47754195", "c0142bac75a2dddf", "514405fcff4a6d43", "140a682541d4e14e", "30306e72f7cbbbb1"],
  },
  {
    // TODO: bairro de Tóquio — considere renomear/mesclar com outros capítulos de Tóquio.
    id: "chapter-13",
    title: "Shibuya", // TODO: revise o título (nome real do destino)
    dateLabel: "29 de abr.",
    text: "Shibuya é puro caos organizado, e a gente amou cada minuto. Fizemos a visita clássica à estátua do Hachiko, vimos um grupo de kartings fantasiados cruzando o cruzamento mais famoso do mundo. À noite, entre ciclistas, luzes de neon e o movimento constante da rua, sentimos de verdade a energia de Tóquio.",
    photoIds: ["ac504fb814b2578c", "52717714e3b27047", "3637cc94dc8c54f6", "891d1ce1940ee5b4"],
  },
  {
    // TODO: bairro de Tóquio — considere renomear/mesclar com outros capítulos de Tóquio.
    id: "chapter-14",
    title: "Shinjuku", // TODO: revise o título (nome real do destino)
    dateLabel: "30 de abr.",
    text: "Nosso último dia por Tóquio foi em Shinjuku, entre telões gigantes, propagandas de anime e a cabeça do Godzilla espiando por cima de um prédio em Kabukicho. Passamos por uma loja cheia de action figures e estátuas de colecionador — incluindo um dinossauro em tamanho quase real — e aproveitamos pra guardar essas últimas imagens de uma viagem que passou rápido demais.",
    photoIds: ["5ddddf1f8f475a44", "d94fb597615f4aaf", "97e46536faf6c1d9", "ca0b8d4b0d3133ad", "1c48cb47f0e0759a", "09c7f5e0e1dfcdf9"],
  },
];
