import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  type: 'password_change' | 'welcome' | 'verification' | 'notification' | 'custom' | 
        'deposit_paid' | 'deposit_confirmed' | 'deposit_refunded' | 'deposit_expired' | 
        'deposit_cancelled' | 'deposit_seller_notification';
  to: string;
  data?: {
    userName?: string;
    timestamp?: string;
    verificationLink?: string;
    subject?: string;
    html?: string;
    title?: string;
    message?: string;
    listingTitle?: string;
    listingImage?: string;
    depositAmount?: string;
    expiresAt?: string;
    sellerName?: string;
    buyerName?: string;
    cancellationReason?: string;
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
  
  // Deposit Email Templates
  deposit_paid: (data: any) => ({
    subject: 'Deposit Payment Confirmed! 🔒',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
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
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔒 Deposit Payment Received!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Great news! Your ₵${data.depositAmount || '20'} deposit payment has been successfully received for:
              </p>
              
              <div style="background: #f8f9fa; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
                ${data.listingImage ? `<img src="${data.listingImage}" alt="Listing" style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 15px;" />` : ''}
                <h3 style="margin: 0 0 10px 0; color: #10b981;">${data.listingTitle || 'Your Item'}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">Seller: ${data.sellerName || 'Seller'}</p>
              </div>
              
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>⏰ Important:</strong> Complete your transaction within 3 days (by ${formatDate(data.expiresAt)}).
                </p>
              </div>
              
              <h3 style="color: #333; font-size: 18px; margin: 25px 0 15px 0;">Next Steps:</h3>
              <ol style="font-size: 14px; color: #666; line-height: 1.8; padding-left: 20px;">
                <li>Contact ${data.sellerName || 'the seller'} to arrange meetup</li>
                <li>Meet and inspect the item</li>
                <li>Complete the transaction</li>
                <li>Confirm in the app to release deposit to seller</li>
              </ol>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>💡 Protection:</strong> If you don't confirm within 3 days, your deposit will be automatically refunded.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://sellarghana.com" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  View Deposit Details
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666; margin: 0;">
                  Best regards,<br>
                  <strong>The Sellar Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">This is an automated message from Sellar.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Sellar. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  deposit_seller_notification: (data: any) => ({
    subject: 'New Deposit Received! 💰',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
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
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">💰 Buyer Paid Deposit!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Excellent news! ${data.buyerName || 'A buyer'} has paid a ₵${data.depositAmount || '20'} deposit for your listing:
              </p>
              
              <div style="background: #f8f9fa; border: 2px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 8px;">
                ${data.listingImage ? `<img src="${data.listingImage}" alt="Listing" style="width: 100%; max-width: 200px; border-radius: 8px; margin-bottom: 15px;" />` : ''}
                <h3 style="margin: 0 0 10px 0; color: #667eea;">${data.listingTitle || 'Your Listing'}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">Buyer: ${data.buyerName || 'Buyer'}</p>
              </div>
              
              <div style="background: #dcfce7; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px;">
                  <strong>✓ Committed Buyer:</strong> This buyer is serious and has shown commitment by paying a deposit.
                </p>
              </div>
              
              <h3 style="color: #333; font-size: 18px; margin: 25px 0 15px 0;">What happens next:</h3>
              <ol style="font-size: 14px; color: #666; line-height: 1.8; padding-left: 20px;">
                <li>Contact the buyer to arrange a meetup time and location</li>
                <li>Meet within 3 days to complete the transaction</li>
                <li>Buyer confirms in the app after receiving the item</li>
                <li>The ₵20 deposit is released to you!</li>
              </ol>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>⏰ Remember:</strong> Complete the transaction within 3 days to receive the deposit.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://sellarghana.com" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  View Order Details
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666; margin: 0;">
                  Best regards,<br>
                  <strong>The Sellar Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">This is an automated message from Sellar.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Sellar. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  deposit_confirmed: (data: any) => ({
    subject: 'Transaction Complete! ₵20 Released 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
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
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Deposit Released!</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Congratulations! The buyer has confirmed receiving the item, and your ₵${data.depositAmount || '20'} deposit has been released.
              </p>
              
              <div style="background: #dcfce7; border: 2px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <h2 style="margin: 0; color: #10b981; font-size: 32px;">₵${data.depositAmount || '20'}</h2>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">Deposit Released</p>
              </div>
              
              <div style="background: #f8f9fa; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0;">Transaction Details:</h4>
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Item:</strong> ${data.listingTitle || 'Your item'}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Buyer:</strong> ${data.buyerName || 'Buyer'}</p>
                <p style="margin: 5px 0; font-size: 14px; color: #666;"><strong>Date:</strong> ${formatDate(data.timestamp || new Date().toISOString())}</p>
              </div>
              
              <p style="font-size: 16px; margin: 20px 0;">
                Thank you for using Sellar's deposit system. This helps build trust in our marketplace community!
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://sellarghana.com" style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                  View Transaction
                </a>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666; margin: 0;">
                  Best regards,<br>
                  <strong>The Sellar Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">This is an automated message from Sellar.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Sellar. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  deposit_refunded: (data: any) => ({
    subject: 'Deposit Refunded - ₵20',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
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
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Deposit Refunded</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                Your ₵${data.depositAmount || '20'} deposit has been refunded for:
              </p>
              
              <div style="background: #f8f9fa; border: 2px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; color: #3b82f6;">${data.listingTitle || 'The item'}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">The 3-day transaction window has expired without confirmation.</p>
              </div>
              
              <p style="font-size: 16px; margin: 20px 0;">
                Your deposit has been automatically refunded to protect your funds. No action is needed on your part.
              </p>
              
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>💡 Tip:</strong> For future transactions, remember to confirm within 3 days to complete the transaction and release the deposit to the seller.
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666; margin: 0;">
                  Best regards,<br>
                  <strong>The Sellar Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">This is an automated message from Sellar.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Sellar. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  deposit_expired: (data: any) => ({
    subject: 'Deposit Expired - Auto-Refund Processed',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
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
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Deposit Expired</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                The 3-day transaction window for your deposit has expired:
              </p>
              
              <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; color: #f59e0b;">${data.listingTitle || 'The item'}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">Buyer: ${data.buyerName || 'Buyer'}</p>
              </div>
              
              <p style="font-size: 16px; margin: 20px 0;">
                The buyer did not confirm the transaction within the 3-day window. The deposit has been automatically refunded to the buyer to protect their funds.
              </p>
              
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px;">
                  <strong>ℹ️ Note:</strong> This is a zero-dispute system designed to protect both buyers and sellers. No manual action was required.
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666; margin: 0;">
                  Best regards,<br>
                  <strong>The Sellar Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">This is an automated message from Sellar.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Sellar. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
  
  deposit_cancelled: (data: any) => ({
    subject: 'Deposit Cancelled - Refund Issued',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
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
          <div style="width: 100%; max-width: 100%; margin: 0 auto; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-light.png" alt="Sellar Logo" class="logo-light" style="width: 80px; height: 80px; border-radius: 50%;" />
              <img src="https://kaunothcswgixxkoovrx.supabase.co/storage/v1/object/public/email-assets/icon-dark.png" alt="Sellar Logo" class="logo-dark" style="width: 80px; height: 80px; border-radius: 50%;" />
            </div>
            
            <div style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Deposit Cancelled</h1>
            </div>
            
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px; margin-bottom: 20px;">Hi ${data.userName || 'there'},</p>
              
              <p style="font-size: 16px; margin-bottom: 20px;">
                The deposit for the following item has been cancelled by mutual agreement:
              </p>
              
              <div style="background: #f8f9fa; border: 2px solid #64748b; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 10px 0; color: #64748b;">${data.listingTitle || 'The item'}</h3>
                ${data.cancellationReason ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: #666;"><strong>Reason:</strong> ${data.cancellationReason}</p>` : ''}
              </div>
              
              <p style="font-size: 16px; margin: 20px 0;">
                Your ₵${data.depositAmount || '20'} deposit has been refunded. This cancellation was mutually agreed upon by both parties.
              </p>
              
              <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 13px;">
                  <strong>✓ No penalties:</strong> Mutual cancellations do not affect your account standing.
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <p style="font-size: 14px; color: #666; margin: 0;">
                  Best regards,<br>
                  <strong>The Sellar Team</strong>
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #999;">
              <p style="margin: 0 0 10px 0;">This is an automated message from Sellar.</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Sellar. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
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

