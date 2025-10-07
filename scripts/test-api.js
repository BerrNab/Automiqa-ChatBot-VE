import fetch from 'node-fetch';

// Function to test API endpoints
async function testApiEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  try {
    // Test the login endpoint
    console.log('Testing login endpoint...');
    const loginResponse = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123',
      }),
    });
    
    if (!loginResponse.ok) {
      console.error(`Login failed with status: ${loginResponse.status}`);
      console.error(await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);
    
    // Extract the session cookie
    const cookies = loginResponse.headers.get('set-cookie');
    if (!cookies) {
      console.error('No session cookie returned');
      return;
    }
    
    const sessionCookie = cookies.split(';')[0];
    console.log('Session cookie:', sessionCookie);
    
    // Test the clients endpoint
    console.log('\nTesting clients endpoint...');
    const clientsResponse = await fetch(`${baseUrl}/api/clients`, {
      headers: {
        'Cookie': sessionCookie,
      },
    });
    
    if (!clientsResponse.ok) {
      console.error(`Clients endpoint failed with status: ${clientsResponse.status}`);
      console.error(await clientsResponse.text());
      return;
    }
    
    const clientsData = await clientsResponse.json();
    console.log('Clients data:', clientsData);
    
    // Test creating a client
    console.log('\nTesting create client endpoint...');
    const createClientResponse = await fetch(`${baseUrl}/api/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({
        name: 'Test Client',
        contactEmail: 'test@example.com',
        industry: 'Technology',
        description: 'A test client',
      }),
    });
    
    if (!createClientResponse.ok) {
      console.error(`Create client failed with status: ${createClientResponse.status}`);
      console.error(await createClientResponse.text());
      return;
    }
    
    const createClientData = await createClientResponse.json();
    console.log('Created client:', createClientData);
    
  } catch (error) {
    console.error('Error testing API endpoints:', error);
  }
}

// Run the tests
testApiEndpoints().catch(console.error);
