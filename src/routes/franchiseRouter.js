const express = require('express');
const { DB, Role } = require('../database/database.js');
const { authRouter } = require('./authRouter.js');
const { StatusCodeError, asyncHandler } = require('../endpointHelper.js');

const franchiseRouter = express.Router();

const metrics = require('../metrics.js');
const logger = require('../logger.js');

franchiseRouter.endpoints = [
  {
    method: 'GET',
    path: '/api/franchise',
    description: 'List all the franchises',
    example: `curl localhost:3000/api/franchise`,
    response: [{ id: 1, name: 'pizzaPocket', admins: [{ id: 4, name: 'pizza franchisee', email: 'f@jwt.com' }], stores: [{ id: 1, name: 'SLC', totalRevenue: 0 }] }],
  },
  {
    method: 'GET',
    path: '/api/franchise/:userId',
    requiresAuth: true,
    description: `List a user's franchises`,
    example: `curl localhost:3000/api/franchise/4  -H 'Authorization: Bearer tttttt'`,
    response: [{ id: 2, name: 'pizzaPocket', admins: [{ id: 4, name: 'pizza franchisee', email: 'f@jwt.com' }], stores: [{ id: 4, name: 'SLC', totalRevenue: 0 }] }],
  },
  {
    method: 'POST',
    path: '/api/franchise',
    requiresAuth: true,
    description: 'Create a new franchise',
    example: `curl -X POST localhost:3000/api/franchise -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt' -d '{"name": "pizzaPocket", "admins": [{"email": "f@jwt.com"}]}'`,
    response: { name: 'pizzaPocket', admins: [{ email: 'f@jwt.com', id: 4, name: 'pizza franchisee' }], id: 1 },
  },
  {
    method: 'DELETE',
    path: '/api/franchise/:franchiseId',
    requiresAuth: true,
    description: `Delete a franchises`,
    example: `curl -X DELETE localhost:3000/api/franchise/1 -H 'Authorization: Bearer tttttt'`,
    response: { message: 'franchise deleted' },
  },
  {
    method: 'POST',
    path: '/api/franchise/:franchiseId/store',
    requiresAuth: true,
    description: 'Create a new franchise store',
    example: `curl -X POST localhost:3000/api/franchise/1/store -H 'Content-Type: application/json' -d '{"franchiseId": 1, "name":"SLC"}' -H 'Authorization: Bearer tttttt'`,
    response: { id: 1, name: 'SLC', totalRevenue: 0 },
  },
  {
    method: 'DELETE',
    path: '/api/franchise/:franchiseId/store/:storeId',
    requiresAuth: true,
    description: `Delete a store`,
    example: `curl -X DELETE localhost:3000/api/franchise/1/store/1  -H 'Authorization: Bearer tttttt'`,
    response: { message: 'store deleted' },
  },
];

// getFranchises
franchiseRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    metrics.incrementGetRequests();
    const start = Date.now();
    const franchises = await DB.getFranchises(req.user);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    
    res.json(franchises);
    logger.httpLogger(req, res, franchises);
  })
);

// getUserFranchises
franchiseRouter.get(
  '/:userId',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementGetRequests();
    const start = Date.now();
    let result = [];
    const userId = Number(req.params.userId);
    if (req.user.id === userId || req.user.isRole(Role.Admin)) {
      result = await DB.getUserFranchises(userId);
    }
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    
    res.json(result);
    logger.httpLogger(req, res, result);
  })
);

// createFranchise
franchiseRouter.post(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementPostRequests();
    const start = Date.now();
    if (!req.user.isRole(Role.Admin)) {
      const resBody = { message: 'unauthorized' };
      res.status(403);
      logger.httpLogger(req, res, resBody);
      throw new StatusCodeError(resBody.message, 403);
    }

    const franchise = req.body;
    const result = await DB.createFranchise(franchise);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    
    res.send(result);
    logger.httpLogger(req, res, result);
  })
);

// deleteFranchise
franchiseRouter.delete(
  '/:franchiseId',
  asyncHandler(async (req, res) => {
    metrics.incrementDeleteRequests();
    const start = Date.now();
    if (!req.user.isRole(Role.Admin)) {
      throw new StatusCodeError('unable to delete a franchise', 403);
    }

    const franchiseId = Number(req.params.franchiseId);
    await DB.deleteFranchise(franchiseId);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    const resBody = { message: 'franchise deleted' };
    
    res.json(resBody);
    logger.httpLogger(req, res, resBody);
  })
);

// createStore
franchiseRouter.post(
  '/:franchiseId/store',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementPostRequests();
    const start = Date.now();
    const franchiseId = Number(req.params.franchiseId);
    const franchise = await DB.getFranchise({ id: franchiseId });
    if (!franchise || (!req.user.isRole(Role.Admin) && !franchise.admins.some((admin) => admin.id === req.user.id))) {
      const resBody = { message: 'unauthorized' };4
      res.status(403);
      logger.httpLogger(req, res, resBody);
      throw new StatusCodeError(resBody.message, 403);
    }
    const result = await DB.createStore(franchiseId, req.body);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    
    res.send(result);
    logger.httpLogger(req, res, result);
  })
);

// deleteStore
franchiseRouter.delete(
  '/:franchiseId/store/:storeId',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    metrics.incrementDeleteRequests();
    const start = Date.now();
    const franchiseId = Number(req.params.franchiseId);
    const franchise = await DB.getFranchise({ id: franchiseId });
    if (!franchise || (!req.user.isRole(Role.Admin) && !franchise.admins.some((admin) => admin.id === req.user.id))) {
      const resBody = { message: 'unable to delete a store' };
      res.status(403);
      logger.httpLogger(req, res, resBody);
      throw new StatusCodeError(resBody.message, 403);
    }

    const storeId = Number(req.params.storeId);
    await DB.deleteStore(franchiseId, storeId);
    const end = Date.now();
    metrics.addEndpointLatency(end - start);
    const resBody = { message: 'store deleted' };
    
    res.json(resBody);
    logger.httpLogger(req, res, resBody);
  })
);

module.exports = franchiseRouter;
