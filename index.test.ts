import request from "supertest";
import app from "./src/app";

describe("GET API", () => {
    it("GET /api/check", async () => {
        const response = await request(app).get("/api/check");
        expect(response.body.status.toString()).toMatch(/200||400/);
        expect(response.body.message.toString()).toMatch(/"OK"||"Bad Request"/);
    });
});
