import { Router, type Request, type Response, type NextFunction } from "express";
import PDFDocument from "pdfkit";
import DepartmentOfficialDocument from "../models/DepartmentOfficialDocument.js";
import {
  getLatestMinutes,
  issueOfficialMinutes,
  previewMinutes,
} from "../services/csoMinutesService.js";

const router = Router();

const ROLE_IDS = {
  CSO: "1417908597949595681",
  CEG: "1417907622270599189",
  COMMAND: "1147878942099906672",
};

const DEV_USER_ID = "713719718091030599";

function currentUser(req: Request) {
  return req.session?.user || null;
}

function currentUserId(req: Request) {
  return String(currentUser(req)?.id || "");
}

function currentUserName(req: Request) {
  const user = currentUser(req);

  return (
    user?.displayName ||
    user?.global_name ||
    user?.username ||
    "Utilizador da Central"
  );
}

function currentRoles(req: Request) {
  return Array.isArray(currentUser(req)?.roles)
    ? currentUser(req).roles.map(String)
    : [];
}

function isCommand(req: Request) {
  return (
    currentUserId(req) === DEV_USER_ID ||
    currentRoles(req).includes(ROLE_IDS.COMMAND)
  );
}

function isCSO(req: Request) {
  return (
    isCommand(req) ||
    currentRoles(req).includes(ROLE_IDS.CSO)
  );
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!currentUser(req)) {
    res.status(401).json({ error: "É necessário iniciar sessão." });
    return;
  }

  next();
}

function requireCSO(req: Request, res: Response, next: NextFunction) {
  if (!isCSO(req)) {
    res.status(403).json({
      error: "Esta área está reservada ao CSO e ao Comando-Geral.",
    });
    return;
  }

  next();
}

function requireCommand(req: Request, res: Response, next: NextFunction) {
  if (!isCommand(req)) {
    res.status(403).json({
      error: "A emissão oficial está reservada ao Comando-Geral.",
    });
    return;
  }

  next();
}

router.get(
  "/meetings/:meetingId/preview",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const result = await previewMinutes(req.params.meetingId);

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar a pré-visualização.",
      });
    }
  },
);

router.post(
  "/meetings/:meetingId/issue",
  requireAuth,
  requireCommand,
  async (req, res) => {
    try {
      const document = await issueOfficialMinutes(
        req.params.meetingId,
        {
          discordId: currentUserId(req),
          name: currentUserName(req),
        },
      );

      return res.status(201).json({
        ok: true,
        document,
      });
    } catch (error) {
      const details = Array.isArray((error as any)?.details)
        ? (error as any).details
        : [];

      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível emitir a ata.",
        details,
      });
    }
  },
);

router.get(
  "/meetings/:meetingId/latest",
  requireAuth,
  requireCSO,
  async (req, res) => {
    try {
      const document = await getLatestMinutes(req.params.meetingId);

      if (!document) {
        return res.status(404).json({
          error: "Ainda não existe uma ata oficial emitida.",
        });
      }

      return res.json({ document });
    } catch (error) {
      return res.status(500).json({
        error: "Não foi possível carregar a ata.",
      });
    }
  },
);

router.get(
  "/documents/:documentId/html",
  requireAuth,
  requireCSO,
  async (req, res) => {
    const document = await DepartmentOfficialDocument.findById(
      req.params.documentId,
    );

    if (!document) {
      return res.status(404).send("Documento não encontrado.");
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(document.html);
  },
);

router.get(
  "/documents/:documentId/pdf",
  requireAuth,
  requireCSO,
  async (req, res) => {
    const document = await DepartmentOfficialDocument.findById(
      req.params.documentId,
    );

    if (!document) {
      return res.status(404).json({
        error: "Documento não encontrado.",
      });
    }

    const payload: any = document.payload;
    const pdf = new PDFDocument({
      size: "A4",
      margins: { top: 48, right: 48, bottom: 48, left: 48 },
      info: {
        Title: document.title,
        Author: "Guarda Nacional Republicana — CSO",
        Subject: document.documentNumber,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${document.documentNumber}.pdf"`,
    );

    pdf.pipe(res);

    pdf
      .font("Helvetica-Bold")
      .fontSize(15)
      .text("GUARDA NACIONAL REPUBLICANA", { align: "center" });

    pdf
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#0b5e35")
      .text("CONSELHO SUPERIOR DE OFICIAIS", { align: "center" });

    pdf.moveDown(1.5);

    pdf
      .fillColor("#111111")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(document.title, { align: "center" });

    pdf.moveDown();

    pdf
      .font("Helvetica")
      .fontSize(10)
      .text(`Documento: ${document.documentNumber}`)
      .text(
        `Período: ${new Date(payload.meeting.weekStart).toLocaleDateString(
          "pt-PT",
        )} a ${new Date(payload.meeting.weekEnd).toLocaleDateString("pt-PT")}`,
      )
      .text(`Responsável: ${payload.meeting.openedByName}`)
      .text(`Militares analisados: ${payload.summary.totalCandidates}`);

    pdf.moveDown();

    for (const candidate of payload.candidates) {
      if (pdf.y > 680) pdf.addPage();

      pdf
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor("#0b5e35")
        .text(`${candidate.order}. ${candidate.name}`);

      pdf
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#111111")
        .text(`${candidate.rank || "Sem patente"} · ${candidate.unit || "Sem unidade"}`)
        .text(
          `Horas: ${Number(candidate.activity.periodHours || 0).toFixed(
            1,
          )}h | CPs: ${candidate.activity.patrolCount} | Pontos: ${
            candidate.activity.points
          } | Média: ${Number(candidate.activity.evaluationAverage || 0).toFixed(
            1,
          )}`,
        )
        .text(
          `Votação — Subir: ${candidate.tally.PROMOTE} | Manter: ${
            candidate.tally.KEEP_RANK
          } | Descer: ${candidate.tally.DEMOTE} | Abstenção: ${
            candidate.tally.ABSTAIN
          }`,
        );

      pdf
        .font("Helvetica-Bold")
        .text(`Recomendação: ${candidate.recommendationLabel}`);

      for (const vote of candidate.votes || []) {
        pdf
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(`${vote.voterName}:`, { continued: true })
          .font("Helvetica")
          .text(` ${vote.opinion}`);
      }

      pdf.moveDown();
      pdf.moveTo(48, pdf.y).lineTo(547, pdf.y).strokeColor("#d0d8d3").stroke();
      pdf.moveDown();
    }

    if (pdf.y > 620) pdf.addPage();

    pdf
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("ASSINATURAS", { align: "center" });

    pdf.moveDown(2);

    for (const signature of document.signatures || []) {
      pdf
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(signature.name, { align: "center" })
        .font("Helvetica")
        .text(signature.title, { align: "center" })
        .fontSize(8)
        .fillColor("#666666")
        .text(
          `${signature.signatureCode || ""} · ${
            signature.signedAt
              ? new Date(signature.signedAt).toLocaleString("pt-PT")
              : ""
          }`,
          { align: "center" },
        );

      pdf.moveDown(1.5);
    }

    pdf
      .fillColor("#555555")
      .fontSize(7)
      .text(`Código de verificação: ${document.verificationCode}`)
      .text(`Hash SHA-256: ${document.documentHash}`)
      .text(`Versão: ${document.version}`);

    pdf.end();
  },
);

router.get(
  "/verify/:verificationCode",
  async (req, res) => {
    const document = await DepartmentOfficialDocument.findOne({
      verificationCode: req.params.verificationCode,
    }).lean();

    if (!document) {
      return res.status(404).json({
        valid: false,
        error: "Código de verificação inválido.",
      });
    }

    return res.json({
      valid: document.status === "ISSUED",
      document: {
        documentNumber: document.documentNumber,
        title: document.title,
        department: document.department,
        status: document.status,
        version: document.version,
        issuedAt: document.issuedAt,
        issuedByName: document.issuedByName,
        documentHash: document.documentHash,
      },
    });
  },
);

export default router;
