/**
 * Zana AI — Export Service
 * Generates PDF and TXT exports of chat conversations.
 */

'use strict';

const PDFDocument = require('pdfkit');

/**
 * Export chat as plain text.
 * @param {Object} chat - Chat document with populated messages
 * @returns {string}
 */
const exportAsTxt = (chat) => {
  const lines = [
    `ZANA AI — Chat Export`,
    `======================`,
    `Title: ${chat.title}`,
    `Date: ${new Date(chat.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' })}`,
    `Messages: ${chat.messages.length}`,
    ``,
    `---`,
    ``,
  ];

  for (const msg of chat.messages) {
    const role = msg.role === 'user' ? '👤 YOU' : '✦ ZANA';
    const time = new Date(msg.createdAt).toLocaleTimeString('en-GB', { timeStyle: 'short' });
    lines.push(`[${time}] ${role}`);
    lines.push(msg.content);
    lines.push('');
  }

  lines.push('---');
  lines.push(`Exported from Zana AI on ${new Date().toLocaleString('en-GB')}`);

  return lines.join('\n');
};

/**
 * Export chat as PDF, piped to Express response.
 * @param {Object} chat - Chat document
 * @param {Object} res  - Express response object
 */
const exportAsPdf = (chat, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: `Zana AI — ${chat.title}`,
      Author: 'Zana AI',
      Subject: 'Chat Export',
    },
  });

  // Stream directly to response
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="zana-chat-${chat._id}.pdf"`);
  doc.pipe(res);

  // ─── Header ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 80).fill('#7c3aed');
  doc.fontSize(22).fillColor('#ffffff').font('Helvetica-Bold')
    .text('✦ ZANA AI', 50, 25, { align: 'left' });
  doc.fontSize(11).fillColor('rgba(255,255,255,0.7)').font('Helvetica')
    .text('Chat Export', 50, 52);

  doc.moveDown(3);

  // ─── Metadata ────────────────────────────────────────────────────────────
  doc.fillColor('#1a1a2e')
    .fontSize(16).font('Helvetica-Bold')
    .text(chat.title, { align: 'left' });

  doc.fontSize(10).fillColor('#64748b').font('Helvetica')
    .text(`${new Date(chat.createdAt).toLocaleDateString('en-GB', { dateStyle: 'long' })} · ${chat.messages.length} messages`);

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#e2e8f0').stroke();
  doc.moveDown(1);

  // ─── Messages ────────────────────────────────────────────────────────────
  for (const msg of chat.messages) {
    if (doc.y > doc.page.height - 150) doc.addPage();

    const isUser = msg.role === 'user';
    const roleLabel = isUser ? '👤 You' : '✦ Zana';
    const roleColor = isUser ? '#7c3aed' : '#0891b2';

    doc.fontSize(10).fillColor(roleColor).font('Helvetica-Bold')
      .text(roleLabel, { continued: true });
    doc.fillColor('#94a3b8').font('Helvetica')
      .text(`  ${new Date(msg.createdAt).toLocaleTimeString('en-GB', { timeStyle: 'short' })}`);

    doc.moveDown(0.3);

    // Clean markdown for PDF (basic)
    const cleanContent = msg.content
      .replace(/```[\s\S]*?```/g, '[code block]')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .trim();

    doc.fontSize(11).fillColor('#1e293b').font('Helvetica')
      .text(cleanContent, {
        width: doc.page.width - 100,
        align: 'left',
        lineGap: 2,
      });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
    doc.moveDown(0.8);
  }

  // ─── Footer ──────────────────────────────────────────────────────────────
  doc.fontSize(9).fillColor('#94a3b8').font('Helvetica')
    .text(`Exported from Zana AI · ${new Date().toLocaleString('en-GB')}`, {
      align: 'center',
    });

  doc.end();
};

module.exports = { exportAsTxt, exportAsPdf };
