const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config.js');
const { asyncHandler, StatusCodeError } = require('../endpointHelper.js');
const { DB, Role } = require('../database/database.js');

const authRouter = express.Router();

const metrics = require('../metrics.js');
const logger = require('../logger.js');

authRouter.endpoints = [
  {
    method: 'POST',
    path: '/api/auth',
    description: 'Register a new user',
    example: `curl -X POST localhost:3000/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'`,
    response: { user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'tttttt' },
  },
  {
    method: 'PUT',
    path: '/api/auth',
    description: 'Login existing user',
    example: `curl -X PUT localhost:3000/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json'`,
    response: { user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'tttttt' },
  },
  {
    method: 'PUT',
    path: '/api/auth/:userId',
    requiresAuth: true,
    description: 'Update user',
    example: `curl -X PUT localhost:3000/api/auth/1 -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
    response: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
  },
  {
    method: 'DELETE',
    path: '/api/auth',
    requiresAuth: true,
    description: 'Logout a user',
    example: `curl -X DELETE localhost:3000/api/auth -H 'Authorization: Bearer tttttt'`,
    response: { message: 'logout successful' },
  },
];

async function setAuthUser(req, res, next) {
  const token = readAuthToken(req);
  if (token) {
    try {
      if (await DB.isLoggedIn(token)) {
        // Check the database to make sure the token is valid.
        req.user = jwt.verify(token, config.jwtSecret);
        req.user.isRole = (role) => !!req.user.roles.find((r) => r.role === role);
      }
    } catch {
      req.user = null;
    }
  }
  next();
}

// Authenticate token
authRouter.authenticateToken = (req, res, next) => {
  if (!req.user) {
    const resBody = { message: 'unauthorized' };
    const result = res.status(401).send(resBody);
    logger.httpLogger(req, res, resBody);
    return result;
  }
  next();
};

// register
authRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    metrics.incrementPostRequests();
    const start = Date.now();
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      const end = Date.now();
      metrics.addEndpointLatency(end - start);
      const resBody = { message: 'name, email, and password are required' };
      const result = res.status(400).json(resBody);
      logger.httpLogger(req, res, resBody);
      return result;
    }
    let user = await DB.addUser({ name, email, password, roles: [{ role: Role.Diner }] });
    const auth = await setAuth(user);
    metrics.incrementActiveUsers();
    metrics.incrementSuccessAuthAttempts();
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    const resBody = { user: user, token: auth };
    
    res.json(resBody);
    logger.httpLogger(req, res, resBody);
  })
);

// login
authRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    metrics.incrementPutRequests();
    const start = Date.now();
    const { email, password } = req.body;
    try {
      const user = await DB.getUser(email, password);
      const auth = await setAuth(user);
      metrics.incrementActiveUsers();
      metrics.incrementSuccessAuthAttempts();
      const end = Date.now();
      metrics.addEndpointLatency(end - start);
      const resBody = { user: user, token: auth };
      
      res.json(resBody);
      logger.httpLogger(req, res, resBody);
    } catch(err) {
      metrics.incrementFailedAuthAttempts();
      const end = Date.now();
      metrics.addEndpointLatency(end - start);
      const resBody = { message: err.message };
      res.status(err.statusCode);
      logger.httpLogger(req, res, resBody);
      throw new StatusCodeError(err.message, err.statusCode);
    }
  })
);

// logout
authRouter.delete(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementDeleteRequests();
    metrics.decrementActiveUsers();
    const start = Date.now();
    await clearAuth(req);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    const resBody = { message: 'logout successful' };
    
    res.json(resBody);
    logger.httpLogger(req, res, resBody);
  })
);

// updateUser
authRouter.put(
  '/:userId',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementPutRequests();
    const start = Date.now();
    const { email, password } = req.body;
    const userId = Number(req.params.userId);
    const user = req.user;
    if (user.id !== userId && !user.isRole(Role.Admin)) {
      const end = Date.now();
      metrics.addEndpointLatency(end - start);
      const resBody = { message: 'unauthorized' };
      const result = res.status(403).json(resBody);
      logger.httpLogger(req, res, resBody);
      return result
    }

    const updatedUser = await DB.updateUser(userId, email, password);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    
    res.json(updatedUser);
    logger.httpLogger(req, res, updatedUser);
  })
);

async function setAuth(user) {
  const token = jwt.sign(user, config.jwtSecret);
  await DB.loginUser(user.id, token);
  return token;
}

async function clearAuth(req) {
  const token = readAuthToken(req);
  if (token) {
    await DB.logoutUser(token);
  }
}

function readAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authHeader.split(' ')[1];
  }
  return null;
}

module.exports = { authRouter, setAuthUser };
