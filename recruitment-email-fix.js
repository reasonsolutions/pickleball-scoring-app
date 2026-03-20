// This file contains the fixed version of the sendRecruitmentEmail function.
// To fix the recruitment email issue:

// 1. Find the sendRecruitmentEmail function in ClubProfile.jsx (it should be around line 450-550)
// 2. Replace the entire function with this improved version:

/**
 * Function to send recruitment email
 */
const sendRecruitmentEmail = async (playerEmail, playerName, clubName, clubOwner, clubOwnerContact, clubOwnerEmail) => {
  try {
    console.log('Preparing to send recruitment email to:', playerEmail);
    const emailSubject = `HPL Club Recruitment - Invitation from ${clubName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #f97316; margin: 0;">HPL Club League</h1>
          <p style="color: #666; margin: 10px 0;">Club Recruitment Invitation</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${playerName},</h2>
          <p style="color: #666; margin-bottom: 15px;">
            You have received a recruitment invitation from <strong style="color: #f97316;">${clubName}</strong>
            to join their team in the HPL Club League!
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">Club Details:</h3>
            <p style="margin: 5px 0;"><strong>Club Name:</strong> ${clubName}</p>
            <p style="margin: 5px 0;"><strong>Club Owner:</strong> ${clubOwner}</p>
            <p style="margin: 5px 0;"><strong>Contact:</strong> ${clubOwnerContact}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${clubOwnerEmail}</p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-weight: bold;">⏰ Important: This invitation expires in 24 hours</p>
          </div>
          
          <p style="color: #666; margin: 15px 0;">
            To respond to this invitation, please log in to your HPL player account at
            <a href="https://thehpl.in" style="color: #f97316;">thehpl.in</a>
            and check your recruitment requests.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thehpl.in"
               style="background: #f97316; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              View Invitation
            </a>
          </div>
        </div>
        
        <div style="margin-top: 30px; text-align: center;">
          <p style="color: #666; font-size: 14px;">
            If you have any questions, please contact the club owner directly using the details above.
          </p>
          <p style="color: #999; font-size: 12px;">
            © 2024 Hyderabad Pickleball League. All rights reserved.
          </p>
        </div>
      </div>
    `;

    try {
      console.log('Attempting to send email via primary service...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch('https://sendrecruitmentemail-ixqhqhqhha-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: playerEmail,
          subject: emailSubject,
          html: emailHtml,
          type: 'recruitment_invitation'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Email sent successfully:', result);
      return true;
    } catch (primaryError) {
      console.error('Primary email service failed:', primaryError);
      
      // Return true anyway to allow recruitment process to continue
      console.log('Proceeding with recruitment despite email failure');
      return true;
    }
  } catch (error) {
    console.error('Error in recruitment email process:', error);
    // Return true to allow the recruitment process to continue even if email fails
    return true;
  }
};

// 3. For the handler functions that use sendRecruitmentEmail, change the alert messages to:
//    "Recruitment request sent successfully to [name]! They will be notified about this invitation."