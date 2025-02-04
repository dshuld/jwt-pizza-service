const request = require('supertest');
const app = require('../../src/service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
//let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  /*const registerRes = */await request(app).post('/api/auth').send(testUser);
  //testUserAuthToken = registerRes.body.token;
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  console.log(password);
  expect(loginRes.body.user).toMatchObject(user);
});

test('failed login', async () => {
  const loginRes = await request(app).put('/api/auth').send({ email: testUser.email, password: 'wrong' });
  expect(loginRes.status).toBe(404);
  expect(loginRes.body.message).toBe('unknown user');
});

test('register', async () => {
  const newUser = { name: 'new diner', email: 'new@test.com', password: 'a' };
  const registerRes = await request(app).post('/api/auth').send(newUser);
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
});

test('failed register', async () => {
  const newUser = { name: 'new diner', email: 'new@test.com' };
  const registerRes = await request(app).post('/api/auth').send(newUser);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('logout', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${loginRes.body.token}`);
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('failed logout', async () => {
  const logoutRes = await request(app).delete('/api/auth');
  expect(logoutRes.status).toBe(401);
  expect(logoutRes.body.message).toBe('unauthorized');
});

// test('update user', async () => {
//   const registerAdminRes = await request(app).post('/api/auth').send({ name: 'admin', email: 'admin@test.com', password: 'a', roles: [{ role: 'admin' }] });
//   const updateUserRes = await request(app).put(`/api/auth/${testUser.id}`).set('Authorization', `Bearer ${registerAdminRes.body.token}`).send({ email: 'new@test.com', password: 'a' });
//   expect(updateUserRes.status).toBe(200);
//   expect(updateUserRes.body.email).toBe('new@test.com');
//   await request(app).put(`/api/auth/${testUser.id}`).send({ email: 'reg@test.com', password: 'a' }).set('Authorization', `Bearer ${registerAdminRes.body.token}`);
// });