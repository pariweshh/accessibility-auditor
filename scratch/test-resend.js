import { Resend } from 'resend';

const apiKey = 're_QSghK33p_21ajExtitvXhTvQVQKr3GWZu';
const resend = new Resend(apiKey);

async function run() {
  try {
    console.log("Attempting to send email via Resend...");
    const data = await resend.emails.send({
      from: 'a11ytica <onboarding@resend.dev>',
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
