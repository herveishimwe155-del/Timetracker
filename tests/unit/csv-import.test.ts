import { describe, expect, it } from "vitest";
import { parseCsv, readImport } from "@/lib/csv-import";

describe("parseCsv", () => {
  it("handles quotes, commas, newlines, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a\n\n\nb\n")).toEqual([["a"], ["b"]]);
  });
});

describe("readImport", () => {
  const tz = "Africa/Kigali"; // UTC+2, no DST

  it("reads Tickr's own export, including an entry past midnight", () => {
    const csv = [
      "Date,Start,End,Duration,Duration (hours),Description,Project,Client,Tags,Billable",
      "2026-10-01,09:00,10:30,01:30:00,1.50,Writing,Thesis,Uni,\"focus, deep\",Yes",
      "2026-10-01,23:30,00:15,00:45:00,0.75,'=SUM,,,,No",
    ].join("\r\n");
    const { rows, problems } = readImport(csv, tz);
    expect(problems).toEqual([]);
    expect(rows[0]).toMatchObject({ description: "Writing", project: "Thesis", client: "Uni", tags: ["focus", "deep"], billable: true });
    expect(rows[0].startAt.toISOString()).toBe("2026-10-01T07:00:00.000Z");
    expect(rows[0].stopAt.toISOString()).toBe("2026-10-01T08:30:00.000Z");
    expect(rows[1].description).toBe("=SUM");
    expect(rows[1].stopAt.toISOString()).toBe("2026-10-01T22:15:00.000Z");
    expect(rows[1].project).toBeNull();
  });

  it("reads Toggl's detailed export with seconds and end dates", () => {
    const csv = [
      "User,Email,Client,Project,Task,Description,Billable,Start date,Start time,End date,End time,Duration,Tags",
      "Me,me@x.com,,Anki,,Review,No,2026-10-19,12:54:10,2026-10-19,21:44:36,08:50:26,",
    ].join("\n");
    const { rows } = readImport(csv, tz);
    expect(rows[0]).toMatchObject({ project: "Anki", client: null, description: "Review", billable: false, tags: [] });
    expect(rows[0].startAt.toISOString()).toBe("2026-10-19T10:54:10.000Z");
    expect(rows[0].stopAt.toISOString()).toBe("2026-10-19T19:44:36.000Z");
  });

  it("reports rows it can't read and files without the needed columns", () => {
    expect(readImport("Name,Hours\nx,1", tz).problems[0].message).toMatch(/date, start and end/);
    const { rows, problems } = readImport("Date,Start,End\n2026/10/01,09:00,10:00\n2026-10-01,10:00,10:00", tz);
    expect(rows).toEqual([]);
    expect(problems.map((p) => p.line)).toEqual([2, 3]);
    expect(problems[1].message).toMatch(/no duration/);
  });
});
