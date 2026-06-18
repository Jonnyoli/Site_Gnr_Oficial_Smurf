export type SchoolTrainingCode =
  | "DETENCAO_MDT"
  | "COMUNICACAO"
  | "APREENSAO_VIATURAS"
  | "ABORDAGEM_TRANSITO"
  | "FUGA_AUTORIDADES";

export type SchoolTrainingDefinition = {
  code: SchoolTrainingCode;
  title: string;
  shortTitle: string;
  mandatory: boolean;
  icon: string;
  description: string;
  objectives: string[];
  contents: {
    title: string;
    items: string[];
  }[];
  practicalGuide: string[];
  commonErrors: string[];
  criteria: string[];
};

export const SCHOOL_TRAININGS: SchoolTrainingDefinition[] = [
  {
    code: "DETENCAO_MDT",
    title: "Formação de Detenção & MDT",
    shortTitle: "Detenção & MDT",
    mandatory: true,
    icon: "⛓️",
    description:
      "Procedimentos corretos de detenção, segurança operacional e utilização completa do MDT.",
    objectives: [
      "Proceder corretamente a uma detenção.",
      "Garantir a segurança dos Guardas e do detido.",
      "Respeitar os procedimentos legais e operacionais.",
      "Utilizar corretamente o MDT para registos operacionais.",
    ],
    contents: [
      {
        title: "Procedimento de detenção",
        items: [
          "Avaliação do risco da situação.",
          "Controlo do indivíduo.",
          "Emissão de ordens claras e audíveis.",
          "Algemagem correta.",
          "Leitura de direitos.",
          "Comunicação rádio adequada.",
        ],
      },
      {
        title: "Segurança na detenção",
        items: [
          "Posicionamento corporal.",
          "Distância de segurança.",
          "Controlo visual das mãos do suspeito.",
          "Pedido de apoio quando necessário.",
          "Revista de segurança ao indivíduo.",
        ],
      },
      {
        title: "Utilização do MDT",
        items: [
          "Consulta do cidadão.",
          "Verificação de antecedentes e mandados.",
          "Registo da detenção.",
          "Associação do crime cometido.",
          "Encaminhamento correto.",
          "Inserção de fotografias do detido.",
        ],
      },
    ],
    practicalGuide: [
      "Criar uma situação prática de detenção.",
      "O formando aborda, controla, algema, lê direitos e revista.",
      "O formando comunica via rádio e solicita apoio quando necessário.",
      "No MDT, cria e conclui corretamente o registo.",
      "O formador dá feedback e confirma a conclusão.",
    ],
    commonErrors: [
      "Detenção sem condições mínimas de segurança.",
      "Falta de leitura de direitos.",
      "Comunicação rádio incompleta.",
      "Registo incompleto ou incorreto no MDT.",
    ],
    criteria: [
      "Comunicação clara.",
      "Procedimento correto.",
      "Utilização adequada do MDT.",
      "Postura profissional.",
      "Segurança na atuação.",
    ],
  },
  {
    code: "COMUNICACAO",
    title: "Formação de Comunicação",
    shortTitle: "Comunicação",
    mandatory: true,
    icon: "📻",
    description:
      "Utilização disciplinada da rádio, códigos operacionais e gestão de prioridade.",
    objectives: [
      "Utilizar corretamente a rádio.",
      "Comunicar de forma clara, objetiva e disciplinada.",
      "Aplicar corretamente os códigos operacionais.",
      "Evitar erros que comprometam operações.",
    ],
    contents: [
      {
        title: "Princípios da comunicação operacional",
        items: [
          "Clara, sem ruído ou ambiguidades.",
          "Objetiva, sem conversas desnecessárias.",
          "Disciplinada, respeitando prioridades.",
          "Identificada, sempre com designativo.",
        ],
      },
      {
        title: "Códigos de comunicação",
        items: [
          "Significado dos códigos operacionais.",
          "Aplicação prática correta.",
          "Situações em que os códigos não se justificam.",
        ],
      },
      {
        title: "Prioridade de rádio",
        items: [
          "Comunicações normais.",
          "Comunicações urgentes.",
          "Códigos de emergência e pânico.",
          "Não interromper comunicações prioritárias.",
        ],
      },
    ],
    practicalGuide: [
      "Exercício de início de patrulha e pedido de estado.",
      "Simulação de ocorrência simples.",
      "Pedido de apoio e comunicação de suspeito.",
      "Atualizações de localização.",
      "Simulação de código de pânico e elevado volume de rádio.",
    ],
    commonErrors: [
      "Falar em simultâneo com outras unidades.",
      "Utilizar linguagem informal.",
      "Não se identificar corretamente.",
      "Spam de rádio.",
    ],
    criteria: [
      "Identificação correta.",
      "Clareza e objetividade.",
      "Uso adequado dos códigos.",
      "Respeito pela prioridade de rádio.",
    ],
  },
  {
    code: "APREENSAO_VIATURAS",
    title: "Formação de Apreensão de Viaturas",
    shortTitle: "Apreensão de Viaturas",
    mandatory: true,
    icon: "🚓",
    description:
      "Fundamentos, procedimento operacional, comunicação com o cidadão e registo da apreensão.",
    objectives: [
      "Identificar situações em que uma viatura pode ser apreendida.",
      "Executar corretamente o procedimento.",
      "Comunicar de forma clara e profissional.",
      "Registar corretamente a apreensão.",
    ],
    contents: [
      {
        title: "Fundamentos da apreensão",
        items: [
          "Viatura envolvida em atividade criminosa.",
          "Ausência de condições legais de circulação.",
          "Viatura utilizada numa fuga.",
          "Abandono ou situação irregular.",
        ],
      },
      {
        title: "Comunicação com o cidadão",
        items: [
          "Explicar claramente o motivo.",
          "Manter tom calmo e profissional.",
          "Informar sobre os procedimentos seguintes.",
        ],
      },
      {
        title: "Procedimento operacional",
        items: [
          "Garantir segurança do local.",
          "Solicitar reboque quando necessário.",
          "Imobilizar devidamente a viatura.",
          "Encaminhar para o local designado.",
        ],
      },
      {
        title: "Registo no sistema",
        items: [
          "Criar o registo de apreensão.",
          "Indicar corretamente o motivo.",
          "Associar a viatura ao proprietário.",
          "Finalizar corretamente o processo.",
        ],
      },
    ],
    practicalGuide: [
      "Criar cenário de viatura irregular ou utilizada em fuga.",
      "O formando justifica a apreensão.",
      "Comunica com o cidadão.",
      "Solicita reboque quando necessário.",
      "Conclui o registo no sistema.",
    ],
    commonErrors: [
      "Apreender sem fundamento válido.",
      "Não explicar o motivo ao cidadão.",
      "Registos incompletos.",
      "Linguagem agressiva ou pouco profissional.",
    ],
    criteria: [
      "Justificação válida.",
      "Comunicação clara e profissional.",
      "Procedimento correto.",
      "Registo completo.",
    ],
  },
  {
    code: "ABORDAGEM_TRANSITO",
    title: "Formação de Abordagem de Trânsito & Abordagem Agressiva",
    shortTitle: "Abordagem de Trânsito",
    mandatory: false,
    icon: "🚨",
    description:
      "Abordagens seguras, avaliação de risco, escalonamento e controlo proporcional.",
    objectives: [
      "Realizar abordagens de trânsito seguras.",
      "Avaliar corretamente o nível de risco.",
      "Escalonar adequadamente a abordagem.",
      "Manter o controlo de forma segura e proporcional.",
    ],
    contents: [
      {
        title: "Abordagem normal",
        items: [
          "Posicionamento correto da viatura.",
          "Aproximação segura.",
          "Comunicação educada e profissional.",
          "Pedido de documentação.",
        ],
      },
      {
        title: "Avaliação de risco",
        items: [
          "Movimentos suspeitos.",
          "Linguagem agressiva.",
          "Recusa de colaboração.",
          "Número de ocupantes.",
        ],
      },
      {
        title: "Abordagem agressiva",
        items: [
          "Recuar para posição segura.",
          "Emitir ordens firmes e claras.",
          "Solicitar apoio.",
          "Preparar meios coercivos apenas quando justificado.",
        ],
      },
    ],
    practicalGuide: [
      "Simular condutor cooperante.",
      "Avaliar postura, comunicação e procedimento.",
      "Simular linguagem agressiva, desobediência ou fuga a pé.",
      "O formando ajusta a abordagem e solicita apoio.",
      "Dar feedback sobre escalonamento e segurança.",
    ],
    commonErrors: [
      "Escalar sem motivo.",
      "Falta de cobertura e posicionamento.",
      "Comunicação agressiva desnecessária.",
      "Não solicitar apoio.",
    ],
    criteria: [
      "Avaliação correta do risco.",
      "Pedido de apoio adequado.",
      "Comunicação profissional.",
      "Segurança na atuação.",
    ],
  },
  {
    code: "FUGA_AUTORIDADES",
    title: "Formação de Fuga às Autoridades",
    shortTitle: "Fuga às Autoridades",
    mandatory: false,
    icon: "🚘",
    description:
      "Perseguições seguras, comunicação constante, coordenação e decisão entre continuar ou abortar.",
    objectives: [
      "Reagir corretamente a fugas em viatura.",
      "Comunicar de forma clara, contínua e disciplinada.",
      "Coordenar-se com outras patrulhas.",
      "Conduzir e terminar perseguições de forma segura.",
    ],
    contents: [
      {
        title: "Início da fuga",
        items: [
          "Comunicar imediatamente.",
          "Identificar modelo, cor e matrícula.",
          "Indicar localização e direção.",
        ],
      },
      {
        title: "Comunicação durante a perseguição",
        items: [
          "Atualizações regulares de posição.",
          "Indicação de alterações de direção.",
          "Comunicação objetiva, sem spam.",
        ],
      },
      {
        title: "Coordenação entre unidades",
        items: [
          "Aceitar apoio.",
          "Evitar perseguições isoladas prolongadas.",
          "Cooperar em interceções e bloqueios.",
        ],
      },
      {
        title: "Terminação",
        items: [
          "Saber quando manter.",
          "Saber quando abortar.",
          "Terminar de forma segura.",
          "Priorizar civis e Guardas.",
        ],
      },
    ],
    practicalGuide: [
      "Simular uma fuga em viatura.",
      "Exigir comunicação de início, direção e localização.",
      "Introduzir trânsito intenso, condução perigosa ou zona urbana.",
      "Avaliar coordenação e gestão de risco.",
      "Dar feedback sobre segurança e realismo.",
    ],
    commonErrors: [
      "Condução irrealista ou excessivamente agressiva.",
      "Silêncio de rádio.",
      "Ignorar ordens ou prioridades.",
      "Continuar sem condições de segurança.",
    ],
    criteria: [
      "Comunicação constante e disciplinada.",
      "Coordenação com outras unidades.",
      "Decisão correta entre continuar ou abortar.",
      "Condução segura e proporcional.",
    ],
  },
];

export const MANDATORY_TRAINING_CODES =
  SCHOOL_TRAININGS.filter((item) => item.mandatory).map((item) => item.code);

export const GUARD_PROVISIONAL_MANUAL = [
  {
    title: "Objetivo do manual",
    items: [
      "Explicar o funcionamento da Academia de Formação.",
      "Esclarecer deveres, responsabilidades e regras de conduta.",
      "Preparar o Guarda Provisório para o Exame Final.",
      "Garantir uma atuação profissional, coerente e realista em serviço.",
    ],
  },
  {
    title: "Estatuto do Guarda Provisório",
    items: [
      "Integra automaticamente a Academia de Formação.",
      "Encontra-se em avaliação contínua.",
      "Deve cumprir ordens hierárquicas e procedimentos.",
      "Representa a instituição dentro e fora de serviço.",
    ],
  },
  {
    title: "Formações iniciais",
    items: [
      "Obrigatórias: Detenção & MDT, Comunicação e Apreensão de Viaturas.",
      "Recomendadas: Abordagem de Trânsito/Agressiva e Fuga às Autoridades.",
      "Sem as formações obrigatórias não é possível abrir o Exame Final.",
    ],
  },
  {
    title: "Comportamento em serviço",
    items: [
      "Postura profissional e disciplinada.",
      "Comunicação correta via rádio e em RP.",
      "Evitar atitudes abusivas ou desproporcionais.",
      "Solicitar apoio ou esclarecimentos quando necessário.",
    ],
  },
  {
    title: "Exame Final",
    items: [
      "Realizado em patrulha LINCOLN.",
      "O Guarda Provisório assume o comando.",
      "Avaliação prática e contínua.",
      "Incide em procedimentos, comunicação, decisão e postura.",
    ],
  },
  {
    title: "Resultados",
    items: [
      "Aprovação: promoção a Guarda.",
      "1.ª reprovação: nova tentativa dentro do prazo.",
      "2.ª reprovação: exclusão do corpo ativo, salvo decisão superior.",
    ],
  },
];

export const TRAINER_MANUAL = [
  {
    title: "Missão do Formador",
    items: [
      "Transmitir conhecimentos técnicos e operacionais.",
      "Garantir uniformidade de procedimentos.",
      "Avaliar de forma justa, objetiva e imparcial.",
      "Preparar o formando para atuar com autonomia e segurança.",
    ],
  },
  {
    title: "Deveres",
    items: [
      "Dar o exemplo em postura e profissionalismo.",
      "Corrigir erros de forma imediata e pedagógica.",
      "Explicar o fundamento das decisões.",
      "Evitar favoritismos.",
      "Registar a conclusão das formações.",
    ],
  },
  {
    title: "Metodologia",
    items: [
      "Formações práticas e orientadas para situações reais.",
      "Progressivas e adaptadas à evolução.",
      "Realizadas, sempre que possível, em simulação operacional.",
    ],
  },
  {
    title: "Avaliação",
    items: [
      "Comunicação operacional.",
      "Segurança na atuação.",
      "Conhecimento dos procedimentos.",
      "Postura profissional.",
      "Capacidade de decisão.",
    ],
  },
  {
    title: "Relação com o Exame Final",
    items: [
      "Preparar, mas nunca garantir aprovação.",
      "Ser transparente sobre o nível de preparação.",
      "Recomendar reforço formativo quando necessário.",
    ],
  },
];
