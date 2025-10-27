import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'password_change' | 'welcome' | 'verification' | 'notification' | 'custom';
  to: string;
  data?: {
    userName?: string;
    timestamp?: string;
    verificationLink?: string;
    subject?: string;
    html?: string;
    title?: string;
    message?: string;
    [key: string]: any;
  };
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

// Email templates
const templates = {
  password_change: (data: any) => ({
    subject: 'Your Sellar Password Has Been Changed',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Changed</title>
          <style>
            /* Dark mode logo switching */
            @media (prefers-color-scheme: dark) {
              .logo-light { display: none !important; }
              .logo-dark { display: inline-block !important; }
            }
            @media (prefers-color-scheme: light) {
              .logo-light { display: inline-block !important; }
              .logo-dark { display: none !important; }
            }
            /* Fallback: show light logo by default */
            .logo-dark { display: none; }
          </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <!-- Email Container -->
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <!-- Logo Section with Dark Mode Support -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Password Changed</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              This is a confirmation that your Sellar account password was successfully changed on <strong>${formatDate(data.timestamp)}</strong>.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px;">
                <strong>⚠️ Didn't make this change?</strong><br>
                If you did not request this password change, please contact our support team immediately and secure your account.
              </p>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Your account security is important to us. Here are some tips to keep your account safe:
            </p>
            
            <ul style="font-size: 14px; color: #666; line-height: 1.8;">
              <li>Use a strong, unique password for your Sellar account</li>
              <li>Never share your password with anyone</li>
              <li>Enable two-factor authentication for added security</li>
              <li>Be cautious of phishing emails asking for your credentials</li>
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                If you have any questions or concerns, please contact our support team.
              </p>
              
              <p style="font-size: 14px; color: #666; margin: 0;">
                Best regards,<br>
                <strong>The Sellar Team</strong>
              </p>
            </div>
          </div>
          
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">
                This is an automated security notification from Sellar.
              </p>
              <p style="margin: 0;">
                © ${new Date().getFullYear()} Sellar. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  welcome: (data: any) => ({
    subject: 'Welcome to Sellar! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            /* Dark mode logo switching */
            @media (prefers-color-scheme: dark) {
              .logo-light { display: none !important; }
              .logo-dark { display: inline-block !important; }
            }
            @media (prefers-color-scheme: light) {
              .logo-light { display: inline-block !important; }
              .logo-dark { display: none !important; }
            }
            .logo-dark { display: none; }
          </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <!-- Email Container -->
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <!-- Logo Section with Dark Mode Support -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Sellar! 🎉</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Welcome to Sellar - Ghana's premier marketplace for buying and selling!
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We're excited to have you join our community. Get started by creating your first listing or browsing items in your area.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://sellarghana.com" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Get Started
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 0;">
              Best regards,<br>
              <strong>The Sellar Team</strong>
            </p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  notification: (data: any) => ({
    subject: data.subject || 'Notification from Sellar',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            /* Dark mode logo switching */
            @media (prefers-color-scheme: dark) {
              .logo-light { display: none !important; }
              .logo-dark { display: inline-block !important; }
            }
            @media (prefers-color-scheme: light) {
              .logo-light { display: inline-block !important; }
              .logo-dark { display: none !important; }
            }
            .logo-dark { display: none; }
          </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
          <!-- Email Container -->
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <!-- Logo Section with Dark Mode Support -->
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">${data.title || 'Notification'}</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
            
            <div style="font-size: 16px; margin-bottom: 20px;">
              ${data.message || ''}
            </div>
            
            <p style="font-size: 14px; color: #666; margin: 0;">
              Best regards,<br>
              <strong>The Sellar Team</strong>
            </p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  custom: (data: any) => ({
    subject: data.subject || 'Message from Sellar',
    html: data.html || '',
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { type, to, data = {} }: EmailRequest = await req.json();

    if (!to) {
      throw new Error('Recipient email is required');
    }

    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const template = templates[type];
    if (!template) {
      throw new Error(`Unknown email type: ${type}`);
    }

    const { subject, html } = template(data);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Sellar <no-reply@updates.sellarghana.com>',
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const responseData = await res.json();
    console.log('Email sent successfully:', responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

