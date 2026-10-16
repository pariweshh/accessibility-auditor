import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY || 'your_resend_api_key_here';
const resend = new Resend(apiKey);

async function run() {
  try {
    console.log("Attempting to send email via Resend...");
    const data = await resend.emails.send({
      from: 'Equivance <onboarding@resend.dev>',
      to: 'tamrpariwesh@gmail.com',
      subject: 'Resend Configuration Test',
      html: '<p>If you receive this, Resend is working with this sender address.</p>',
    });
    console.log("Resend API Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Resend send error caught:", error);
  }
}

run();
