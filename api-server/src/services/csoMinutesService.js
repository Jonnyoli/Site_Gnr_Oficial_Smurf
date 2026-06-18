import crypto from "crypto";
import CSOMeeting from "../models/CSOMeeting.js";
import DepartmentOfficialDocument from "../models/DepartmentOfficialDocument.js";

function asNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value, withTime = false) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Europe/Lisbon",
  }).format(date);
}

function formatHours(value) {
  return `${asNumber(value).toFixed(1)}h`;
}

function verificationCode() {
  return `CSO-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function signatureCode(prefix) {
  return `${prefix}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function documentHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function tallyVotes(candidate) {
  const tally = {
    PROMOTE: 0,
    KEEP_RANK: 0,
    DEMOTE: 0,
    ABSTAIN: 0,
  };

  for (const vote of candidate.votes || []) {
    if (Object.hasOwn(tally, vote.choice)) {
      tally[vote.choice] += 1;
    }
  }

  const ordered = [
    ["PROMOTE", tally.PROMOTE],
    ["KEEP_RANK", tally.KEEP_RANK],
    ["DEMOTE", tally.DEMOTE],
    ["ABSTAIN", tally.ABSTAIN],
  ].sort((a, b) => b[1] - a[1]);

  const recommendation =
    ordered[0][1] === 0
      ? "PENDING"
      : ordered[0][0];

  return { tally, recommendation };
}

function recommendationLabel(value) {
  const labels = {
    PROMOTE: "Subida de patente",
    KEEP_RANK: "Manutenção na patente",
    DEMOTE: "Descida de patente",
    ABSTAIN: "Sem recomendação por abstenção",
    PENDING: "Sem votação concluída",
  };

  return labels[value] || value;
}

function decisionLabel(value) {
  const labels = {
    APPROVED: "Aprovada",
    REJECTED: "Rejeitada",
    RETURNED: "Devolvida",
    PENDING: "Pendente",
  };

  return labels[value] || value || "Pendente";
}


function commandApprovalDetected(meeting) {
  const statusApproved = ["APPROVED", "COMPLETED"].includes(
    String(meeting.status || ""),
  );

  const candidatesApproved =
    (meeting.candidates || []).length > 0 &&
    (meeting.candidates || []).every(
      (candidate) =>
        candidate.commandDecision === "APPROVED",
    );

  const auditApproved = (meeting.auditEvents || []).some(
    (event) =>
      String(event.type || "") === "COMMAND_APPROVED",
  );

  return statusApproved || candidatesApproved || auditApproved;
}

function cegApprovalDetected(meeting) {
  const direct = Boolean(
    meeting.cegRepresentative?.confirmed,
  );

  const auditApproved = (meeting.auditEvents || []).some(
    (event) =>
      String(event.type || "") === "CEG_APPROVED",
  );

  return direct || auditApproved;
}

export function validateMeetingForOfficialMinutes(meeting) {
  const errors = [];
  const warnings = [];

  const present = (meeting.attendees || []).filter(
    (item) => item.present,
  );

  const candidates = meeting.candidates || [];
  const commandApproved =
    commandApprovalDetected(meeting);

  if (candidates.length === 0) {
    errors.push("A reunião não tem militares analisados.");
  }

  if (present.length === 0) {
    errors.push("A reunião não tem membros presentes registados.");
  }

  for (const candidate of candidates) {
    const voters = new Set(
      (candidate.votes || []).map((vote) =>
        String(vote.voterDiscordId),
      ),
    );

    const missing = present.filter(
      (attendee) =>
        !voters.has(String(attendee.discordId)),
    );

    if (missing.length > 0) {
      const message =
        `${candidate.guardName}: faltam ${missing.length} voto(s) de membros presentes.`;

      // Reuniões históricas já aprovadas pelo Comando não ficam bloqueadas.
      // A ata regista a ausência como advertência.
      if (commandApproved) {
        warnings.push(message);
      } else {
        errors.push(message);
      }
    }
  }

  if (!cegApprovalDetected(meeting)) {
    if (commandApproved) {
      warnings.push(
        "Não foi encontrada uma confirmação técnica do CEG; a decisão final do Comando foi detetada.",
      );
    } else {
      errors.push(
        "Falta a validação do representante do CEG.",
      );
    }
  }

  if (!commandApproved) {
    errors.push(
      "Falta a decisão final do Comando-Geral.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    approvals: {
      ceg: cegApprovalDetected(meeting),
      command: commandApproved,
    },
  };
}

export function buildMinutesPayload(meeting) {
  const attendees = (meeting.attendees || [])
    .filter((item) => item.present)
    .map((item) => ({
      discordId: item.discordId,
      name: item.name,
      role: item.role,
      confirmedAt: item.confirmedAt,
    }));

  const candidates = (meeting.candidates || []).map((candidate, index) => {
    const { tally, recommendation } = tallyVotes(candidate);
    const snapshot = candidate.snapshot || {};

    return {
      order: index + 1,
      discordId: candidate.guardDiscordId,
      name: candidate.guardName,
      rank: candidate.currentRank,
      unit: candidate.currentUnit,
      reason: candidate.reason,
      activity: {
        periodStart: snapshot.periodStart || meeting.weekStart,
        periodEnd: snapshot.periodEnd || meeting.weekEnd,
        periodHours: asNumber(snapshot.periodHours ?? snapshot.totalHours),
        accumulatedHours: asNumber(snapshot.accumulatedHours),
        patrolCount: asNumber(snapshot.patrolCount),
        patrolHours: asNumber(snapshot.patrolHours),
        jointPatrols: asNumber(snapshot.jointPatrols),
        soloPatrols: asNumber(snapshot.soloPatrols),
        points: asNumber(snapshot.points),
        evaluationCount: asNumber(snapshot.evaluationCount),
        evaluationAverage: asNumber(snapshot.evaluationAverage),

        sergeantEvaluationCount: asNumber(
          snapshot.sergeantEvaluationCount,
        ),
        sergeantEvaluationAverage: asNumber(
          snapshot.sergeantEvaluationAverage,
        ),
        sergeantEvaluations:
          snapshot.sergeantEvaluations || [],

        lastPromotionAt: snapshot.lastPromotionAt || null,
        patrolPartners: snapshot.patrolPartners || [],
      },
      votes: (candidate.votes || []).map((vote) => ({
        voterDiscordId: vote.voterDiscordId,
        voterName: vote.voterName,
        choice: vote.choice,
        opinion: vote.opinion,
        submittedAt: vote.submittedAt,
      })),
      tally,
      recommendation,
      recommendationLabel: recommendationLabel(recommendation),
      commandDecision: candidate.commandDecision || "PENDING",
      commandDecisionLabel: decisionLabel(candidate.commandDecision),
      commandDecisionNote: candidate.commandDecisionNote || "",
    };
  });

  return {
    meeting: {
      id: String(meeting._id),
      number: meeting.meetingNumber,
      title: meeting.title,
      status: meeting.status,
      weekStart: meeting.weekStart,
      weekEnd: meeting.weekEnd,
      createdAt: meeting.createdAt,
      votingOpenedAt: meeting.votingOpenedAt,
      votingClosedAt: meeting.votingClosedAt,
      completedAt: meeting.completedAt,
      openedByDiscordId: meeting.openedByDiscordId,
      openedByName: meeting.openedByName,
    },
    attendees,
    ceg: {
      discordId: meeting.cegRepresentative?.discordId || null,
      name: meeting.cegRepresentative?.name || "Representante do CEG",
      confirmed: Boolean(meeting.cegRepresentative?.confirmed),
      confirmedAt: meeting.cegRepresentative?.confirmedAt || null,
      note: meeting.cegRepresentative?.validationNote || "",
    },
    candidates,
    summary: {
      totalCandidates: candidates.length,
      totalAttendees: attendees.length,
      promote: candidates.filter((item) => item.recommendation === "PROMOTE").length,
      keepRank: candidates.filter((item) => item.recommendation === "KEEP_RANK").length,
      demote: candidates.filter((item) => item.recommendation === "DEMOTE").length,
      abstain: candidates.filter((item) => item.recommendation === "ABSTAIN").length,
    },
  };
}

export function buildMinutesHtml(payload, metadata = {}) {
  const candidateSections = payload.candidates
    .map(
      (candidate) => `
      <section class="candidate">
        <div class="candidate-heading">
          <div>
            <span class="eyebrow">Militar ${candidate.order}</span>
            <h2>${escapeHtml(candidate.name)}</h2>
            <p>${escapeHtml(candidate.rank || "Sem patente")} · ${escapeHtml(
              candidate.unit || "Sem unidade",
            )}</p>
          </div>
          <div class="recommendation">${escapeHtml(candidate.recommendationLabel)}</div>
        </div>

        <table class="metrics">
          <tr>
            <td><strong>Horas no período</strong><span>${formatHours(
              candidate.activity.periodHours,
            )}</span></td>
            <td><strong>Horas acumuladas</strong><span>${formatHours(
              candidate.activity.accumulatedHours,
            )}</span></td>
            <td><strong>CPs</strong><span>${candidate.activity.patrolCount}</span></td>
            <td><strong>Horas de patrulha</strong><span>${formatHours(
              candidate.activity.patrolHours,
            )}</span></td>
          </tr>
          <tr>
            <td><strong>Pontos</strong><span>${candidate.activity.points}</span></td>
            <td><strong>Avaliações</strong><span>${
              candidate.activity.evaluationCount
            }</span></td>
            <td><strong>Média</strong><span>${candidate.activity.evaluationAverage.toFixed(
              1,
            )}</span></td>
            <td><strong>Última subida</strong><span>${formatDate(
              candidate.activity.lastPromotionAt,
            )}</span></td>
          </tr>
        </table>

        <div class="vote-summary">
          <div><strong>Subir</strong><span>${candidate.tally.PROMOTE}</span></div>
          <div><strong>Manter</strong><span>${candidate.tally.KEEP_RANK}</span></div>
          <div><strong>Descer</strong><span>${candidate.tally.DEMOTE}</span></div>
          <div><strong>Abstenção</strong><span>${candidate.tally.ABSTAIN}</span></div>
        </div>

        <h3>Avaliações oficiais dos Sargentos</h3>
        ${
          candidate.activity.sergeantEvaluations?.length
            ? candidate.activity.sergeantEvaluations
                .map(
                  (evaluation) => `
                <div class="opinion">
                  <div>
                    <strong>${escapeHtml(evaluation.evaluatorName)}</strong>
                    <span>${
                      evaluation.score !== null &&
                      evaluation.score !== undefined
                        ? `${Number(evaluation.score).toFixed(1)}/20`
                        : "Sem nota identificada"
                    }</span>
                  </div>
                  <p>${escapeHtml(evaluation.content)}</p>
                </div>
              `,
                )
                .join("")
            : '<p class="muted">Sem avaliações publicadas no canal oficial neste período.</p>'
        }

        <h3>Intervenções e fundamentações</h3>
        ${
          candidate.votes.length
            ? candidate.votes
                .map(
                  (vote) => `
                <div class="opinion">
                  <div>
                    <strong>${escapeHtml(vote.voterName)}</strong>
                    <span>${escapeHtml(recommendationLabel(vote.choice))}</span>
                  </div>
                  <p>${escapeHtml(vote.opinion)}</p>
                </div>
              `,
                )
                .join("")
            : '<p class="muted">Sem intervenções registadas.</p>'
        }

        <div class="command-decision">
          <strong>Decisão do Comando-Geral:</strong>
          ${escapeHtml(candidate.commandDecisionLabel)}
          ${
            candidate.commandDecisionNote
              ? `<p>${escapeHtml(candidate.commandDecisionNote)}</p>`
              : ""
          }
        </div>
      </section>
    `,
    )
    .join("");

  const signatures = (metadata.signatures || [])
    .map(
      (signature) => `
      <div class="signature">
        <div class="signature-line"></div>
        <strong>${escapeHtml(signature.name)}</strong>
        <span>${escapeHtml(signature.title)}</span>
        <small>${formatDate(signature.signedAt, true)} · ${escapeHtml(
          signature.signatureCode || "",
        )}</small>
      </div>
    `,
    )
    .join("");

  return `<!doctype html>
<html lang="pt">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(metadata.documentNumber || "Ata do CSO")}</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #152018;
    font-family: Arial, Helvetica, sans-serif;
    background: #eef2ef;
  }
  .page {
    width: 210mm;
    min-height: 297mm;
    margin: 20px auto;
    padding: 18mm;
    background: #fff;
    box-shadow: 0 12px 50px rgba(0,0,0,.12);
  }
  .header {
    border-bottom: 3px solid #0b5e35;
    padding-bottom: 18px;
    display: flex;
    justify-content: space-between;
    gap: 30px;
  }
  .brand h1 { margin: 0; font-size: 22px; letter-spacing: .08em; }
  .brand p { margin: 6px 0 0; color: #52705d; font-size: 12px; text-transform: uppercase; }
  .classification {
    text-align: right;
    font-size: 11px;
    color: #7a1f1f;
    font-weight: bold;
    text-transform: uppercase;
  }
  .title { margin: 34px 0 24px; }
  .title .eyebrow, .eyebrow {
    color: #0b5e35;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .14em;
    font-weight: bold;
  }
  .title h2 { margin: 8px 0; font-size: 30px; }
  .title p { color: #5f6e64; margin: 4px 0; }
  .summary-grid, .vote-summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .summary-grid > div, .vote-summary > div {
    border: 1px solid #d9e2dc;
    border-radius: 10px;
    padding: 12px;
    background: #f8faf8;
  }
  .summary-grid strong, .vote-summary strong {
    display: block;
    font-size: 10px;
    color: #617167;
    text-transform: uppercase;
  }
  .summary-grid span, .vote-summary span {
    display: block;
    margin-top: 6px;
    font-size: 20px;
    font-weight: bold;
  }
  .candidate {
    page-break-before: always;
    padding-top: 4px;
  }
  .candidate-heading {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-start;
    border-bottom: 1px solid #dce4df;
    padding-bottom: 16px;
  }
  .candidate-heading h2 { margin: 6px 0; font-size: 25px; }
  .candidate-heading p { margin: 0; color: #627067; }
  .recommendation {
    background: #eaf6ef;
    color: #0b5e35;
    border: 1px solid #b9dcc8;
    border-radius: 999px;
    padding: 9px 14px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
  }
  table.metrics {
    width: 100%;
    margin: 18px 0;
    border-collapse: separate;
    border-spacing: 8px;
  }
  table.metrics td {
    border: 1px solid #dce4df;
    background: #fafcfb;
    border-radius: 8px;
    padding: 12px;
    width: 25%;
  }
  table.metrics strong { display: block; color: #647268; font-size: 9px; text-transform: uppercase; }
  table.metrics span { display: block; margin-top: 7px; font-size: 17px; font-weight: bold; }
  h3 { font-size: 13px; margin-top: 24px; text-transform: uppercase; color: #31483a; }
  .opinion {
    border-left: 3px solid #0b5e35;
    background: #f7faf8;
    padding: 12px 14px;
    margin: 10px 0;
  }
  .opinion > div { display: flex; justify-content: space-between; gap: 12px; }
  .opinion span { color: #0b5e35; font-size: 10px; font-weight: bold; text-transform: uppercase; }
  .opinion p { margin: 9px 0 0; line-height: 1.55; font-size: 12px; }
  .command-decision {
    margin-top: 22px;
    border: 1px solid #b9dcc8;
    background: #eff8f2;
    padding: 14px;
    border-radius: 10px;
  }
  .attendees { margin: 22px 0; }
  .attendees li { margin: 7px 0; }
  .signatures {
    page-break-before: always;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 22px;
    padding-top: 80px;
  }
  .signature { text-align: center; }
  .signature-line { border-top: 1px solid #26352b; margin-bottom: 10px; }
  .signature strong, .signature span, .signature small { display: block; }
  .signature span { color: #5f6e64; font-size: 11px; margin-top: 4px; }
  .signature small { color: #88938c; margin-top: 7px; font-size: 9px; }
  .verification {
    margin-top: 60px;
    border-top: 1px solid #dce4df;
    padding-top: 14px;
    font-size: 9px;
    color: #718078;
    word-break: break-all;
  }
  .muted { color: #7d8a82; }
  @media print {
    body { background: #fff; }
    .page { margin: 0; box-shadow: none; }
  }
</style>
</head>
<body>
<div class="page">
  <header class="header">
    <div class="brand">
      <h1>GUARDA NACIONAL REPUBLICANA</h1>
      <p>Conselho Superior de Oficiais</p>
    </div>
    <div class="classification">
      ${escapeHtml(metadata.confidentiality || "RESTRITO")}<br />
      ${escapeHtml(metadata.documentNumber || "")}
    </div>
  </header>

  <section class="title">
    <span class="eyebrow">Ata oficial de reunião</span>
    <h2>${escapeHtml(payload.meeting.title)}</h2>
    <p><strong>Reunião:</strong> ${escapeHtml(payload.meeting.number)}</p>
    <p><strong>Período analisado:</strong> ${formatDate(
      payload.meeting.weekStart,
    )} a ${formatDate(payload.meeting.weekEnd)}</p>
    <p><strong>Responsável:</strong> ${escapeHtml(payload.meeting.openedByName)}</p>
  </section>

  <div class="summary-grid">
    <div><strong>Militares analisados</strong><span>${
      payload.summary.totalCandidates
    }</span></div>
    <div><strong>Subir</strong><span>${payload.summary.promote}</span></div>
    <div><strong>Manter</strong><span>${payload.summary.keepRank}</span></div>
    <div><strong>Descer</strong><span>${payload.summary.demote}</span></div>
  </div>

  <section class="attendees">
    <h3>Presenças</h3>
    <ul>
      ${payload.attendees
        .map(
          (attendee) =>
            `<li>${escapeHtml(attendee.name)} — ${escapeHtml(
              attendee.role || "CSO",
            )}</li>`,
        )
        .join("")}
    </ul>
    <p><strong>Representante do CEG:</strong> ${escapeHtml(payload.ceg.name)}</p>
    ${
      payload.ceg.note
        ? `<p><strong>Nota do CEG:</strong> ${escapeHtml(payload.ceg.note)}</p>`
        : ""
    }
  </section>

  <p>
    Aos ${formatDate(payload.meeting.completedAt || new Date(), true)}, foi
    encerrada a reunião acima identificada. O Conselho Superior de Oficiais
    procedeu à análise integral do efetivo incluído na ordem de trabalhos,
    tendo sido registadas as intervenções, votações, recomendações e decisões
    constantes da presente ata.
  </p>

  ${candidateSections}

  <section class="signatures">
    ${signatures}
  </section>

  <div class="verification">
    <strong>Código de verificação:</strong> ${escapeHtml(
      metadata.verificationCode || "",
    )}<br />
    <strong>Hash SHA-256:</strong> ${escapeHtml(metadata.documentHash || "")}<br />
    <strong>Versão:</strong> ${escapeHtml(metadata.version || 1)}
  </div>
</div>
</body>
</html>`;
}

function buildSignatures(meeting, actor, issued = false) {
  const now = issued ? new Date() : null;

  return [
    {
      role: "CSO_CHAIR",
      discordId: meeting.openedByDiscordId,
      name: meeting.openedByName,
      title: "Responsável pela reunião do CSO",
      signedAt: now,
      signatureCode: issued ? signatureCode("CSO") : null,
    },
    {
      role: "CEG_REPRESENTATIVE",
      discordId: meeting.cegRepresentative?.discordId || null,
      name: meeting.cegRepresentative?.name || "Representante do CEG",
      title: "Representante do Conselho de Elite da Guarda",
      signedAt: issued ? meeting.cegRepresentative?.confirmedAt || now : null,
      signatureCode: issued ? signatureCode("CEG") : null,
    },
    {
      role: "COMMAND",
      discordId: actor?.discordId || null,
      name: actor?.name || "Comando-Geral",
      title: "Pelo Comando-Geral",
      signedAt: now,
      signatureCode: issued ? signatureCode("CMD") : null,
    },
  ];
}

export async function previewMinutes(meetingId) {
  const meeting = await CSOMeeting.findById(meetingId);

  if (!meeting) {
    throw new Error("Reunião não encontrada.");
  }

  const payload = buildMinutesPayload(meeting);
  const hash = documentHash(payload);
  const code = verificationCode();
  const signatures = buildSignatures(meeting, null, false);

  const html = buildMinutesHtml(payload, {
    documentNumber: `PRÉVIA-${meeting.meetingNumber}`,
    verificationCode: code,
    documentHash: hash,
    version: 1,
    confidentiality: "DOCUMENTO DE TRABALHO",
    signatures,
  });

  return {
    payload,
    html,
    metadata: {
      preview: true,
      documentNumber: `PRÉVIA-${meeting.meetingNumber}`,
      verificationCode: code,
      documentHash: hash,
      version: 1,
      signatures,
    },
    validation: validateMeetingForOfficialMinutes(meeting),
  };
}

export async function issueOfficialMinutes(meetingId, actor) {
  const meeting = await CSOMeeting.findById(meetingId);

  if (!meeting) {
    throw new Error("Reunião não encontrada.");
  }

  const validation = validateMeetingForOfficialMinutes(meeting);

  if (!validation.valid) {
    const error = new Error("A reunião ainda não reúne condições para emissão oficial.");
    error.details = validation.errors;
    throw error;
  }

  const previous = await DepartmentOfficialDocument.findOne({
    department: "CSO",
    documentType: "MEETING_MINUTES",
    sourceModel: "CSOMeeting",
    sourceId: meeting._id,
  }).sort({ version: -1 });

  const version = previous ? Number(previous.version || 1) + 1 : 1;
  const payload = buildMinutesPayload(meeting);
  const hash = documentHash(payload);
  const code = verificationCode();
  const signatures = buildSignatures(meeting, actor, true);
  const documentNumber = `ATA-${meeting.meetingNumber}-V${version}`;

  const html = buildMinutesHtml(payload, {
    documentNumber,
    verificationCode: code,
    documentHash: hash,
    version,
    confidentiality: "RESTRITO",
    signatures,
  });

  const document = await DepartmentOfficialDocument.create({
    department: "CSO",
    documentType: "MEETING_MINUTES",
    documentNumber,
    title: `Ata Oficial — ${meeting.title}`,
    status: "ISSUED",
    sourceModel: "CSOMeeting",
    sourceId: meeting._id,
    verificationCode: code,
    documentHash: hash,
    version,
    confidentiality: "RESTRICTED",
    payload,
    html,
    signatures,
    versions: [
      ...(previous?.versions || []),
      {
        version,
        generatedAt: new Date(),
        generatedByDiscordId: actor?.discordId || null,
        generatedByName: actor?.name || null,
        documentHash: hash,
        reason: previous ? "Reemissão oficial" : "Emissão inicial",
      },
    ],
    issuedAt: new Date(),
    issuedByDiscordId: actor?.discordId || null,
    issuedByName: actor?.name || null,
  });

  meeting.auditEvents.push({
    type: "MINUTES_ISSUED",
    actorDiscordId: actor?.discordId || null,
    actorName: actor?.name || "Comando-Geral",
    note: `Ata oficial emitida: ${documentNumber}`,
    metadata: {
      documentId: String(document._id),
      verificationCode: code,
      version,
    },
  });

  await meeting.save();

  return document;
}

export async function getLatestMinutes(meetingId) {
  return DepartmentOfficialDocument.findOne({
    department: "CSO",
    documentType: "MEETING_MINUTES",
    sourceModel: "CSOMeeting",
    sourceId: meetingId,
    status: "ISSUED",
  }).sort({ version: -1 });
}
