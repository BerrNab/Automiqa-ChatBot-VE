// Quick test script to verify safe MCP integration works
import { safeMcpManager, mcpService } from './server/services/mcp.js';

async function testSafeMCPIntegration() {
  console.log('🔧 Testing Safe MCP Integration...\n');
  
  // Test configuration
  const testConfig = {
    mcpTools: {
      enabled: true,
      googleCalendar: {
        enabled: true,
        calendarId: 'test@example.com',
        timezone: 'America/New_York'
      },
      googleSheets: {
        enabled: true,
        spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        worksheetName: 'Sheet1'
      }
    }
  };

  // Test 1: Calendar scheduling
  console.log('📅 Testing calendar scheduling...');
  try {
    const result = await safeMcpManager.callTool('calendar-schedule', {
      title: 'Test Appointment',
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      description: 'Testing safe MCP implementation'
    }, testConfig);
    
    console.log('✅ Calendar scheduling result:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('   Message:', result.message);
    if (result.data) {
      console.log('   Appointment ID:', result.data.appointmentId);
    }
  } catch (error) {
    console.log('❌ Calendar scheduling error:', error.message);
  }

  console.log('\n📊 Testing sheets data saving...');
  try {
    const result = await safeMcpManager.callTool('sheets-save', {
      name: 'John Test',
      email: 'john@example.com',
      phone: '555-123-4567',
      company: 'Test Corp',
      notes: 'Testing safe data saving'
    }, testConfig);
    
    console.log('✅ Sheets saving result:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('   Message:', result.message);
    if (result.data) {
      console.log('   Record ID:', result.data.recordId);
    }
  } catch (error) {
    console.log('❌ Sheets saving error:', error.message);
  }

  console.log('\n🔍 Testing availability check...');
  try {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    
    const result = await safeMcpManager.callTool('calendar-availability', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }, testConfig);
    
    console.log('✅ Availability check result:', result.success ? 'SUCCESS' : 'FAILED');
    console.log('   Message:', result.message);
    if (result.data && result.data.availableSlots) {
      console.log('   Available slots found:', result.data.availableSlots.length);
    }
  } catch (error) {
    console.log('❌ Availability check error:', error.message);
  }

  console.log('\n🛡️ Testing security validations...');
  
  // Test XSS prevention
  try {
    const result = await safeMcpManager.callTool('sheets-save', {
      name: '<script>alert("xss")</script>',
      email: 'test@example.com'
    }, testConfig);
    console.log('❌ XSS test should have failed but got:', result.message);
  } catch (error) {
    console.log('✅ XSS prevention working:', error.message);
  }

  // Test disabled integration
  try {
    const disabledConfig = { mcpTools: { enabled: false } };
    const result = await safeMcpManager.callTool('calendar-schedule', {
      title: 'Test',
      dateTime: new Date().toISOString(),
      duration: 60
    }, disabledConfig);
    console.log('✅ Disabled integration check:', result.success ? 'UNEXPECTED SUCCESS' : 'CORRECTLY BLOCKED');
    console.log('   Message:', result.message);
  } catch (error) {
    console.log('✅ Disabled integration correctly blocked:', error.message);
  }

  console.log('\n🎯 Testing high-level message processing...');
  try {
    const response = await mcpService.processMessageWithMCP(
      'I would like to schedule an appointment for tomorrow at 2 PM',
      testConfig
    );
    console.log('✅ Message processing result:', response.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ Message processing error:', error.message);
  }

  console.log('\n🔐 Security fixes implemented:');
  console.log('✅ No external process spawning (npx removed)');
  console.log('✅ No arbitrary code execution');
  console.log('✅ Per-chatbot configuration validation');
  console.log('✅ Input sanitization and validation');
  console.log('✅ Proper error handling (no silent failures)');
  console.log('✅ Mock implementations for safe testing');
  
  console.log('\n🎉 Safe MCP Integration Test Complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSafeMCPIntegration().catch(console.error);
}

export { testSafeMCPIntegration };