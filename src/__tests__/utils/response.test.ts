import { describe, it, expect, vi } from "vitest"
import { success, fail } from "../../utils/response.js"

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any
}

describe("response helpers", () => {
  it("success() returns { success: true, message, data } with 200 by default", () => {
    const res = mockRes()
    success(res, "OK", { id: "1" })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "OK",
      data: { id: "1" },
    })
  })

  it("success() accepts custom status code", () => {
    const res = mockRes()
    success(res, "Created", { id: "1" }, 201)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: "Created",
      data: { id: "1" },
    })
  })

  it("fail() returns { success: false, message, errors } with 422 by default", () => {
    const res = mockRes()
    fail(res, "Validation failed", { name: ["Required"] })

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors: { name: ["Required"] },
    })
  })

  it("fail() accepts custom status code", () => {
    const res = mockRes()
    fail(res, "Not found", undefined, 404)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Not found",
      errors: undefined,
    })
  })
})
