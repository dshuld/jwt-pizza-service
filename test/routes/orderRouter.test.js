if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
const request = require("supertest");
const app = require("../../src/service");

const testUser = {
  name: "test admin order",
  email: "adminorder@test.com",
  password: "a",
  roles: [{ role: "admin" }],
};
let testUserAuthToken;
let testUserId;

const testFranchise = {
  name: "testFranchiseOrder",
  admins: [{ email: "adminorder@test.com" }],
};
let testFranchiseId;
const testStore = {
  franchiseId: 1,
  name: "test store order",
};
let testStoreId;

const testMenuItem = {
  title: "test pizza",
  description: "test pizza description",
  price: 10.0,
  image: "test.jpg",
  menuId: 1,
};

const testOrder = {
  userId: 1,
  storeId: 1,
  franchiseId: 1,
  items: [testMenuItem],
};
let testOrderId;

beforeAll(async () => {
  const login = await request(app).put("/api/auth").send(testUser);
  if (login.status == 404) {
    const registerAdminRes = await request(app)
      .post("/api/auth")
      .send(testUser);
    testUserAuthToken = registerAdminRes.body.token;
    testUserId = registerAdminRes.body.user.id;
  } else {
    testUserAuthToken = login.body.token;
    testUserId = login.body.user.id;
  }

  const createTestFranchiseRes = await request(app)
    .post("/api/franchise")
    .send(testFranchise)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  testFranchiseId = createTestFranchiseRes.body.id;
  testFranchise.admins[0].id = testUserId;
  testFranchise.admins[0].name = testUser.name;
  testStore.franchiseId = testFranchiseId;

  const createStoreRes = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .send(testStore)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  testStoreId = createStoreRes.body.id;

  const createMenuItemRes = await request(app)
    .put(`/api/order/menu`)
    .send(testMenuItem)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  testMenuItem.menuId = createMenuItemRes.body[createMenuItemRes.body.length-1].id;

  testOrder.storeId = testStoreId;
  testOrder.userId = testUserId;
  testOrder.franchiseId = testFranchiseId;

  const createOrderRes = await request(app)
    .post(`/api/order`)
    .send(testOrder)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  testOrderId = createOrderRes.body.order.id;
});

afterAll(async () => {
  await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStoreId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
});

test("get orders", async () => {
  const res = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.status).toBe(200);
  expect(res.body.dinerId).toBe(testUserId);
  expect(res.body.orders).toContainEqual({
    date: expect.any(String),
    franchiseId: testFranchiseId,
    id: testOrderId,
    items: expect.arrayContaining([{description: testMenuItem.description, id: testOrderId, menuId: testMenuItem.menuId, price: testMenuItem.price}]),
    storeId: testStoreId,
  });
});
