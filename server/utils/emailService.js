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
      from: `"VGConcierge" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Varda Group - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="margin: 0 0 20px 0; color: #3b82f6;">Varda Group</h1>
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
            <p>This is an automated message from Varda Group. Please do not reply to this email.</p>
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
      from: `"VGConcierge" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Varda Group - Password Successfully Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="margin: 0 0 20px 0; color: white;">Varda Group</h1>
            <h2 style="margin: 0 0 20px 0; color: #d1fae5;">Password Reset Successful</h2>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-top: 20px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Hello ${firstName},
            </p>
            
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Your password has been successfully reset. You can now log in to your Varda Group account with your new password.
            </p>
            
            <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #065f46; font-size: 14px; margin: 0;">
                <strong>Security Tip:</strong> If you didn't request this password reset, please contact support immediately.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #64748b; font-size: 12px;">
            <p>This is an automated message from Varda Group. Please do not reply to this email.</p>
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


// Send daily meal summary report email with Excel attachment
export const sendDailyMealSummaryEmail = async ({ recipients, summaryData, excelBuffer, filename }) => {
  const targetRecipients = recipients || process.env.SUMMARY_EMAIL_RECIPIENTS || process.env.EMAIL_USER;
  if (!targetRecipients) {
    throw new Error('No email recipients configured (SUMMARY_EMAIL_RECIPIENTS or EMAIL_USER)');
  }

  const { dateRangeLabel, metrics, batchBreakdown = [] } = summaryData;
  const generatedTime = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const batchRowsHtml = batchBreakdown.map((b, i) => `
    <tr style="background-color: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${b.batch}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.registeredStudents}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.breakfast.availed} (${b.breakfast.rate}%)</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.lunch.availed} (${b.lunch.rate}%)</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #334155;">${b.dinner.availed} (${b.dinner.rate}%)</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; color: #4338ca;">${b.overallRate}%</td>
    </tr>
  `).join('');

  const transporter = createTransporter();

  if (!transporter) {
    console.log('\n📧 DAILY MEAL SUMMARY EMAIL (Console Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📬 To: ${targetRecipients}`);
    console.log(`📅 Period: ${dateRangeLabel}`);
    console.log(`📎 Attachment: ${filename} (${excelBuffer?.byteLength || excelBuffer?.length || 0} bytes)`);
    console.log(`🥐 Breakfast: ${metrics.breakfast.availed}/${metrics.breakfast.registered} (${metrics.breakfast.rate}%)`);
    console.log(`🍱 Lunch: ${metrics.lunch.availed}/${metrics.lunch.registered} (${metrics.lunch.rate}%)`);
    console.log(`🍲 Dinner: ${metrics.dinner.availed}/${metrics.dinner.registered} (${metrics.dinner.rate}%)`);
    if (metrics.vouchers) {
      console.log(`🎟️ Vouchers: ${metrics.vouchers.claimed}/${metrics.vouchers.total} claimed (${metrics.vouchers.rate}%) | Unclaimed: ${metrics.vouchers.totalUnclaimed}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { sent: true, mode: 'console', recipients: targetRecipients };
  }

  const mailOptions = {
    from: `"VGConcierge" <${process.env.EMAIL_USER}>`,
    to: targetRecipients,
    subject: `[Daily Meal Summary] Report for ${dateRangeLabel} - VGConcierge`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px; background-color: #f1f5f9;">
        <div style="background: linear-gradient(135deg, #312e81 0%, #4338ca 100%); color: white; padding: 28px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0 0 8px 0; font-size: 22px; letter-spacing: 0.5px;">VGCONCIERGE</h1>
          <h2 style="margin: 0; font-size: 16px; font-weight: 400; color: #e0e7ff;">Daily Meal Availment Summary Report</h2>
          <p style="margin: 12px 0 0 0; font-size: 13px; color: #c7d2fe;">
            Period: <strong>${dateRangeLabel}</strong> &nbsp;|&nbsp; Generated: ${generatedTime} (PH)
          </p>
        </div>

        <div style="background: #ffffff; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <p style="color: #334155; font-size: 15px; line-height: 1.5; margin-top: 0;">
            Here is the summary of meal availments for <strong>${dateRangeLabel}</strong> across <strong>${metrics.totalRegisteredStudents}</strong> total registered LIMA users.
          </p>

          <h3 style="color: #1e1b4b; font-size: 15px; margin: 24px 0 12px 0; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px;">
            1. Meal Breakdown & Availment Rate
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #4338ca; color: #ffffff;">
                <th style="padding: 10px 12px; text-align: left;">Meal Type</th>
                <th style="padding: 10px 12px; text-align: center;">Registered</th>
                <th style="padding: 10px 12px; text-align: center;">Availed</th>
                <th style="padding: 10px 12px; text-align: center;">Unavailed</th>
                <th style="padding: 10px 12px; text-align: center;">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">🥐 Breakfast</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${metrics.breakfast.registered}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: 600;">${metrics.breakfast.availed}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #dc2626;">${metrics.breakfast.unavailed}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${metrics.breakfast.rate}%</td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">🍱 Lunch</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${metrics.lunch.registered}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: 600;">${metrics.lunch.availed}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #dc2626;">${metrics.lunch.unavailed}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${metrics.lunch.rate}%</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">🍲 Dinner</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${metrics.dinner.registered}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #059669; font-weight: 600;">${metrics.dinner.availed}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #dc2626;">${metrics.dinner.unavailed}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${metrics.dinner.rate}%</td>
              </tr>
              <tr style="background-color: #e0e7ff; font-weight: bold; color: #1e1b4b;">
                <td style="padding: 12px;">TOTAL (3 Meals)</td>
                <td style="padding: 12px; text-align: center;">${metrics.total.registered}</td>
                <td style="padding: 12px; text-align: center; color: #047857;">${metrics.total.availed}</td>
                <td style="padding: 12px; text-align: center; color: #b91c1c;">${metrics.total.unavailed}</td>
                <td style="padding: 12px; text-align: center;">${metrics.total.rate}%</td>
              </tr>
            </tbody>
          </table>

          <h3 style="color: #1e1b4b; font-size: 15px; margin: 24px 0 12px 0; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px;">
            2. LIMA Batch Breakdown
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #374151; color: #ffffff;">
                <th style="padding: 9px 10px; text-align: left;">Batch</th>
                <th style="padding: 9px 10px; text-align: center;">Students</th>
                <th style="padding: 9px 10px; text-align: center;">Breakfast</th>
                <th style="padding: 9px 10px; text-align: center;">Lunch</th>
                <th style="padding: 9px 10px; text-align: center;">Dinner</th>
                <th style="padding: 9px 10px; text-align: center;">Overall</th>
              </tr>
            </thead>
            <tbody>
              ${batchRowsHtml}
            </tbody>
          </table>

          <h3 style="color: #1e1b4b; font-size: 15px; margin: 24px 0 12px 0; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px;">
            3. Breakfast Vouchers Summary (Dorm 2)
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #b45309; color: #ffffff;">
                <th style="padding: 10px 12px; text-align: left;">Voucher Category</th>
                <th style="padding: 10px 12px; text-align: center;">Total Issued</th>
                <th style="padding: 10px 12px; text-align: center;">Claimed (Dorm 2)</th>
                <th style="padding: 10px 12px; text-align: center;">Unclaimed / Expired</th>
                <th style="padding: 10px 12px; text-align: center;">Claim Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background-color: #fffbeb;">
                <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; font-weight: 600;">🎟️ Breakfast Vouchers</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; text-align: center; font-weight: 600;">${metrics.vouchers?.total || 0}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; text-align: center; color: #059669; font-weight: 600;">${metrics.vouchers?.claimed || 0}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; text-align: center; color: #dc2626;">${metrics.vouchers?.totalUnclaimed || 0}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid #fef3c7; text-align: center; font-weight: 600;">${metrics.vouchers?.rate || 0}%</td>
              </tr>
            </tbody>
          </table>

          <div style="background-color: #eef2ff; border-left: 4px solid #4338ca; padding: 14px 16px; border-radius: 4px; margin-top: 20px;">
            <p style="margin: 0; color: #312e81; font-size: 13.5px;">
              📎 <strong>Full Excel Report Attached:</strong> Please open the attached file (<code>${filename}</code>) for the complete 5-sheet report including:
              <strong>Meal Summary</strong>, <strong>Availed List</strong>, <strong>Unavailed List</strong>, <strong>Claimed Vouchers</strong>, and <strong>Unclaimed Vouchers</strong>.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 16px; color: #64748b; font-size: 12px;">
          <p style="margin: 0;">Automated Daily Report • VGConcierge</p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(excelBuffer),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
  return { sent: true, mode: 'smtp', recipients: targetRecipients };
};
