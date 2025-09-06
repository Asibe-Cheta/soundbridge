import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing SendGrid template configuration...');
    
    // Check environment variables
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    const signupTemplateId = process.env.SENDGRID_SIGNUP_TEMPLATE_ID;
    const resetTemplateId = process.env.SENDGRID_RESET_TEMPLATE_ID;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'contact@soundbridge.live';
    
    console.log('Environment check:', {
      hasSendGridApiKey: !!sendGridApiKey,
      signupTemplateId,
      resetTemplateId,
      fromEmail
    });
    
    if (!sendGridApiKey) {
      return NextResponse.json({ 
        error: 'SENDGRID_API_KEY not found'
      }, { status: 500 });
    }
    
    // Test both templates
    const templateTests = [];
    
    if (signupTemplateId) {
      try {
        const response = await fetch(`https://api.sendgrid.com/v3/templates/${signupTemplateId}`, {
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const template = await response.json();
          templateTests.push({
            id: signupTemplateId,
            name: template.name,
            status: 'exists',
            activeVersion: template.versions?.find((v: any) => v.active)?.name || 'No active version'
          });
        } else {
          templateTests.push({
            id: signupTemplateId,
            status: 'not_found',
            error: await response.text()
          });
        }
      } catch (error) {
        templateTests.push({
          id: signupTemplateId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    if (resetTemplateId) {
      try {
        const response = await fetch(`https://api.sendgrid.com/v3/templates/${resetTemplateId}`, {
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const template = await response.json();
          templateTests.push({
            id: resetTemplateId,
            name: template.name,
            status: 'exists',
            activeVersion: template.versions?.find((v: any) => v.active)?.name || 'No active version'
          });
        } else {
          templateTests.push({
            id: resetTemplateId,
            status: 'not_found',
            error: await response.text()
          });
        }
      } catch (error) {
        templateTests.push({
          id: resetTemplateId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Test actual email send with the signup template
    let emailTestResult = null;
    if (signupTemplateId) {
      try {
        const testEmailData = {
          from: { 
            email: fromEmail, 
            name: 'SoundBridge Team' 
          },
          personalizations: [{
            to: [{ email: 'test@example.com' }],
            dynamic_template_data: {
              user_name: 'Test User',
              confirmation_url: 'https://www.soundbridge.live/auth/callback?next=/',
              email: 'test@example.com'
            }
          }],
          template_id: signupTemplateId
        };
        
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testEmailData)
        });
        
        emailTestResult = {
          success: response.ok,
          status: response.status,
          response: response.ok ? 'Email send successful' : await response.text()
        };
      } catch (error) {
        emailTestResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      environment: {
        signupTemplateId,
        resetTemplateId,
        fromEmail
      },
      templateTests,
      emailTest: emailTestResult
    });
    
  } catch (error) {
    console.error('Template test error:', error);
    return NextResponse.json({
      error: 'Template test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
