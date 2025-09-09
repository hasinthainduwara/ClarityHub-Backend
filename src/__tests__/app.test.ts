import request from 'supertest';
import app from '../index';

describe('Health Check', () => {
  it('should return 200 OK for health endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
      
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message', 'ClarityHub Backend is running');
    expect(response.body).toHaveProperty('timestamp');
  });
  
  it('should return 404 for non-existent route', async () => {
    const response = await request(app)
      .get('/non-existent-route')
      .expect(404);
      
    expect(response.body).toHaveProperty('error', 'Route not found');
  });
});