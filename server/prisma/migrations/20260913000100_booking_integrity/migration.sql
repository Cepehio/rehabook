-- Esami įrašai išsaugomi. Migracijai nepavykus konfliktuojančius duomenis reikia peržiūrėti.
ALTER TABLE "Patient" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resetTokenHash" TEXT, ADD COLUMN "resetExpiresAt" TIMESTAMP(3);
ALTER TABLE "Specialist" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resetTokenHash" TEXT, ADD COLUMN "resetExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Patient_resetTokenHash_key" ON "Patient"("resetTokenHash");
CREATE UNIQUE INDEX "Specialist_resetTokenHash_key" ON "Specialist"("resetTokenHash");

ALTER TABLE "Visit" ADD COLUMN "duration" INTEGER NOT NULL DEFAULT 60;
UPDATE "Visit" AS v SET "duration" = s."duration" FROM "Service" AS s WHERE s.id = v."serviceId";
DROP INDEX "Visit_specialistId_date_time_key";
UPDATE "Visit" SET "time" = LPAD("time", 5, '0') WHERE "time" ~ '^[0-9]:[0-9]{2}$';
CREATE UNIQUE INDEX "Visit_active_slot_key" ON "Visit"("specialistId", "date", "time")
  WHERE "status" <> 'atšauktas';
CREATE INDEX "Visit_specialistId_date_idx" ON "Visit"("specialistId", "date");
CREATE INDEX "Visit_patientId_date_idx" ON "Visit"("patientId", "date");
CREATE INDEX "Visit_status_date_idx" ON "Visit"("status", "date");
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_status_check"
  CHECK ("status" IN ('laukiamas', 'patvirtintas', 'įvykęs', 'atšauktas'));
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_duration_check" CHECK ("duration" > 0 AND "duration" <= 720);
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_price_check" CHECK ("price" >= 0);
