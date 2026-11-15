-- Paslaugos aktyvumas: neaktyvi paslauga nerodoma viešame kataloge ir nepriimama naujoms
-- rezervacijoms, tačiau istoriniai vizitai su ja išlieka (vizitas saugo savo kainą ir trukmę).
ALTER TABLE "Service" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
