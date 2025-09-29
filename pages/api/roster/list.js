// pages/api/roster/list.js
import prisma from '../../../lib/db';

export default async function handler(req, res) {
  const roster = await prisma.shift.findMany();
  res.status(200).json(roster);
}
