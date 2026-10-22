-- Enlace privado del calendario en vivo (/api/calendar/<token>.ics). NULL = desactivado.
ALTER TABLE "teacher" ADD COLUMN "calendarToken" TEXT;
CREATE UNIQUE INDEX "teacher_calendarToken_idx" ON "teacher" ("calendarToken");
