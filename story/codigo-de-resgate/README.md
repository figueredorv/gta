# Aracaju: Código de Resgate

Primeira versão jogável: capítulo 1, **Mensagem interrompida**.

## Jogar

- Local: http://127.0.0.1:8080/?story=codigo-de-resgate
- Online: https://figueredorv.github.io/gta/?story=codigo-de-resgate
- Também disponível na seleção de histórias da abertura.

Ruan Figueiredo recebe o áudio de Fátima Micaella no apartamento, busca o
Pendrive da Feira na praça e o leva para Camilla no Ateliê da Feira. A entrega revela
uma assistência técnica e encerra o primeiro capítulo. Fátima ainda não foi
resgatada nesta versão. O menu de pausa permite repetir a missão.

WASD/setas movimentam, M abre o mapa, Espaço interage e I abre o inventário.
Siga os avisos na tela e entre a pé no comércio para falar com Camilla.
Caio pode ser encontrado no Café Ponto de Encontro, numa conversa opcional.
A Caneca do Ruan é um colecionável opcional e não serve para entregar a Camilla.

## Próximos capítulos planejados

2. Um café e uma pista — recuperar o registro do computador na assistência.
3. A sala que não existe — encontrar a planta antiga da escola.
4. O aluno que voltou atrás — recuperar o crachá e as provas com Caio.
5. A última chamada — descobrir a sequência das chaves e chegar à sala.
6. Código de resgate — retirar Fátima da escola e entregar as provas.

Esses cinco capítulos são roteiro futuro, ainda sem missões executáveis.

## Conteúdo e imagens

As fichas em `characters/` definem nomes, perfis e imagens. Os retratos e
sprites foram reaproveitados do projeto original e são provisórios. O campo
`sprite_cutscene` de cada ficha poderá apontar para a foto personalizada depois.
A capa vetorial é provisória e não retrata os personagens.

As 62 vias do mapa receberam nomes de Aracaju; a lista e suas fontes públicas
estão em `map/ruas-aracaju.json`. Os nomes não alteram a geometria procedural:
cruzamentos, distâncias, escola e estabelecimentos são fictícios.

Missões e diálogos ficam em `missions/`, itens em `items/` e locais em
`map/map.md`. A campanha usa seu próprio identificador e progresso salvo.
