import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Serve your static frontend files (adjust path if your HTML/CSS is in a different folder)
app.use(express.static(path.join(__dirname, '../')));

// 1. Setup the mailer
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true, // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 2. Create the endpoint to send the invite
app.post('/api/send-invite', async (req, res) => {
  const { email, stokvelName, inviteCode } = req.body;

  if (!email || !inviteCode) {
    return res.status(400).json({ error: "Missing email or invite code." });
  }

  try {
    await transporter.sendMail({
      from: `"Themba Stokvel" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitation to join ${stokvelName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 10px;">
          <h2 style="color: #0a2e1b;">You've been invited!</h2>
          <p>You have been invited to join the stokvel <strong>${stokvelName}</strong> on Themba.</p>
          <p>Click the button below to create your account and join the group:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/dashboards/signup.html?invite=${inviteCode}" style="padding: 12px 24px; background: #e9c46a; color: #0a2e1b; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Join Stokvel</a>
          </div>
          <p>Or use this invite code manually when you sign up: <strong style="font-size: 18px; letter-spacing: 2px;">${inviteCode}</strong></p>
        </div>
      `,
    });

    res.json({ success: true, message: "Invite sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ error: "Failed to send email." });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});