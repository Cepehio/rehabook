-- Priminimai prieš vizitą: kada pacientui išsiųstas priminimo laiškas.
-- NULL reiškia, kad priminimas dar nesiųstas; planuoklis siunčia tik tokiems vizitams.
ALTER TABLE "Visit" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
