if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}
const request = require("supertest");
const app = require("../../src/service");

const testUser = {
  name: "test admin franchise",
  email: "adminfranchise@test.com",
  password: "a",
  roles: [{ role: "admin" }],
};
let testUserAuthToken;
let testUserId;

const testFranchise = {
  name: "testFranchise",
  admins: [{ email: "adminfranchise@test.com" }],
};

let testFranchiseId;
let testStore;

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

  const createStoreRes = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .send({ franchiseId: testFranchiseId, name: "TEST" })
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  testStore = createStoreRes.body;
});

afterAll(async () => {
  await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${testStore.id}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  await request(app)
    .delete(`/api/franchise/${testFranchiseId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
});

test("get franchises", async () => {
  const res = await request(app).get("/api/franchise");
  expect(res.status).toBe(200);
  expect(res.body).toContainEqual({
    id: testFranchiseId,
    name: testFranchise.name,
    stores: [
      {
        id: testStore.id,
        name: testStore.name,
      },
    ],
  });
});

test("get user franchises", async () => {
  const res = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([
    {
      admins: testFranchise.admins,
      id: testFranchiseId,
      name: testFranchise.name,
      stores: [
        {
          id: testStore.id,
          name: testStore.name,
          totalRevenue: 0,
        },
      ],
    },
  ]);
});

test("create/delete franchise", async () => {
  const newFranchise = {
    name: "new franchise",
    admins: [{ email: "adminfranchise@test.com" }],
  };
  const res = await request(app)
    .post("/api/franchise")
    .send(newFranchise)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.status).toBe(200);
  const getFranchisesRes = await request(app).get("/api/franchise");
  expect(getFranchisesRes.body).toContainEqual({
    id: res.body.id,
    name: newFranchise.name,
    stores: [],
  });
  await request(app)
    .delete(`/api/franchise/${res.body.id}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  const getFranchisesRes2 = await request(app).get("/api/franchise");
  expect(getFranchisesRes2.body).not.toContainEqual({
    id: res.body.id,
    name: newFranchise.name,
    stores: [],
  });
});

test("create/delete store", async () => {
  const res = await request(app)
    .post(`/api/franchise/${testFranchiseId}/store`)
    .send({ franchiseId: testFranchiseId, name: "new store" })
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(res.status).toBe(200);
  const getFranchisesRes = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getFranchisesRes.body[0].stores).toContainEqual({
    id: res.body.id,
    name: "new store",
    totalRevenue: 0,
  });
  await request(app)
    .delete(`/api/franchise/${testFranchiseId}/store/${res.body.id}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  const getFranchisesRes2 = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(getFranchisesRes2.body[0].stores).not.toContainEqual({
    id: res.body.id,
    name: "new store",
    totalRevenue: 0,
  });
});
