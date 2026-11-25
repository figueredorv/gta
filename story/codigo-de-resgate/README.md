# Aracaju: Código de Resgate

Versão jogável com dois capítulos: **Mensagem interrompida** e **Um café e uma pista**.

## Jogar

- Local: http://127.0.0.1:8080/?story=codigo-de-resgate
- Online: https://figueredorv.github.io/gta/?story=codigo-de-resgate
- Também disponível na seleção de histórias da abertura.

Ruan Figueiredo recebe o áudio de Fátima Micaella no apartamento, busca o
Pendrive da Feira na praça e o leva para Camilla no Ateliê da Feira. A entrega revela
uma assistência técnica e encerra o primeiro capítulo. Escolha **Próxima Missão**
para falar com Davi, buscar o Módulo de Diagnóstico no café e levá-lo à assistência.
A recuperação do computador revela uma pista da antiga sala de informática.
Fátima ainda não foi resgatada nesta versão.

Se você já concluiu o capítulo 1, atualize a página e use **Continuar (Missão 2)**.
O jogo restaura seu progresso e inicia o novo capítulo com a cena de abertura.
Quem ainda está no capítulo 1 continua normalmente. O menu de pausa permite
repetir os capítulos desbloqueados.

WASD/setas movimentam, M abre o mapa, Espaço interage e I abre o inventário.
Siga os avisos na tela e entre a pé no comércio para falar com Camilla.
No capítulo 2, entre a pé no café para recolher a peça e depois na assistência
para falar com Davi. A entrega exige o Módulo de Diagnóstico.
Caio pode ser encontrado no Café Ponto de Encontro, numa conversa opcional.
A Caneca do Ruan é um colecionável opcional e não serve para entregar a Camilla.

## Próximos capítulos planejados

3. A sala que não existe — encontrar a planta antiga da escola.
4. O aluno que voltou atrás — recuperar o crachá e as provas com Caio.
5. A última chamada — descobrir a sequência das chaves e chegar à sala.
6. Código de resgate — retirar Fátima da escola e entregar as provas.

Esses quatro capítulos são roteiro futuro, ainda sem missões executáveis.

## Conteúdo e imagens

As fichas em `characters/` definem nomes, perfis e imagens. Ruan e Fátima têm
personagens ilustrados de corpo inteiro a partir das fotos fornecidas, com PNGs
transparentes próprios para as cenas. O personagem jogável de Ruan usa o modelo
vetorial compacto original, recolorido com roupa marrom, pele morena e cabelo
escuro, permitindo que braços e pernas animados permaneçam visíveis ao andar.
Os arquivos são `assets/ruan-corpo-inteiro.png`, `assets/fatima-corpo-inteiro.png`,
`assets/ruan-jogavel-{top,front,left,right}.svg` e `assets/fatima-mapa.png`. A arte dos coadjuvantes continua
provisória. Os prompts e o processo estão em `../../docs/arte-personagens.md`.
A capa vetorial é provisória e não retrata os personagens.

As 62 vias do mapa receberam nomes de Aracaju; a lista e suas fontes públicas
estão em `map/ruas-aracaju.json`. Os nomes não alteram a geometria procedural:
cruzamentos, distâncias, escola e estabelecimentos são fictícios.

Missões e diálogos ficam em `missions/`, itens em `items/` e locais em
`map/map.md`. A campanha usa seu próprio identificador e progresso salvo.
