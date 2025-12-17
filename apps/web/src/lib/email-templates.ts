// Beautiful HTML Email Templates for SoundBridge Moderation Notifications
// Professional, responsive email designs

export interface EmailTemplateData {
  username: string;
  trackTitle: string;
  artistName: string;
  trackId: string;
  reason?: string;
  appealText?: string;
}

const brandColor = '#8B5CF6'; // Purple brand color

const emailStyles = `
<style>
  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6; }
  .email-wrapper { background-color: #f3f4f6; padding: 20px 0; }
  .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
  .header { background: linear-gradient(135deg, ${brandColor} 0%, #6D28D9 100%); padding: 40px 30px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { color: #E9D5FF; margin: 10px 0 0 0; font-size: 14px; }
  .content { padding: 40px 30px; }
  .content h2 { color: #1F2937; font-size: 24px; margin: 0 0 20px 0; font-weight: 600; }
  .content p { color: #4B5563; line-height: 1.6; margin: 0 0 15px 0; font-size: 16px; }
  .track-info { background-color: #F9FAFB; border-left: 4px solid ${brandColor}; padding: 20px; margin: 25px 0; border-radius: 8px; }
  .track-info .title { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 8px 0; }
  .track-info .artist { font-size: 14px; color: #6B7280; margin: 0; }
  .reason-box { background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0; border-radius: 8px; }
  .reason-box p { color: #991B1B; margin: 0; font-size: 14px; }
  .success-box { background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 8px; }
  .success-box p { color: #065F46; margin: 0; font-size: 14px; }
  .appeal-box { background-color: #F9FAFB; padding: 15px; border-radius: 8px; border-left: 4px solid ${brandColor}; margin: 20px 0; }
  .appeal-box p { color: #4B5563; margin: 0; font-size: 14px; font-style: italic; }
  .button { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: background-color 0.2s; }
  .button:hover { background-color: #7C3AED; }
  .footer { background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
  .footer p { color: #6B7280; font-size: 14px; margin: 5px 0; }
  .footer a { color: ${brandColor}; text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
  .divider { height: 1px; background-color: #E5E7EB; margin: 30px 0; }
  ul { color: #4B5563; line-height: 1.8; margin: 15px 0; padding-left: 25px; }
  strong { color: #1F2937; font-weight: 600; }
  @media only screen and (max-width: 600px) {
    .email-container { border-radius: 0; }
    .header { padding: 30px 20px; }
    .content { padding: 30px 20px; }
    .button { display: block; text-align: center; }
  }
</style>
`;

export function getTrackFlaggedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const year = new Date().getFullYear();

  return {
    subject: `🔍 Your track "${data.trackTitle}" is under review`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Review Notice</title>
  ${emailStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <h1>🔍 Content Review Notice</h1>
        <p>Your track has been flagged for review</p>
      </div>

      <div class="content">
        <h2>Hi ${data.username},</h2>

        <p>Your track has been flagged for review by our automated moderation system.</p>

        <div class="track-info">
          <div class="title">🎵 ${data.trackTitle}</div>
          <div class="artist">by ${data.artistName}</div>
        </div>

        ${data.reason ? `
          <div class="reason-box">
            <p><strong>Reason:</strong> ${data.reason}</p>
          </div>
        ` : ''}

        <p><strong>What happens next?</strong></p>
        <ul>
          <li>Our team will review your track within 24 hours</li>
          <li>Your track remains <strong>live and playable</strong> during review</li>
          <li>You'll receive an email once the review is complete</li>
          <li>If rejected, you can submit an appeal with your explanation</li>
        </ul>

        <p>If you believe this is a mistake, please don't worry – our team will carefully review the content and make a fair decision.</p>

        <a href="https://soundbridge.live/track/${data.trackId}" class="button">View Track</a>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #6B7280;">
          This is an automated message. Our moderation system helps keep SoundBridge safe and enjoyable for everyone.
        </p>
      </div>

      <div class="footer">
        <p><strong>SoundBridge</strong></p>
        <p>Share Your Sound, Connect Your World</p>
        <p><a href="https://soundbridge.live">soundbridge.live</a></p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">&copy; ${year} SoundBridge. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function getTrackApprovedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const year = new Date().getFullYear();

  return {
    subject: `✅ Great news! Your track "${data.trackTitle}" has been approved`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Track Approved</title>
  ${emailStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <h1>✅ Track Approved!</h1>
        <p>Your content passed our review</p>
      </div>

      <div class="content">
        <h2>Congratulations, ${data.username}! 🎉</h2>

        <p>Great news! Your track has been reviewed and approved by our moderation team.</p>

        <div class="track-info">
          <div class="title">🎵 ${data.trackTitle}</div>
          <div class="artist">by ${data.artistName}</div>
        </div>

        <div class="success-box">
          <p><strong>✓ Approved</strong> – Your track meets our community guidelines and is now fully live!</p>
        </div>

        <p><strong>What's next?</strong></p>
        <ul>
          <li>Your track is available to all SoundBridge users</li>
          <li>Share it with your fans and followers</li>
          <li>Track engagement and analytics in your dashboard</li>
          <li>Keep creating amazing content!</li>
        </ul>

        <a href="https://soundbridge.live/track/${data.trackId}" class="button">View Track</a>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #6B7280;">
          Thank you for being part of the SoundBridge community and helping us maintain a positive platform for all creators!
        </p>
      </div>

      <div class="footer">
        <p><strong>SoundBridge</strong></p>
        <p>Share Your Sound, Connect Your World</p>
        <p><a href="https://soundbridge.live">soundbridge.live</a></p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">&copy; ${year} SoundBridge. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function getTrackRejectedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const year = new Date().getFullYear();

  return {
    subject: `❌ Update about your track "${data.trackTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Review Decision</title>
  ${emailStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <h1>Content Review Decision</h1>
        <p>Important update about your track</p>
      </div>

      <div class="content">
        <h2>Hi ${data.username},</h2>

        <p>After careful review, we regret to inform you that your track does not meet our community guidelines and has been removed from public access.</p>

        <div class="track-info">
          <div class="title">🎵 ${data.trackTitle}</div>
          <div class="artist">by ${data.artistName}</div>
        </div>

        ${data.reason ? `
          <div class="reason-box">
            <p><strong>Reason for removal:</strong> ${data.reason}</p>
          </div>
        ` : ''}

        <p><strong>What you can do:</strong></p>
        <ul>
          <li><strong>Submit an appeal</strong> if you believe this decision was made in error</li>
          <li>Provide context or explanation in your appeal</li>
          <li>Our team will review your appeal within 48 hours</li>
          <li>Review our <a href="https://soundbridge.live/guidelines" style="color: ${brandColor};">Community Guidelines</a></li>
        </ul>

        <a href="https://soundbridge.live/track/${data.trackId}/appeal" class="button">Submit Appeal</a>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #6B7280;">
          We understand this may be disappointing. Our goal is to maintain a safe, respectful platform for all creators while giving everyone a fair chance to be heard through our appeal process.
        </p>
      </div>

      <div class="footer">
        <p><strong>SoundBridge</strong></p>
        <p>Share Your Sound, Connect Your World</p>
        <p><a href="https://soundbridge.live">soundbridge.live</a> | <a href="https://soundbridge.live/support">Support</a></p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">&copy; ${year} SoundBridge. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function getAppealReceivedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const year = new Date().getFullYear();

  return {
    subject: `📬 We received your appeal for "${data.trackTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appeal Received</title>
  ${emailStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <h1>📬 Appeal Received</h1>
        <p>We're reviewing your appeal</p>
      </div>

      <div class="content">
        <h2>Thank you, ${data.username}</h2>

        <p>We've received your appeal and our team will review it carefully.</p>

        <div class="track-info">
          <div class="title">🎵 ${data.trackTitle}</div>
          <div class="artist">by ${data.artistName}</div>
        </div>

        ${data.appealText ? `
          <div class="appeal-box">
            <p><strong>Your appeal:</strong><br>"${data.appealText}"</p>
          </div>
        ` : ''}

        <p><strong>What happens next:</strong></p>
        <ul>
          <li>Our moderation team will review your appeal</li>
          <li>We'll consider your explanation and re-examine the content</li>
          <li>You'll receive a decision within 48 hours</li>
          <li>The decision will be sent via email and in-app notification</li>
        </ul>

        <p>We appreciate your patience and understanding as we review your appeal.</p>

        <a href="https://soundbridge.live/dashboard/appeals" class="button">View Appeal Status</a>
      </div>

      <div class="footer">
        <p><strong>SoundBridge</strong></p>
        <p>Share Your Sound, Connect Your World</p>
        <p><a href="https://soundbridge.live">soundbridge.live</a></p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">&copy; ${year} SoundBridge. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function getAppealApprovedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const year = new Date().getFullYear();

  return {
    subject: `🎉 Your appeal for "${data.trackTitle}" has been approved!`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appeal Approved</title>
  ${emailStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <h1>🎉 Appeal Approved!</h1>
        <p>Your track has been reinstated</p>
      </div>

      <div class="content">
        <h2>Excellent news, ${data.username}!</h2>

        <p>After reviewing your appeal, we've decided to approve your track and reinstate it on SoundBridge.</p>

        <div class="track-info">
          <div class="title">🎵 ${data.trackTitle}</div>
          <div class="artist">by ${data.artistName}</div>
        </div>

        <div class="success-box">
          <p><strong>✓ Reinstated</strong> – Your track is now live and available to all users!</p>
        </div>

        <p>Thank you for taking the time to explain the context. We appreciate your commitment to following our community guidelines.</p>

        <p><strong>Your track is now:</strong></p>
        <ul>
          <li>Live and public on SoundBridge</li>
          <li>Available for streaming and sharing</li>
          <li>Visible in search and discovery</li>
          <li>Ready to reach your audience</li>
        </ul>

        <a href="https://soundbridge.live/track/${data.trackId}" class="button">View Track</a>
      </div>

      <div class="footer">
        <p><strong>SoundBridge</strong></p>
        <p>Share Your Sound, Connect Your World</p>
        <p><a href="https://soundbridge.live">soundbridge.live</a></p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">&copy; ${year} SoundBridge. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function getAppealRejectedEmail(data: EmailTemplateData): { subject: string; html: string } {
  const year = new Date().getFullYear();

  return {
    subject: `Update on your appeal for "${data.trackTitle}"`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appeal Decision</title>
  ${emailStyles}
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="header">
        <h1>Appeal Decision</h1>
        <p>Update on your appeal</p>
      </div>

      <div class="content">
        <h2>Hi ${data.username},</h2>

        <p>Thank you for submitting your appeal. After careful review, we've decided to uphold our original decision.</p>

        <div class="track-info">
          <div class="title">🎵 ${data.trackTitle}</div>
          <div class="artist">by ${data.artistName}</div>
        </div>

        ${data.reason ? `
          <div class="reason-box">
            <p><strong>Reason:</strong> ${data.reason}</p>
          </div>
        ` : ''}

        <p>We understand this may not be the outcome you hoped for. This decision was made after thoroughly reviewing both the original content and your appeal.</p>

        <p><strong>Moving forward:</strong></p>
        <ul>
          <li>Review our <a href="https://soundbridge.live/guidelines" style="color: ${brandColor};">Community Guidelines</a></li>
          <li>Ensure future uploads comply with our policies</li>
          <li>Contact <a href="https://soundbridge.live/support" style="color: ${brandColor};">support</a> if you have questions</li>
          <li>Continue creating content that aligns with our guidelines</li>
        </ul>

        <p style="font-size: 14px; color: #6B7280; margin-top: 30px;">
          We're committed to maintaining a safe, positive environment for all creators. Thank you for understanding.
        </p>
      </div>

      <div class="footer">
        <p><strong>SoundBridge</strong></p>
        <p>Share Your Sound, Connect Your World</p>
        <p><a href="https://soundbridge.live">soundbridge.live</a> | <a href="https://soundbridge.live/support">Support</a></p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 15px;">&copy; ${year} SoundBridge. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}
