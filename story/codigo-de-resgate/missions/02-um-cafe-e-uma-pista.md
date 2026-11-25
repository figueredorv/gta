---
id: 02-um-cafe-e-uma-pista
title: Capítulo 2 — Um café e uma pista
start: COM-001
pickup: COM-003
pickup_objective: Busque [ITEM-modulo-diagnostico] no [COM-003]. Entre a pé e recolha a peça reservada por Davi.
target: COM-002
objective: Leve [ITEM-modulo-diagnostico] para Davi na [COM-002] e recupere o registro do computador da feira.
give_item: modulo-diagnostico
require_item: modulo-diagnostico
delivery_prompt: Davi precisa do Módulo de Diagnóstico para estabilizar o computador. Selecione a peça recolhida no café.
wrong_item_message: Preciso do módulo de memória testado. A caneca não vai caber nesse encaixe!
---

## CUTSCENE_INICIO
left: ruan
right: davi
bg: Ateliê da Feira — Camilla

- Narrador: O recibo encontrado por Ruan liga o projeto da feira à Assistência Técnica Ponto de Restauração. Camilla telefona para o responsável e coloca os dois em contato.
- Davi (telefone): Ruan? Sou Davi. Esse computador veio com os alunos da feira. A professora Fátima autorizou a manutenção, mas depois mandou uma mensagem pedindo para guardar tudo como estava.
- Ruan Figueiredo: Ela está presa na escola. A direção já está procurando por ela. Precisamos entender o que aconteceu com esse projeto antes de o áudio ser interrompido.
- Davi (telefone): Então ela tinha razão em desconfiar. O computador está aqui, sem acesso à rede. Fiz uma cópia do disco, mas a máquina está reiniciando por defeito na memória.
- Ruan Figueiredo: Um bug que resolve virar defeito de hardware bem na hora errada. Tem alguma peça que eu possa buscar?
- Davi (telefone): Tem. Eu organizo uma bancada de doações no [COM-003]. Deixei um módulo de memória testado numa embalagem identificada. Pegue [ITEM-modulo-diagnostico] e traga para a [COM-002].
- Ruan Figueiredo: Café, peça de computador e uma pista. Parece minha rotina de trabalho... só que hoje alguém está contando comigo de verdade.
- OPCAO: Vou buscar a peça. Preserve a cópia do disco até eu chegar. -> NEXT
- OPCAO: Hoje o café fica para depois. Primeiro vamos encontrar Fátima. -> NEXT
- Davi (telefone): Combinado. Vou preparar a bancada. E se aparecer uma caneca na sua mochila, não confunda com a peça: já tentaram me pagar um conserto com uma dessas!
- Narrador: Vá ao Café Ponto de Encontro, entre a pé e recolha o módulo. Depois, siga a nova rota até a assistência técnica para falar com Davi.

## CUTSCENE_FIM
left: ruan
right: davi
bg: Assistência Técnica Ponto de Restauração

- Davi: Chegou, Ruan! A bancada está pronta. Trouxe o módulo que deixei reservado no café?
- Ruan Figueiredo: Aqui está. Vamos trabalhar na cópia e manter o disco original guardado.
- ENTREGAR: modulo-diagnostico
- Narrador: Davi instala a memória testada e a máquina volta a funcionar. Ruan abre a cópia de recuperação do projeto da feira.
- Davi: Tem um arquivo chamado "sala_32.html". Só que o mapa atual da escola termina na sala 24. Isso não faz sentido.
- Ruan Figueiredo: Vamos ler o código antes de confiar na tela. Olha este comentário: "O nome mudou. A sala continuou no mesmo lugar. Consulte a planta anterior à reforma. — F. M."
- Davi: Então Fátima deixou uma instrução escondida onde os alunos provavelmente não iam procurar.
- Ruan Figueiredo: E o registro de manutenção mostra uma conexão na ala antiga, antes de desativarem o ponto de rede. O horário coincide com a última mensagem dela.
- Narrador: Ruan volta a ouvir a mensagem que Fátima enviou antes de o celular ficar sem bateria. Agora, as palavras dela fazem sentido.
- Fátima Micaella (áudio anterior): Procure o projeto da feira... a resposta está nos comentários. Fale com a Camilla. Não apague nada.
- Narrador: Três batidas. Uma pausa. Outras duas. Ruan anota a sequência ao lado do nome do arquivo: sala_32.html.
- Ruan Figueiredo: Três e duas. Trinta e dois. Não era só um ruído no telefone: ela estava apontando para a numeração antiga da sala!
- Davi: O senhor Mauro cuidava da manutenção da escola antes da reforma. Mora na [CASA-002]. Se alguém guardou uma planta antiga, foi ele.
- Ruan Figueiredo: Vou procurá-lo. Camilla já está recebendo uma cópia desses registros para repassar à direção. Você acabou de dar um endereço para a nossa esperança, Davi.
- Davi: Então leva ela até o fim. E depois traz a professora aqui: prometi arrumar o computador antes da próxima aula.
- Narrador: CAPÍTULO 2 CONCLUÍDO — O registro aponta para a antiga sala de informática. A próxima pista é a planta guardada por Mauro. Fátima ainda precisa ser resgatada.
- Narrador: A investigação continua no capítulo 3, "A sala que não existe", em uma futura atualização. Por enquanto, explore a cidade ou repita os capítulos disponíveis pelo menu de pausa.
