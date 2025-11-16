const { Resend } = require("resend");
const { PDFDocument } = require("pdf-lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { name, chartImage } = req.body && Object.keys(req.body).length ? req.body : JSON.parse(req.body);
    const resend = new Resend(process.env.RESEND_API_KEY);
    const TO_EMAIL = process.env.TO_EMAIL || "haya.y@yashir.co.il";

    // chartImage is data:image/png;base64,...
    const base64 = chartImage.split(",")[1];
    const pngBytes = Buffer.from(base64, "base64");

    // create pdf and embed image
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([800, 800]);
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const pngDims = pngImage.scale(0.9);
    page.drawImage(pngImage, {
      x: 40,
      y: 40,
      width: pngDims.width,
      height: pngDims.height,
    });
    const pdfBytes = await pdfDoc.save();

    // send email with attachment (base64 content)
    await resend.emails.send({
      from: "Survey App <no-reply@resend.dev>",
      to: TO_EMAIL,
      subject: `דוח גרף חדש – ${name}`,
      html: `<h2>התקבל דוח חדש</h2><p><strong>שם המשתתף:</strong> ${name}</p><p>מצורף קובץ PDF עם גרף העכביש.</p>`,
      attachments: [
        {
          filename: `radar-${name}.pdf`,
          content: Buffer.from(pdfBytes).toString("base64"),
          type: "application/pdf",
        },
      ],
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("send error", err);
    return res.status(500).json({ error: err.message || err.toString() });
  }
};
