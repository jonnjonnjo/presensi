import { describe, it, expect, vi } from "vitest"
import { validateAttendance, validateAttendanceUpdate } from "../../middleware/validate.js"

function mockReq(body: any) {
  return { body } as any
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any
}

const next = vi.fn()

describe("validateAttendance (POST)", () => {
  it("passes valid PRESENT attendance", () => {
    const req = mockReq({
      employee_name: "John",
      attendance_date: "2026-07-31",
      check_in: "08:00:00",
      status: "PRESENT",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it("passes valid SICK attendance without check_in", () => {
    const req = mockReq({
      employee_name: "Jane",
      attendance_date: "2026-07-31",
      status: "SICK",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it("rejects missing employee_name", () => {
    const req = mockReq({
      attendance_date: "2026-07-31",
      status: "PRESENT",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errors: expect.objectContaining({
          employee_name: expect.any(Array),
        }),
      })
    )
  })

  it("rejects missing attendance_date", () => {
    const req = mockReq({
      employee_name: "John",
      status: "PRESENT",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({ attendance_date: expect.any(Array) }),
      })
    )
  })

  it("rejects PRESENT without check_in", () => {
    const req = mockReq({
      employee_name: "John",
      attendance_date: "2026-07-31",
      status: "PRESENT",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({ check_in: expect.any(Array) }),
      })
    )
  })

  it("rejects check_out earlier than check_in", () => {
    const req = mockReq({
      employee_name: "John",
      attendance_date: "2026-07-31",
      check_in: "17:00:00",
      check_out: "08:00:00",
      status: "PRESENT",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({ check_out: expect.any(Array) }),
      })
    )
  })

  it("rejects invalid status", () => {
    const req = mockReq({
      employee_name: "John",
      attendance_date: "2026-07-31",
      status: "INVALID",
    })
    const res = mockRes()

    validateAttendance(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: expect.objectContaining({ status: expect.any(Array) }),
      })
    )
  })
})

describe("validateAttendanceUpdate (PUT)", () => {
  it("passes with just status", () => {
    const req = mockReq({ status: "LEAVE" })
    const res = mockRes()

    validateAttendanceUpdate(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it("passes with just notes", () => {
    const req = mockReq({ notes: "Updated" })
    const res = mockRes()

    validateAttendanceUpdate(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it("rejects PRESENT without check_in on update", () => {
    const req = mockReq({ status: "PRESENT" })
    const res = mockRes()

    validateAttendanceUpdate(req, res, next)

    expect(res.status).toHaveBeenCalledWith(422)
  })
})
