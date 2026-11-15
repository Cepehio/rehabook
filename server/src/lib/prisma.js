/**
 * Vienas bendras PrismaClient egzempliorius visai aplikacijai.
 * Importuojamas tiek maršrutuose/kontroleriuose, tiek seed skripte.
 */
import './env.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };
export default prisma;
