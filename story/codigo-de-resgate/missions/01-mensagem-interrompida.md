---
id: 01-mensagem-interrompida
title: Capítulo 1 — Mensagem interrompida
start: CASA-001
pickup: PRACA-001
pickup_objective: Recupere [ITEM-pendrive-feira] na [PRACA-001]. Abra o mapa com M para seguir a rota.
target: COM-001
objective: Leve [ITEM-pendrive-feira] para Camilla no [COM-001] e descubra a primeira pista de Fátima.
give_item: pendrive-feira
require_item: pendrive-feira
delivery_prompt: Camilla precisa do pendrive da feira para ler a pista de Fátima. Selecione o pendrive no inventário.
wrong_item_message: Esse não é o pendrive da feira. Confira o nome do item na mochila.
---

## CUTSCENE_INICIO
left: ruan
right: fatima
bg: Frente do [CASA-001]

- Narrador: Aracaju, fim de tarde. Ruan Figueiredo está terminando mais um projeto quando uma mensagem de Fátima Micaella interrompe o silêncio.
- Ruan Figueiredo: Fátima? Você já saiu da escola? Separei aquele exemplo de programação para a sua turma.
- Fátima Micaella (áudio): Ruan, escuta com atenção. Alguns alunos da Turma do Zero me trancaram numa sala. Descobri que estavam adulterando as notas. Eles querem meu acesso ao sistema.
- Fátima Micaella (áudio): Ainda estou bem. Meu celular está quase sem bateria. Procure o projeto da feira... a resposta está nos comentários. Fale com a Camilla. Não apague nada.
- Narrador: Três batidas. Uma pausa. Outras duas. O áudio termina antes de Ruan conseguir responder.
- Ruan Figueiredo: Três e duas... vou guardar isso. Fátima, eu vou te encontrar.
- Narrador: Ruan avisa a direção da escola e pede ajuda. Enquanto tentam localizar a sala, ele liga para Camilla, colega de Fátima.
- Camilla (telefone): Eu estava organizando a feira na [PRACA-001]. Fátima deixou um pendrive com uma fita amarela perto do banco, mas eu precisei sair às pressas. Pode estar lá!
- Ruan Figueiredo: Um projeto cheio de comentários... finalmente meus hábitos de programador vão servir para alguma coisa fora do computador.
- OPCAO: Vou buscar o pendrive e preservar a pista de Fátima. -> NEXT
- OPCAO: Primeiro a pista, depois a depuração. Estou indo! -> NEXT
- Camilla (telefone): Pegue [ITEM-pendrive-feira] na [PRACA-001] e me encontre no [COM-001]. Vou preparar um computador para ler uma cópia, sem alterar o original.
- Narrador: Use WASD ou as setas para andar. M abre o mapa e mostra a rota. Ao encontrar o pendrive, aproxime-se e siga a indicação de ação na tela.

## CUTSCENE_FIM
left: ruan
right: camilla
bg: Interior do [COM-001]

- Camilla: Ruan! Conseguiu encontrar o pendrive com a fita amarela?
- Ruan Figueiredo: Consegui. Se Fátima deixou uma mensagem ali, vamos encontrá-la.
- ENTREGAR: pendrive-feira
- Narrador: Camilla guarda o pendrive original. Ruan abre uma cópia do projeto da feira e procura os comentários no código.
- Ruan Figueiredo: Aqui: "Se eu não conseguir voltar, procure a última máquina que recebeu este projeto. O recibo está em documentos. — F. M."
- Camilla: Tem um recibo da [COM-002]. Foi lá que os alunos levaram o computador da apresentação!
- Ruan Figueiredo: E o arquivo foi alterado por alguém chamado Admin. É o mesmo apelido mencionado no áudio encaminhado pela direção.
- Camilla: Então a assistência é nossa próxima pista. Já enviei uma cópia dessas informações à direção. Você não está sozinho nessa.
- Ruan Figueiredo: Aguenta firme, Fátima. Já encontrei o começo do caminho.
- Narrador: CAPÍTULO 1 CONCLUÍDO — Você recuperou o pendrive e identificou a assistência técnica. Fátima ainda precisa ser resgatada. O capítulo 2, "Um café e uma pista", será a próxima etapa desta aventura.
- Narrador: Por enquanto, explore a cidade, converse com Caio no [COM-003] ou repita este capítulo pelo menu de pausa. As próximas cinco missões ainda estão em desenvolvimento.
