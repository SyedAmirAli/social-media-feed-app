-- AlterTable: add password with a temporary default for existing rows, then drop default
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL DEFAULT '$2b$10$XoTOPbsCuz31TkUHrHX4DO6Sjz0AcwRWBlut9QqdWV10Vy6vI4vlC';
ALTER TABLE "User" ALTER COLUMN "password" DROP DEFAULT;
