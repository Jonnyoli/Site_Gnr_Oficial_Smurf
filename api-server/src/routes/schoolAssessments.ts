import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";

import SchoolQuizAttempt from "../models/SchoolQuizAttempt";
import SchoolExam from "../models/SchoolExam";
import SchoolCertificate from "../models/SchoolCertificate";
import {
  AuditLog,
} from "../models";
import { attachSchoolDiscordContext, sendSchoolMessage } from "../services/schoolDiscordService";
import { SCHOOL_DISCORD, SCHOOL_EXAMINER_ROLE_IDS, SCHOOL_LEADERSHIP_ROLE_IDS, SCHOOL_TRAINER_ROLE_IDS } from "../config/schoolDiscord";
import { sendTrainingReviewEmbed, sendFinalExamRequestEmbed } from "../services/schoolDiscordEmbeds";

const router =
  Router();

const COMMAND_ROLE_ID =
  process.env
    .COMMAND_GENERAL_ROLE_ID ||
  "1147878942099906672";

const EXAMINER_ROLE_IDS = [COMMAND_ROLE_ID, ...SCHOOL_EXAMINER_ROLE_IDS, ...SCHOOL_LEADERSHIP_ROLE_IDS];
const TEST_REVIEWER_ROLE_IDS = [...SCHOOL_TRAINER_ROLE_IDS, ...EXAMINER_ROLE_IDS];

const MANDATORY_CODES = [
  "DETENCAO_MDT",
  "COMUNICACAO",
  "APREENSAO_VIATURAS",
];

const TRAININGS: Record<
  string,
  {
    title: string;
    mandatory: boolean;
    questions: {
      id: string;
      prompt: string;
      maxPoints: number;
    }[];
  }
> = {
  DETENCAO_MDT: {
    title:
      "Detenção & MDT",
    mandatory:
      true,
    questions: [
      {
        id:
          "det-1",
        prompt:
          "Descreve, pela ordem correta, os procedimentos essenciais de uma detenção.",
        maxPoints:
          4,
      },
      {
        id:
          "det-2",
        prompt:
          "Que cuidados de segurança devem ser garantidos antes e durante a algemagem?",
        maxPoints:
          4,
      },
      {
        id:
          "det-3",
        prompt:
          "Explica quando deves solicitar apoio e como deves comunicar a detenção via rádio.",
        maxPoints:
          4,
      },
      {
        id:
          "det-4",
        prompt:
          "Que informações têm de ser registadas no MDT após uma detenção?",
        maxPoints:
          4,
      },
      {
        id:
          "det-5",
        prompt:
          "Indica três erros graves que podem comprometer uma detenção.",
        maxPoints:
          4,
      },
    ],
  },

  COMUNICACAO: {
    title:
      "Comunicação",
    mandatory:
      true,
    questions: [
      {
        id:
          "com-1",
        prompt:
          "Quais são os quatro princípios fundamentais de uma comunicação operacional correta?",
        maxPoints:
          4,
      },
      {
        id:
          "com-2",
        prompt:
          "Escreve um exemplo correto de início de patrulha via rádio.",
        maxPoints:
          4,
      },
      {
        id:
          "com-3",
        prompt:
          "Como deve ser gerida a prioridade de rádio numa ocorrência urgente?",
        maxPoints:
          4,
      },
      {
        id:
          "com-4",
        prompt:
          "Explica quando o uso excessivo de códigos pode prejudicar uma operação.",
        maxPoints:
          4,
      },
      {
        id:
          "com-5",
        prompt:
          "Indica quatro erros comuns de comunicação que devem ser evitados.",
        maxPoints:
          4,
      },
    ],
  },

  APREENSAO_VIATURAS: {
    title:
      "Apreensão de Viaturas",
    mandatory:
      true,
    questions: [
      {
        id:
          "apr-1",
        prompt:
          "Indica situações em que uma viatura pode ser legalmente apreendida.",
        maxPoints:
          4,
      },
      {
        id:
          "apr-2",
        prompt:
          "Como deve ser explicado ao cidadão o motivo da apreensão?",
        maxPoints:
          4,
      },
      {
        id:
          "apr-3",
        prompt:
          "Descreve o procedimento operacional desde a decisão até ao encaminhamento da viatura.",
        maxPoints:
          4,
      },
      {
        id:
          "apr-4",
        prompt:
          "Que dados devem constar do registo da apreensão?",
        maxPoints:
          4,
      },
      {
        id:
          "apr-5",
        prompt:
          "Porque é que a apreensão não deve ser tratada como punição pessoal?",
        maxPoints:
          4,
      },
    ],
  },

  ABORDAGEM_TRANSITO: {
    title:
      "Abordagem de Trânsito",
    mandatory:
      false,
    questions: [
      {
        id:
          "abt-1",
        prompt:
          "Descreve o posicionamento correto da viatura numa abordagem normal.",
        maxPoints:
          4,
      },
      {
        id:
          "abt-2",
        prompt:
          "Que sinais devem elevar o nível de risco da abordagem?",
        maxPoints:
          4,
      },
      {
        id:
          "abt-3",
        prompt:
          "Quando é justificado transformar uma abordagem normal numa abordagem agressiva?",
        maxPoints:
          4,
      },
      {
        id:
          "abt-4",
        prompt:
          "Como deve ser solicitado apoio durante uma escalada de risco?",
        maxPoints:
          4,
      },
      {
        id:
          "abt-5",
        prompt:
          "Indica erros de escalonamento que devem ser evitados.",
        maxPoints:
          4,
      },
    ],
  },

  FUGA_AUTORIDADES: {
    title:
      "Fuga às Autoridades",
    mandatory:
      false,
    questions: [
      {
        id:
          "fug-1",
        prompt:
          "Que informação deve ser transmitida imediatamente quando uma viatura inicia fuga?",
        maxPoints:
          4,
      },
      {
        id:
          "fug-2",
        prompt:
          "Como devem ser feitas as atualizações de localização durante a perseguição?",
        maxPoints:
          4,
      },
      {
        id:
          "fug-3",
        prompt:
          "Explica a importância da coordenação com outras patrulhas.",
        maxPoints:
          4,
      },
      {
        id:
          "fug-4",
        prompt:
          "Em que situações deve ser considerada a interrupção da perseguição?",
        maxPoints:
          4,
      },
      {
        id:
          "fug-5",
        prompt:
          "Indica comportamentos irrealistas ou perigosos que devem ser evitados.",
        maxPoints:
          4,
      },
    ],
  },
};

function currentUser(
  req: Request,
) {
  return (
    (req as any)
      .session?.user ||
    null
  );
}

function userId(
  req: Request,
) {
  return String(
    currentUser(req)?.id ||
      "",
  );
}

function userName(
  req: Request,
) {
  const user =
    currentUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    user?.name ||
    userId(req) ||
    "Sistema"
  );
}

function roleIds(req: Request) {
  const mainRoles = Array.isArray(currentUser(req)?.roles)
    ? currentUser(req).roles.map(String)
    : [];
  const schoolRoles = Array.isArray((req as any).schoolRoles)
    ? (req as any).schoolRoles.map(String)
    : [];
  return [...new Set([...mainRoles, ...schoolRoles])];
}

function canReview(
  req: Request,
) {
  return TEST_REVIEWER_ROLE_IDS.some(
    (roleId) =>
      roleIds(req).includes(
        roleId,
      ),
  );
}

function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!userId(req)) {
    return void res
      .status(401)
      .json({
        error:
          "É necessário iniciar sessão.",
      });
  }

  next();
}

function requireReviewer(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!canReview(req)) {
    return void res
      .status(403)
      .json({
        error:
          "Não tens permissão para avaliar testes.",
      });
  }

  next();
}

async function audit(
  req: Request,
  action: string,
  severity:
    | "info"
    | "success"
    | "warning"
    | "critical",
  description: string,
  targetId?: string,
  targetName?: string,
  metadata:
    Record<
      string,
      any
    > = {},
) {
  try {
    await AuditLog.create({
      actorId:
        userId(req),
      actorName:
        userName(req),
      action,
      module:
        "Escola da Guarda",
      severity,
      description,
      targetId:
        targetId || null,
      targetName:
        targetName || null,
      metadata,
      ip:
        req.ip ||
        req.socket
          ?.remoteAddress ||
        null,
      userAgent:
        req.get(
          "user-agent",
        ) || null,
    });
  } catch (error) {
    console.error(
      "[SCHOOL ASSESSMENT AUDIT]",
      error,
    );
  }
}

async function notifyDiscord(content: string, kind: "TEST" | "FINAL" = "TEST") {
  const channelId = kind === "FINAL"
    ? process.env.SCHOOL_FINAL_EXAM_CHANNEL_ID || process.env.SCHOOL_EXAM_REQUEST_CHANNEL_ID
    : process.env.SCHOOL_TEST_REVIEW_CHANNEL_ID || process.env.SCHOOL_EXAM_REQUEST_CHANNEL_ID;

  if (!channelId) {
    const webhookUrl = process.env.SCHOOL_EXAM_REQUEST_WEBHOOK_URL;
    if (!webhookUrl) {
      return { sent: false, reason: "Canal/webhook da Escola não configurado." };
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        allowed_mentions: { roles: SCHOOL_EXAMINER_ROLE_IDS },
      }),
    });

    if (!response.ok) throw new Error(`Webhook Discord respondeu ${response.status}.`);
    return { sent: true };
  }

  return sendSchoolMessage(channelId, content, SCHOOL_EXAMINER_ROLE_IDS);
}

router.use(
  requireAuth,
);

router.use(attachSchoolDiscordContext);

router.get(
  "/trainings",
  async (
    req,
    res,
  ) => {
    const attempts =
      await SchoolQuizAttempt.find({
        studentId:
          userId(req),
      })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    const latestByCode =
      new Map<string, any>();

    for (
      const attempt
      of attempts
    ) {
      if (
        !latestByCode.has(
          attempt.trainingCode,
        )
      ) {
        latestByCode.set(
          attempt.trainingCode,
          attempt,
        );
      }
    }

    res.json({
      canReview:
        canReview(req),
      trainings:
        Object.entries(
          TRAININGS,
        ).map(
          ([
            code,
            training,
          ]) => ({
            code,
            title:
              training.title,
            mandatory:
              training.mandatory,
            latestAttempt:
              latestByCode.get(
                code,
              ) || null,
          }),
        ),
    });
  },
);

router.post(
  "/trainings/:code/start",
  async (
    req,
    res,
  ) => {
    try {
      const code =
        String(
          req.params.code ||
            "",
        );

      const training =
        TRAININGS[code];

      if (!training) {
        return void res
          .status(404)
          .json({
            error:
              "Formação não encontrada.",
          });
      }

      const active =
        await SchoolQuizAttempt.findOne({
          studentId:
            userId(req),
          trainingCode:
            code,
          status: {
            $in: [
              "IN_PROGRESS",
              "SUBMITTED",
            ],
          },
        }).sort({
          createdAt:
            -1,
        });

      if (active) {
        if (
          active.status ===
          "SUBMITTED"
        ) {
          return void res
            .status(409)
            .json({
              error:
                "Este teste já foi submetido e aguarda avaliação.",
              attempt:
                active,
            });
        }

        return void res.json({
          resumed:
            true,
          attempt:
            active,
        });
      }

      const attemptCount =
        await SchoolQuizAttempt.countDocuments({
          studentId:
            userId(req),
          trainingCode:
            code,
        });

      const attempt =
        await SchoolQuizAttempt.create({
          studentId:
            userId(req),
          studentName:
            userName(req),
          trainingCode:
            code,
          trainingTitle:
            training.title,
          mandatory:
            training.mandatory,
          attempt:
            attemptCount +
            1,
          answers:
            training.questions.map(
              (question) => ({
                questionId:
                  question.id,
                question:
                  question.prompt,
                answer:
                  "",
                maxPoints:
                  question.maxPoints,
              }),
            ),
        });

      await audit(
        req,
        "SCHOOL_TRAINING_EXAM_STARTED",
        "info",
        `${userName(req)} iniciou o teste de ${training.title}.`,
        String(
          attempt._id,
        ),
        userName(req),
        {
          trainingCode:
            code,
          attempt:
            attempt.attempt,
        },
      );

      res.status(201)
        .json({
          resumed:
            false,
          attempt,
        });
    } catch (error: any) {
      console.error(
        "[SCHOOL TEST START]",
        error,
      );

      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível iniciar o teste.",
      });
    }
  },
);

router.post(
  "/attempts/:id/submit",
  async (
    req,
    res,
  ) => {
    try {
      const attempt =
        await SchoolQuizAttempt.findOne({
          _id:
            req.params.id,
          studentId:
            userId(req),
          status:
            "IN_PROGRESS",
        });

      if (!attempt) {
        return void res
          .status(404)
          .json({
            error:
              "Teste não encontrado, já submetido ou não pertence à tua conta.",
          });
      }

      const submittedAnswers =
        Array.isArray(
          req.body?.answers,
        )
          ? req.body.answers
          : [];

      const answerMap =
        new Map<string, string>();

      for (
        const item
        of submittedAnswers
      ) {
        const questionId =
          String(
            item?.questionId ||
              "",
          ).trim();

        const answer =
          String(
            item?.answer ||
              "",
          ).trim();

        if (questionId) {
          answerMap.set(
            questionId,
            answer,
          );
        }
      }

      const normalizedAnswers =
        attempt.answers.map(
          (item: any) => ({
            questionId:
              String(
                item.questionId,
              ),
            question:
              String(
                item.question,
              ),
            maxPoints:
              Number(
                item.maxPoints ||
                  0,
              ),
            answer:
              answerMap.get(
                String(
                  item.questionId,
                ),
              ) ||
              "",
          }),
        );

      const missing =
        normalizedAnswers.filter(
          (item) =>
            item.answer.length <
            3,
        );

      if (missing.length) {
        return void res
          .status(400)
          .json({
            error:
              "Responde a todas as perguntas antes de submeter.",
            missing:
              missing.map(
                (item) =>
                  item.questionId,
              ),
          });
      }

      const updated =
        await SchoolQuizAttempt.findOneAndUpdate(
          {
            _id:
              attempt._id,
            studentId:
              userId(req),
            status:
              "IN_PROGRESS",
          },
          {
            $set: {
              answers:
                normalizedAnswers,
              status:
                "SUBMITTED",
              submittedAt:
                new Date(),
              score:
                null,
              reviewNotes:
                "",
              reviewerId:
                null,
              reviewerName:
                null,
              reviewedAt:
                null,
            },
          },
          {
            new:
              true,
            runValidators:
              true,
          },
        );

      if (!updated) {
        return void res
          .status(409)
          .json({
            error:
              "O estado do teste mudou. Atualiza a página e tenta novamente.",
          });
      }

      const discord =
        await notifyDiscord(
          [
            ...SCHOOL_EXAMINER_ROLE_IDS.map((roleId) => `<@&${roleId}>`),
            "📝 **Novo teste de formação para avaliar**",
            `**Formando:** ${updated.studentName}`,
            `**Formação:** ${updated.trainingTitle}`,
            `**Tentativa:** ${updated.attempt}`,
            "A avaliação encontra-se disponível na Escola da Guarda.",
          ]
            .filter(Boolean)
            .join("\n"),
        ).catch(
          (error: any) => ({
            sent:
              false,
            reason:
              error?.message ||
              "Erro desconhecido no Discord.",
          }),
        );

      await audit(
        req,
        "SCHOOL_TRAINING_EXAM_SUBMITTED",
        "info",
        `${updated.studentName} submeteu o teste de ${updated.trainingTitle}.`,
        String(
          updated._id,
        ),
        updated.studentName,
        {
          trainingCode:
            updated.trainingCode,
          attempt:
            updated.attempt,
          discord,
        },
      );

      res.json({
        ok:
          true,
        attempt:
          updated,
        discord,
      });
    } catch (error: any) {
      console.error(
        "[SCHOOL TEST SUBMIT]",
        error,
      );

      res.status(500).json({
        error:
          error?.message ||
          "Não foi possível submeter o teste para avaliação.",
      });
    }
  },
);

router.get(
  "/review",
  requireReviewer,
  async (
    req,
    res,
  ) => {
    const status =
      String(
        req.query.status ||
          "SUBMITTED",
      );

    const filter: any =
      {};

    if (
      status !==
      "ALL"
    ) {
      filter.status =
        status;
    }

    const items =
      await SchoolQuizAttempt.find(
        filter,
      )
        .sort({
          submittedAt:
            1,
        })
        .limit(250)
        .lean();

    res.json({
      items,
    });
  },
);

router.post(
  "/attempts/:id/review",
  requireReviewer,
  async (
    req,
    res,
  ) => {
    const decision =
      String(
        req.body?.decision ||
          "",
      );

    const score =
      Number(
        req.body?.score,
      );

    const reviewNotes =
      String(
        req.body
          ?.reviewNotes ||
          "",
      ).trim();

    if (
      ![
        "APPROVED",
        "REJECTED",
      ].includes(
        decision,
      )
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Decisão inválida.",
        });
    }

    if (
      !Number.isFinite(
        score,
      ) ||
      score < 0 ||
      score > 20
    ) {
      return void res
        .status(400)
        .json({
          error:
            "A nota deve estar entre 0 e 20.",
        });
    }

    if (
      decision ===
        "REJECTED" &&
      reviewNotes.length <
        5
    ) {
      return void res
        .status(400)
        .json({
          error:
            "Indica o motivo da reprovação.",
        });
    }

    const attempt =
      await SchoolQuizAttempt.findOneAndUpdate(
        {
          _id:
            req.params.id,
          status:
            "SUBMITTED",
        },
        {
          $set: {
            status:
              decision,
            score,
            reviewNotes,
            reviewerId:
              userId(req),
            reviewerName:
              userName(req),
            reviewedAt:
              new Date(),
          },
        },
        {
          new:
            true,
          runValidators:
            true,
        },
      );

    if (!attempt) {
      return void res
        .status(404)
        .json({
          error:
            "Teste não encontrado ou já avaliado.",
        });
    }

    await audit(
      req,
      decision ===
        "APPROVED"
        ? "SCHOOL_TRAINING_EXAM_APPROVED"
        : "SCHOOL_TRAINING_EXAM_REJECTED",
      decision ===
        "APPROVED"
        ? "success"
        : "warning",
      `${userName(req)} ${
        decision ===
        "APPROVED"
          ? "aprovou"
          : "reprovou"
      } o teste de ${attempt.trainingTitle} de ${attempt.studentName}.`,
      String(
        attempt._id,
      ),
      attempt.studentName,
      {
        trainingCode:
          attempt.trainingCode,
        score,
        reviewNotes,
        attempt:
          attempt.attempt,
      },
    );

    const discord =
      await sendTrainingReviewEmbed(
        attempt,
      ).catch(
        (error) => ({
          sent: false,
          reason:
            error?.message ||
            String(error),
        }),
      );

    await audit(
      req,
      "SCHOOL_TEST_REVIEW_EMBED_SENT",
      discord.sent
        ? "success"
        : "warning",
      discord.sent
        ? `A avaliação de ${attempt.trainingTitle} de ${attempt.studentName} foi enviada para o Discord.`
        : `A avaliação de ${attempt.trainingTitle} foi concluída, mas o embed não foi enviado.`,
      String(
        attempt._id,
      ),
      attempt.studentName,
      {
        discord,
      },
    );

    res.json({
      attempt,
      discord,
    });
  },
);

router.get(
  "/final/status",
  async (
    req,
    res,
  ) => {
    const approved =
      await SchoolQuizAttempt.find({
        studentId:
          userId(req),
        status:
          "APPROVED",
        trainingCode: {
          $in:
            MANDATORY_CODES,
        },
      })
        .select({
          trainingCode:
            1,
        })
        .lean();

    const approvedCodes =
      new Set(
        approved.map(
          (
            item: any,
          ) =>
            item.trainingCode,
        ),
      );

    const missing =
      MANDATORY_CODES.filter(
        (code) =>
          !approvedCodes.has(
            code,
          ),
      );

    const exams =
      await SchoolExam.find({
        studentId:
          userId(req),
      })
        .sort({
          createdAt:
            -1,
        })
        .lean();

    res.json({
      eligible:
        missing.length ===
        0,
      missing,
      exams,
    });
  },
);

router.post(
  "/final/request",
  async (
    req,
    res,
  ) => {
    const approved =
      await SchoolQuizAttempt.find({
        studentId:
          userId(req),
        status:
          "APPROVED",
        trainingCode: {
          $in:
            MANDATORY_CODES,
        },
      })
        .select({
          trainingCode:
            1,
        })
        .lean();

    const approvedCodes =
      new Set(
        approved.map(
          (
            item: any,
          ) =>
            item.trainingCode,
        ),
      );

    const missing =
      MANDATORY_CODES.filter(
        (code) =>
          !approvedCodes.has(
            code,
          ),
      );

    if (missing.length) {
      return void res
        .status(409)
        .json({
          error:
            "Ainda tens testes obrigatórios por aprovar.",
          missing,
        });
    }

    const active =
      await SchoolExam.findOne({
        studentId:
          userId(req),
        status: {
          $in: [
            "REQUESTED",
            "SCHEDULED",
            "IN_PROGRESS",
          ],
        },
      });

    if (active) {
      return void res
        .status(409)
        .json({
          error:
            "Já existe um Exame Final pendente.",
        });
    }

    const failedAttempts =
      await SchoolExam.countDocuments({
        studentId:
          userId(req),
        status:
          "FAILED",
      });

    if (
      failedAttempts >=
      2
    ) {
      return void res
        .status(409)
        .json({
          error:
            "O limite de duas tentativas foi atingido.",
        });
    }

    const exam =
      await SchoolExam.create({
        studentId:
          userId(req),
        studentName:
          userName(req),
        status:
          "REQUESTED",
        attempt:
          failedAttempts +
          1,
        requestedAt:
          new Date(),
        patrolCallsign:
          "LINCOLN",
      });

    const discord =
      await sendFinalExamRequestEmbed(
        exam,
      ).catch(
        (error) => ({
          sent: false,
          reason:
            error?.message ||
            String(error),
        }),
      );

    if (discord.sent) {
      exam.discordChannelId =
        discord.channelId ||
        null;

      exam.discordMessageId =
        discord.messageId ||
        null;

      exam.discordJumpUrl =
        discord.jumpUrl ||
        null;

      await exam.save();
    }

    await audit(
      req,
      "SCHOOL_FINAL_EXAM_REQUESTED",
      discord.sent
        ? "success"
        : "warning",
      discord.sent
        ? `${exam.studentName} pediu o Exame Final e os Examinadores foram notificados no Discord.`
        : `${exam.studentName} pediu o Exame Final, mas a notificação do Discord não foi enviada.`,
      String(
        exam._id,
      ),
      exam.studentName,
      {
        attempt:
          exam.attempt,
        discord,
      },
    );

    res.status(201)
      .json({
        exam,
        discord,
      });
  },
);

router.get(
  "/health",
  async (
    req,
    res,
  ) => {
    res.json({
      ok:
        true,
      authenticated:
        Boolean(
          userId(req),
        ),
      canReview:
        canReview(req),
      userId:
        userId(req),
      routes: [
        "GET /trainings",
        "POST /trainings/:code/start",
        "POST /attempts/:id/submit",
        "GET /review",
        "POST /attempts/:id/review",
        "GET /final/status",
        "POST /final/request",
      ],
    });
  },
);

export default router;
