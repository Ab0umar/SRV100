/**
 * Migrate data from examinations.glassesData and examinations.radiologyLabsNotes
 * into their dedicated tables: glassesRecords, autorefractometryData, pentacamResults.
 *
 * Safe to re-run: skips any exam that already has a row in the target table.
 * Does NOT overwrite existing dedicated-table rows.
 *
 * Run: npx tsx scripts/migrate-blob-data-to-tables.ts
 */

import {
  saveGlassesRecord,
  saveAutorefractometryData,
  getDb,
} from "../server/db";
import { examinations, glassesRecords, autorefractometryData, pentacamResults } from "../drizzle/schema";
import { eq } from "drizzle-orm";

function pick(...vals: (string | undefined | null)[]): string | undefined {
  for (const v of vals) {
    if (v && v.trim() !== "") return v.trim();
  }
  return undefined;
}

function hasRealValue(...vals: (string | undefined | null)[]): boolean {
  return vals.some(v => v && v.trim() !== "" && v.trim() !== "0" && v !== null);
}

async function run() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Load all examinations that have glassesData or radiologyLabsNotes
  const allExams = await db.select().from(examinations);

  let glassesInserted = 0;
  let glassesSkipped = 0;
  let autorefInserted = 0;
  let autorefSkipped = 0;
  let pentacamInserted = 0;
  let pentacamSkipped = 0;
  let errors = 0;

  for (const exam of allExams) {
    // ── 1. glassesData → glassesRecords ───────────────────────────────────
    if (exam.glassesData) {
      try {
        const gd = typeof exam.glassesData === "string"
          ? JSON.parse(exam.glassesData)
          : exam.glassesData;

        const hasData =
          hasRealValue(gd?.od?.s, gd?.od?.c, gd?.od?.axis, gd?.od?.pd) ||
          hasRealValue(gd?.os?.s, gd?.os?.c, gd?.os?.axis, gd?.os?.pd);

        if (hasData) {
          // Check if already exists
          const existing = await db.select({ id: glassesRecords.id })
            .from(glassesRecords)
            .where(eq(glassesRecords.examinationId, exam.id))
            .limit(1);

          if (existing.length > 0) {
            glassesSkipped++;
          } else {
            await saveGlassesRecord({
              examinationId: exam.id,
              patientId: exam.patientId,
              sOD: gd.od?.s || undefined,
              cOD: gd.od?.c || undefined,
              axisOD: gd.od?.axis || undefined,
              pdOD: gd.od?.pd || undefined,
              addOD: gd.od?.add || undefined,
              bcvaOD: gd.od?.bcva || undefined,
              sOS: gd.os?.s || undefined,
              cOS: gd.os?.c || undefined,
              axisOS: gd.os?.axis || undefined,
              pdOS: gd.os?.pd || undefined,
              addOS: gd.os?.add || undefined,
              bcvaOS: gd.os?.bcva || undefined,
            });
            glassesInserted++;
            console.log(`[glasses] inserted for exam ${exam.id} (patient ${exam.patientId})`);
          }
        }
      } catch (e) {
        errors++;
        console.error(`[glasses] error exam ${exam.id}:`, e);
      }
    }

    // ── 2. radiologyLabsNotes → autorefractometryData + pentacamResults ───
    if (!exam.radiologyLabsNotes) continue;

    let blob: any;
    try {
      blob = typeof exam.radiologyLabsNotes === "string"
        ? JSON.parse(exam.radiologyLabsNotes)
        : exam.radiologyLabsNotes;
    } catch {
      continue; // not valid JSON, skip
    }

    // ── 2a. autorefraction ── (newer format uses $.autorefraction.od/os)
    const autoOd = blob?.autorefraction?.od;
    const autoOs = blob?.autorefraction?.os;
    if (autoOd || autoOs) {
      try {
        const hasAutoData =
          hasRealValue(autoOd?.s, autoOd?.s1, autoOd?.ucva, autoOd?.bcva) ||
          hasRealValue(autoOs?.s, autoOs?.s1, autoOs?.ucva, autoOs?.bcva);

        if (hasAutoData) {
          const existingAr = await db.select({ id: autorefractometryData.id })
            .from(autorefractometryData)
            .where(eq(autorefractometryData.examinationId, exam.id))
            .limit(1);

          if (existingAr.length > 0) {
            autorefSkipped++;
          } else {
            await saveAutorefractometryData({
              examinationId: exam.id,
              patientId: exam.patientId,
              sphereOD: pick(autoOd?.s, autoOd?.s1),
              cylinderOD: pick(autoOd?.c, autoOd?.c1),
              axisOD: pick(autoOd?.axis, autoOd?.a1),
              ucvaOD: autoOd?.ucva || undefined,
              bcvaOD: autoOd?.bcva || undefined,
              iopOD: pick(autoOd?.iop, autoOd?.airPuff1, autoOd?.airPuff2, autoOd?.airPuff3),
              sphereOS: pick(autoOs?.s, autoOs?.s1),
              cylinderOS: pick(autoOs?.c, autoOs?.c1),
              axisOS: pick(autoOs?.axis, autoOs?.a1),
              ucvaOS: autoOs?.ucva || undefined,
              bcvaOS: autoOs?.bcva || undefined,
              iopOS: pick(autoOs?.iop, autoOs?.airPuff1, autoOs?.airPuff2, autoOs?.airPuff3),
            });
            autorefInserted++;
            console.log(`[autoref] inserted for exam ${exam.id} (patient ${exam.patientId})`);
          }
        }
      } catch (e) {
        errors++;
        console.error(`[autoref] error exam ${exam.id}:`, e);
      }
    }

    // Also handle old nurse-form blob format: $.autoref-od and $.autoref-os
    const oldAutoOd = blob?.["autoref-od"];
    const oldAutoOs = blob?.["autoref-os"];
    if ((oldAutoOd || oldAutoOs) && !autoOd && !autoOs) {
      try {
        const hasOldAutoData =
          hasRealValue(oldAutoOd?.s, oldAutoOd?.s1, oldAutoOd?.ucva) ||
          hasRealValue(oldAutoOs?.s, oldAutoOs?.s1, oldAutoOs?.ucva);

        if (hasOldAutoData) {
          const existingAr = await db.select({ id: autorefractometryData.id })
            .from(autorefractometryData)
            .where(eq(autorefractometryData.examinationId, exam.id))
            .limit(1);

          if (existingAr.length > 0) {
            autorefSkipped++;
          } else {
            await saveAutorefractometryData({
              examinationId: exam.id,
              patientId: exam.patientId,
              sphereOD: pick(oldAutoOd?.s, oldAutoOd?.s1),
              cylinderOD: pick(oldAutoOd?.c, oldAutoOd?.c1),
              axisOD: pick(oldAutoOd?.axis, oldAutoOd?.a1),
              ucvaOD: oldAutoOd?.ucva || undefined,
              bcvaOD: oldAutoOd?.bcva || undefined,
              iopOD: pick(oldAutoOd?.iop, oldAutoOd?.airPuff1),
              sphereOS: pick(oldAutoOs?.s, oldAutoOs?.s1),
              cylinderOS: pick(oldAutoOs?.c, oldAutoOs?.c1),
              axisOS: pick(oldAutoOs?.axis, oldAutoOs?.a1),
              ucvaOS: oldAutoOs?.ucva || undefined,
              bcvaOS: oldAutoOs?.bcva || undefined,
              iopOS: pick(oldAutoOs?.iop, oldAutoOs?.airPuff1),
            });
            autorefInserted++;
            console.log(`[autoref-old] inserted for exam ${exam.id} (patient ${exam.patientId})`);
          }
        }
      } catch (e) {
        errors++;
        console.error(`[autoref-old] error exam ${exam.id}:`, e);
      }
    }

    // ── 2b. pentacam ─────────────────────────────────────────────────────
    const pentaOd = blob?.pentacam?.od;
    const pentaOs = blob?.pentacam?.os;
    if (pentaOd || pentaOs) {
      try {
        const hasPentaData =
          hasRealValue(pentaOd?.k1, pentaOd?.k2, pentaOd?.thinnest, pentaOd?.pachy) ||
          hasRealValue(pentaOs?.k1, pentaOs?.k2, pentaOs?.thinnest, pentaOs?.pachy);

        if (hasPentaData && exam.visitId) {
          const existingPr = await db.select({ id: pentacamResults.id })
            .from(pentacamResults)
            .where(eq(pentacamResults.visitId, exam.visitId))
            .limit(1);

          if (existingPr.length > 0) {
            pentacamSkipped++;
          } else {
            await db.insert(pentacamResults).values({
              visitId: exam.visitId,
              patientId: exam.patientId,
              pachymetryOD: pentaOd?.pachy || undefined,
              pachymetryOS: pentaOs?.pachy || undefined,
              k1OD: pentaOd?.k1 || undefined,
              k2OD: pentaOd?.k2 || undefined,
              axisOD: pentaOd?.ax1 || pentaOd?.ax2 || undefined,
              thinnestPointOD: pentaOd?.thinnest || undefined,
              apexOD: pentaOd?.apex || undefined,
              residualOD: pentaOd?.residual || undefined,
              tttOD: pentaOd?.ttt || undefined,
              ablationOD: pentaOd?.ablation || undefined,
              k1OS: pentaOs?.k1 || undefined,
              k2OS: pentaOs?.k2 || undefined,
              axisOS: pentaOs?.ax1 || pentaOs?.ax2 || undefined,
              thinnestPointOS: pentaOs?.thinnest || undefined,
              apexOS: pentaOs?.apex || undefined,
              residualOS: pentaOs?.residual || undefined,
              tttOS: pentaOs?.ttt || undefined,
              ablationOS: pentaOs?.ablation || undefined,
            });
            pentacamInserted++;
            console.log(`[pentacam] inserted for exam ${exam.id} visit ${exam.visitId} (patient ${exam.patientId})`);
          }
        }
      } catch (e) {
        errors++;
        console.error(`[pentacam] error exam ${exam.id}:`, e);
      }
    }

    // Also check glasses inside blob
    const blobGlasses = blob?.glasses;
    if (blobGlasses) {
      try {
        const hasGlassData =
          hasRealValue(blobGlasses?.od?.s, blobGlasses?.od?.c) ||
          hasRealValue(blobGlasses?.os?.s, blobGlasses?.os?.c);

        if (hasGlassData) {
          const existing = await db.select({ id: glassesRecords.id })
            .from(glassesRecords)
            .where(eq(glassesRecords.examinationId, exam.id))
            .limit(1);

          if (existing.length > 0) {
            glassesSkipped++;
          } else {
            await saveGlassesRecord({
              examinationId: exam.id,
              patientId: exam.patientId,
              sOD: blobGlasses.od?.s || undefined,
              cOD: blobGlasses.od?.c || undefined,
              axisOD: blobGlasses.od?.axis || undefined,
              pdOD: blobGlasses.od?.pd || undefined,
              bcvaOD: blobGlasses.od?.bcva || undefined,
              sOS: blobGlasses.os?.s || undefined,
              cOS: blobGlasses.os?.c || undefined,
              axisOS: blobGlasses.os?.axis || undefined,
              pdOS: blobGlasses.os?.pd || undefined,
              bcvaOS: blobGlasses.os?.bcva || undefined,
            });
            glassesInserted++;
            console.log(`[glasses-blob] inserted for exam ${exam.id} (patient ${exam.patientId})`);
          }
        }
      } catch (e) {
        errors++;
        console.error(`[glasses-blob] error exam ${exam.id}:`, e);
      }
    }
  }

  console.log("\n=== Migration Summary ===");
  console.log(`glassesRecords  — inserted: ${glassesInserted}, skipped (already exist): ${glassesSkipped}`);
  console.log(`autorefractometry — inserted: ${autorefInserted}, skipped: ${autorefSkipped}`);
  console.log(`pentacamResults  — inserted: ${pentacamInserted}, skipped: ${pentacamSkipped}`);
  console.log(`Errors: ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
}

run().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});
