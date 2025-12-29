import nodemailer from 'nodemailer';

// Create transporter for sending emails
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️  Email credentials not configured. Using console logging mode.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail', // You can change this to other services like 'outlook', 'yahoo', etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASSWORD // Your email password or app password
    }
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    const transporter = createTransporter();
    
    // If no transporter (no email config), log to console instead
    if (!transporter) {
      console.log('\n📧 PASSWORD RESET EMAIL (Console Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📬 To: ${email}`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
      console.log(`🔑 Token: ${resetToken}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Varda Food Group - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="margin: 0 0 20px 0; color: #3b82f6;">Varda Food Group</h1>
            <h2 style="margin: 0 0 20px 0; color: #e2e8f0;">Password Reset Request</h2>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You requested a password reset for your Varda account.
            </p>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Click the button below to reset your password. This link will expire in 1 hour.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
            <p>This is an automated message from Varda Food Group. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error.message);
    
    // Fallback to console logging if email fails
    console.log('\n📧 PASSWORD RESET EMAIL (Fallback Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📬 To: ${email}`);
    console.log(`🔗 Reset URL: ${resetUrl}`);
    console.log(`🔑 Token: ${resetToken}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }
};

// Send password reset confirmation email
export const sendPasswordResetConfirmation = async (email, firstName) => {
  try {
    const transporter = createTransporter();
    
    // If no transporter (no email config), log to console instead
    if (!transporter) {
      console.log('\n📧 PASSWORD RESET CONFIRMATION (Console Mode)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📬 To: ${email}`);
      console.log(`👤 User: ${firstName}`);
      console.log(`✅ Status: Password successfully reset`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;
    }
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Varda Food Group - Password Successfully Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="margin: 0 0 20px 0; color: white;">Varda Food Group</h1>
            <h2 style="margin: 0 0 20px 0; color: #d1fae5;">Password Reset Successful</h2>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${firstName},
            </p>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Your password has been successfully reset. You can now log in to your Varda Food Group account with your new password.
            </p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #065f46; font-size: 14px; margin: 0;">
                <strong>Security Tip:</strong> If you didn't request this password reset, please contact support immediately.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
            <p>This is an automated message from Varda Food Group. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset confirmation email:', error.message);
    
    // Fallback to console logging if email fails
    console.log('\n📧 PASSWORD RESET CONFIRMATION (Fallback Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📬 To: ${email}`);
    console.log(`👤 User: ${firstName}`);
    console.log(`✅ Status: Password successfully reset`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }
}; 