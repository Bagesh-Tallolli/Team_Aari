/**
 * Debug script to test login directly
 */
import axios from 'axios';

const API_URL = 'http://localhost:5001';

async function testLogin() {
  try {
    console.log('Testing login with admin@nutrition.com / password123...\n');
    
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'admin@nutrition.com',
      password: 'password123'
    }, {
      timeout: 5000
    });

    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data?.token) {
      console.log('\n✅ Token received:', response.data.data.token.substring(0, 20) + '...');
    }
  } catch (error) {
    console.log('❌ Login failed');
    console.log('Error Status:', error.response?.status);
    console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Error Message:', error.message);
  }
}

testLogin();
